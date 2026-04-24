import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dumbbell, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<"trainer" | "client" | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const updateRoleMutation = useMutation({
    mutationFn: async (role: "trainer" | "client") => {
      await apiRequest("POST", "/api/auth/update-role", { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Sukces!",
        description: "Twoja rola została ustawiona",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się ustawić roli. Spróbuj ponownie.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedRole) {
      toast({
        title: "Wybierz rolę",
        description: "Musisz wybrać swoją rolę przed kontynuacją",
        variant: "destructive",
      });
      return;
    }
    updateRoleMutation.mutate(selectedRole);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="font-heading text-3xl">Witaj na platformie!</CardTitle>
          <CardDescription className="text-base">
            Wybierz swoją rolę, aby kontynuować
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedRole("client")}
              className={`p-6 rounded-lg border-2 transition-all hover-elevate ${
                selectedRole === "client"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
              data-testid="button-role-client"
            >
              <div className="text-center space-y-4">
                <Users className="w-16 h-16 mx-auto text-primary" />
                <div>
                  <h3 className="font-heading font-semibold text-xl mb-2">Podopieczny</h3>
                  <p className="text-sm text-muted-foreground">
                    Otrzymuj plany treningowe od swojego trenera
                  </p>
                </div>
                <div className="inline-block px-3 py-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  Darmowe
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedRole("trainer")}
              className={`p-6 rounded-lg border-2 transition-all hover-elevate ${
                selectedRole === "trainer"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
              data-testid="button-role-trainer"
            >
              <div className="text-center space-y-4">
                <Dumbbell className="w-16 h-16 mx-auto text-primary" />
                <div>
                  <h3 className="font-heading font-semibold text-xl mb-2">Trener</h3>
                  <p className="text-sm text-muted-foreground">
                    Twórz plany i zarządzaj swoimi podopiecznymi
                  </p>
                </div>
                <div className="inline-block px-3 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                  Profesjonalne
                </div>
              </div>
            </button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || updateRoleMutation.isPending}
            className="w-full"
            size="lg"
            data-testid="button-confirm-role"
          >
            {updateRoleMutation.isPending ? "Zapisywanie..." : "Kontynuuj"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
