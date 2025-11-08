import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import type { User, PlanAssignment, TrainingPlan } from "@shared/schema";

type ClientWithAssignment = User & {
  assignment?: PlanAssignment & { plan: TrainingPlan };
};

export default function Clients() {
  const { data: clients, isLoading } = useQuery<ClientWithAssignment[]>({
    queryKey: ["/api/trainer/clients"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-clients-title">
            Podopieczni
          </h1>
          <p className="text-muted-foreground">Zarządzaj swoimi podopiecznymi i ich planami</p>
        </div>
      </div>

      {!clients || clients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-xl mb-2">Brak podopiecznych</h3>
              <p className="text-muted-foreground">
                Podopieczni pojawią się tutaj automatycznie gdy przypisz im plany treningowe
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="hover-elevate" data-testid={`card-client-${client.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={client.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(client.firstName, client.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-lg" data-testid={`text-client-name-${client.id}`}>
                      {client.firstName} {client.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground" data-testid={`text-client-email-${client.id}`}>
                      {client.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {client.assignment ? (
                      <div className="text-right">
                        <Badge variant="secondary" data-testid={`badge-assigned-plan-${client.id}`}>
                          {client.assignment.plan.name}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Przypisano{" "}
                          {new Date(client.assignment.assignedAt).toLocaleDateString("pl-PL")}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="outline" data-testid={`badge-no-plan-${client.id}`}>
                        Brak planu
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
