import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

/** Keep a plan as the trainer's own template, to start new plans from later. */
export function SavePlanAsTemplate({ planId, planName }: { planId: string; planName: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(planName);

  const save = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/plans/${planId}/save-as-template`, { name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/plan-templates"] });
      setOpen(false);
      toast({ title: "Szablon zapisany", description: "Znajdziesz go w „Z szablonu” na liście planów." });
    },
    onError: () => toast({ title: "Nie udało się zapisać szablonu", description: "Sprawdź, czy plan ma treningi i czy nie masz już 50 szablonów.", variant: "destructive" }),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setName(planName);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1 md:flex-none" data-testid={`button-save-template-${planId}`}>
          <BookmarkPlus className="w-4 h-4 mr-1 md:mr-2" />
          Szablon
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Zapisz jako szablon</DialogTitle>
          <DialogDescription>Szablon zapamięta dni treningowe i ćwiczenia z tego planu. Późniejsze zmiany planu go nie zmienią.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`template-name-${planId}`}>Nazwa szablonu</Label>
          <Input id={`template-name-${planId}`} value={name} maxLength={200} onChange={(event) => setName(event.target.value)} data-testid="input-template-name" />
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()} data-testid="button-confirm-save-template">
            Zapisz szablon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
