import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, UserX } from "lucide-react";

interface AccessStatus {
  blocked: boolean;
  reason: string | null;
  daysRemaining: number | null;
  trainerName?: string;
}

export function ClientAccessBlockModal() {
  const { user } = useAuth();
  const isClient = user?.role === "client";

  const { data: accessStatus } = useQuery<AccessStatus>({
    queryKey: ["/api/client/access-status"],
    enabled: isClient,
    refetchInterval: 60000,
  });

  if (!isClient || !accessStatus) {
    return null;
  }

  if (accessStatus.blocked && accessStatus.reason === 'trainer_subscription_expired') {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <UserX className="h-6 w-6" />
              <DialogTitle data-testid="text-access-blocked-title">
                Dostęp zablokowany
              </DialogTitle>
            </div>
            <DialogDescription className="pt-4 space-y-4" data-testid="text-access-blocked-description">
              <p>
                Twój trener <strong>{accessStatus.trainerName}</strong> nie ma aktywnej subskrypcji.
              </p>
              <p>
                Niestety nie możesz korzystać z platformy, dopóki Twój trener nie odnowi subskrypcji.
              </p>
              <p className="text-sm text-muted-foreground">
                Skontaktuj się ze swoim trenerem, aby uzyskać więcej informacji.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  if (accessStatus.reason === 'trainer_subscription_warning' && accessStatus.daysRemaining !== null) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
              <DialogTitle data-testid="text-access-warning-title">
                Uwaga
              </DialogTitle>
            </div>
            <DialogDescription className="pt-4 space-y-4" data-testid="text-access-warning-description">
              <p>
                Subskrypcja Twojego trenera <strong>{accessStatus.trainerName}</strong> wygasła.
              </p>
              <p>
                Masz jeszcze <strong>{accessStatus.daysRemaining} {accessStatus.daysRemaining === 1 ? 'dzień' : 'dni'}</strong> dostępu do platformy.
              </p>
              <p className="text-sm text-muted-foreground">
                Skontaktuj się ze swoim trenerem, aby uzyskać więcej informacji.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
