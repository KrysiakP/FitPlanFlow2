import { useMutation, useQuery } from "@tanstack/react-query";
import { Globe, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Device {
  id: string;
  kind: "browser" | "app";
  label: string;
  signedInAt: string | null;
  current: boolean;
}

const KEY = ["/api/account/devices"];

/** Where this account is signed in; each device can be signed out on its own (a lost phone, a shared computer). */
export function DevicesCard() {
  const { toast } = useToast();
  const { data } = useQuery<{ devices: Device[] }>({ queryKey: KEY });
  const remove = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/account/devices/${encodeURIComponent(id)}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: "Urządzenie wylogowane" });
    },
    onError: () => toast({ title: "Nie udało się wylogować urządzenia", variant: "destructive" }),
  });
  const devices = data?.devices ?? [];

  return (
    <Card data-testid="card-devices">
      <CardHeader>
        <CardTitle className="text-lg">Zalogowane urządzenia</CardTitle>
        <CardDescription>Nie rozpoznajesz któregoś? Wyloguj je. Hasło warto wtedy zmienić.</CardDescription>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak zalogowanych urządzeń.</p>
        ) : (
          <ul className="space-y-3">
            {devices.map((device) => (
              <li key={device.id} className="flex items-center justify-between gap-3 text-sm" data-testid={`device-${device.id}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {device.kind === "browser" ? <Globe className="w-4 h-4 shrink-0" /> : <Smartphone className="w-4 h-4 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-medium">
                      {device.label} {device.current && <Badge variant="secondary" className="ml-1">To urządzenie</Badge>}
                    </p>
                    {device.signedInAt && (
                      <p className="text-muted-foreground">
                        Zalogowano {new Date(device.signedInAt).toLocaleString("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
                {!device.current && (
                  <Button size="sm" variant="outline" onClick={() => remove.mutate(device.id)} disabled={remove.isPending} data-testid={`button-signout-${device.id}`}>
                    Wyloguj
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
