import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Step = "idle" | "scan" | "codes" | "disable";

const messageOf = (error: unknown) => (error instanceof Error ? error.message.replace(/^\d+:\s*/, "").replace(/^\{"message":"(.*)"\}$/, "$1") : undefined);

/** Two-step login with an authenticator app: switch on (secret + proof code + backup codes) and off (password + code). */
export function TwoFactorCard() {
  const { toast } = useToast();
  const { data } = useQuery<{ enabled: boolean; backupCodesLeft: number }>({ queryKey: ["/api/account/2fa"] });
  const [step, setStep] = useState<Step>("idle");
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/account/2fa"] });
  const fail = (title: string) => (error: unknown) => toast({ title, description: messageOf(error), variant: "destructive" });

  const start = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/account/2fa/setup")) as { secret: string; otpauthUrl: string },
    onSuccess: (result) => {
      setSetup(result);
      setCode("");
      setStep("scan");
    },
    onError: fail("Nie udało się rozpocząć konfiguracji"),
  });
  const enable = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/account/2fa/enable", { code })) as { backupCodes: string[] },
    onSuccess: async (result) => {
      setBackupCodes(result.backupCodes);
      setStep("codes");
      setSetup(null);
      await refresh();
    },
    onError: fail("Kod nie pasuje"),
  });
  const disable = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/account/2fa/disable", { password, code }),
    onSuccess: async () => {
      setStep("idle");
      setPassword("");
      setCode("");
      await refresh();
      toast({ title: "Logowanie dwuskładnikowe wyłączone" });
    },
    onError: fail("Nie udało się wyłączyć"),
  });

  if (!data) return null;

  return (
    <div className="rounded-lg border p-4 space-y-3" data-testid="card-two-factor">
      <p className="font-medium flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" />
        Logowanie dwuskładnikowe {data.enabled ? "(włączone)" : "(wyłączone)"}
      </p>

      {step === "idle" && !data.enabled && (
        <>
          <p className="text-sm text-muted-foreground">Oprócz hasła będziesz podawać kod z aplikacji (np. Google Authenticator, 1Password, Authy). Chroni konto, nawet gdy ktoś pozna hasło.</p>
          <Button variant="outline" className="w-full" onClick={() => start.mutate()} disabled={start.isPending} data-testid="button-2fa-start">Włącz</Button>
        </>
      )}

      {step === "scan" && setup && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            W aplikacji uwierzytelniającej wybierz „dodaj konto ręcznie” i wpisz ten klucz (albo otwórz <a className="underline" href={setup.otpauthUrl}>ten link</a> na telefonie):
          </p>
          <p className="font-mono text-sm break-all rounded bg-muted p-2" data-testid="text-2fa-secret">{setup.secret}</p>
          <p className="text-sm text-muted-foreground">Potem wpisz 6-cyfrowy kod z aplikacji, żeby potwierdzić, że działa.</p>
          <div className="flex gap-2">
            <Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123 456" aria-label="Kod z aplikacji" data-testid="input-2fa-code" />
            <Button onClick={() => enable.mutate()} disabled={enable.isPending || !code.trim()} data-testid="button-2fa-enable">Potwierdź</Button>
          </div>
        </div>
      )}

      {step === "codes" && (
        <div className="space-y-3" data-testid="section-2fa-backup">
          <p className="text-sm">Zapisz te kody zapasowe w bezpiecznym miejscu. Każdy działa jeden raz i pozwoli się zalogować, gdy zgubisz telefon. <strong>Nie pokażemy ich ponownie.</strong></p>
          <ul className="grid grid-cols-2 gap-1 font-mono text-sm rounded bg-muted p-3">
            {backupCodes.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(backupCodes.join("\n"))}>Skopiuj</Button>
            <Button onClick={() => { setStep("idle"); setBackupCodes([]); }} data-testid="button-2fa-done">Zapisałem(-am) kody</Button>
          </div>
        </div>
      )}

      {step === "idle" && data.enabled && (
        <>
          <p className="text-sm text-muted-foreground">Pozostało kodów zapasowych: {data.backupCodesLeft}.</p>
          <Button variant="outline" className="w-full" onClick={() => setStep("disable")} data-testid="button-2fa-disable-start">Wyłącz</Button>
        </>
      )}

      {step === "disable" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Podaj hasło i aktualny kod (albo kod zapasowy).</p>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Hasło" aria-label="Hasło" autoComplete="current-password" />
          <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Kod" aria-label="Kod z aplikacji lub zapasowy" autoComplete="one-time-code" />
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => disable.mutate()} disabled={disable.isPending || !password || !code.trim()}>Wyłącz logowanie dwuskładnikowe</Button>
            <Button variant="ghost" onClick={() => setStep("idle")}>Anuluj</Button>
          </div>
        </div>
      )}
    </div>
  );
}
