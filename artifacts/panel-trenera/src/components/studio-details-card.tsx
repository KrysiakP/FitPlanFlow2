import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface StudioDetails {
  name: string;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
}

export function StudioDetailsCard({ gym }: { gym: StudioDetails }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: gym.name,
    contactEmail: gym.contactEmail ?? "",
    phone: gym.phone ?? "",
    address: gym.address ?? "",
  });

  useEffect(() => {
    setForm({
      name: gym.name,
      contactEmail: gym.contactEmail ?? "",
      phone: gym.phone ?? "",
      address: gym.address ?? "",
    });
  }, [gym.name, gym.contactEmail, gym.phone, gym.address]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      apiRequest("PATCH", "/api/gym/me", {
        name: form.name,
        contactEmail: form.contactEmail || null,
        phone: form.phone || null,
        address: form.address || null,
      }),
    onSuccess: () => {
      toast({ title: "Zapisano", description: "Dane studia zostały zaktualizowane." });
      queryClient.invalidateQueries({ queryKey: ["/api/gym/me"] });
    },
    onError: () =>
      toast({
        title: "Nie udało się zapisać",
        description: "Sprawdź nazwę studia i adres e-mail, a potem spróbuj ponownie.",
        variant: "destructive",
      }),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Dane studia
        </CardTitle>
        <CardDescription>Te dane widzisz tylko Ty i zespół Panelu Trenera.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="studio-name">Nazwa studia</Label>
            <Input id="studio-name" value={form.name} onChange={set("name")} data-testid="input-studio-details-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-contact-email">E-mail kontaktowy</Label>
            <Input id="studio-contact-email" type="email" value={form.contactEmail} onChange={set("contactEmail")} data-testid="input-studio-details-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studio-phone">Telefon</Label>
            <Input id="studio-phone" type="tel" value={form.phone} onChange={set("phone")} data-testid="input-studio-details-phone" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="studio-address">Adres</Label>
            <Input id="studio-address" value={form.address} onChange={set("address")} data-testid="input-studio-details-address" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saveMutation.isPending || form.name.trim().length < 2} data-testid="button-save-studio-details">
              {saveMutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
