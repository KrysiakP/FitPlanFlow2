import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CreditCard, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionWarningModalProps {
  subscriptionStatus: string | null;
  subscriptionCancelledAt: string | Date | null;
  isTrainer: boolean;
}

export function SubscriptionWarningModal({
  subscriptionStatus,
  subscriptionCancelledAt,
  isTrainer,
}: SubscriptionWarningModalProps) {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const getDaysRemaining = () => {
    if (!subscriptionCancelledAt) return 7;
    const cancelledDate = new Date(subscriptionCancelledAt);
    const now = new Date();
    const diffMs = now.getTime() - cancelledDate.getTime();
    const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - daysPassed);
  };

  const daysRemaining = getDaysRemaining();
  const isOverdue = subscriptionStatus === "past_due" || subscriptionStatus === "canceled";
  const isExpired = daysRemaining <= 0;

  useEffect(() => {
    if (isTrainer && isOverdue) {
      setIsOpen(true);
    }
  }, [isTrainer, isOverdue]);

  const createPortalSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/portal");
      return response;
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
  });

  const handlePayNow = () => {
    setLocation("/pricing");
    setIsOpen(false);
  };

  const handleManageSubscription = () => {
    createPortalSessionMutation.mutate();
  };

  if (!isTrainer || !isOverdue) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" data-testid="modal-subscription-warning">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive" data-testid="text-warning-title">
            <AlertTriangle className="w-5 h-5" />
            Zaległość w płatności
          </DialogTitle>
          <DialogDescription data-testid="text-warning-description">
            Twoja subskrypcja wymaga odnowienia
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <Clock className="h-4 w-4" />
            <AlertDescription data-testid="text-days-remaining">
              {isExpired ? (
                <span className="font-semibold">
                  Termin płatności minął! Dostęp dla Twoich podopiecznych został zablokowany.
                </span>
              ) : (
                <>
                  Masz jeszcze <span className="font-semibold">{daysRemaining} {daysRemaining === 1 ? "dzień" : "dni"}</span> na uregulowanie płatności.
                  Po tym czasie dostęp dla Twoich podopiecznych zostanie zablokowany.
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground" data-testid="text-warning-info">
            <p>Aby kontynuować korzystanie z platformy:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Opłać zaległą subskrypcję</li>
              <li>Twoi podopieczni odzyskają pełny dostęp</li>
              <li>Wszystkie dane pozostaną nienaruszone</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            data-testid="button-close-warning"
          >
            Przypomnij później
          </Button>
          <Button
            onClick={handlePayNow}
            className="gap-2"
            data-testid="button-pay-now"
          >
            <CreditCard className="w-4 h-4" />
            Opłać subskrypcję
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
