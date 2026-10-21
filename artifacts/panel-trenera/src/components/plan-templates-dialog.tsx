import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LayoutTemplate } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PlanTemplate {
  key: string;
  name: string;
  description: string;
  level: string;
  daysPerWeek: number;
  workouts: { name: string; exercises: string[] }[];
}

/** Start a plan from a ready-made template: it becomes the trainer's own plan, opened for editing. */
export function PlanTemplatesDialog({ label = "Z szablonu" }: { label?: string }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const { data: templates = [] } = useQuery<PlanTemplate[]>({ queryKey: ["/api/plan-templates"], enabled: open });

  const create = useMutation({
    mutationFn: async (key: string) => (await apiRequest("POST", `/api/plans/from-template/${key}`, {})) as { id: string },
    onSuccess: async (plan) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setOpen(false);
      toast({ title: "Plan utworzony", description: "Dopasuj ćwiczenia, obciążenia i serie do podopiecznego." });
      setLocation(`/plans/${plan.id}/edit`);
    },
    onError: () => toast({ title: "Nie udało się utworzyć planu", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-plan-templates">
          <LayoutTemplate className="w-4 h-4 mr-2" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gotowe plany</DialogTitle>
          <DialogDescription>Wybierz szablon, a dostaniesz własną kopię do edycji. Nic nie zostanie przypisane podopiecznemu, dopóki tego nie zrobisz.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.key} className="rounded-lg border p-4 space-y-2" data-testid={`template-${template.key}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading font-semibold">{template.name}</p>
                <Badge variant="secondary">{template.daysPerWeek} dni w tygodniu</Badge>
                <Badge variant="outline">{template.level}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{template.description}</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {template.workouts.map((workout) => (
                  <li key={workout.name}>
                    <span className="font-medium text-foreground">{workout.name}:</span> {workout.exercises.join(", ")}
                  </li>
                ))}
              </ul>
              <Button size="sm" onClick={() => create.mutate(template.key)} disabled={create.isPending} data-testid={`button-use-template-${template.key}`}>
                Użyj tego szablonu
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
