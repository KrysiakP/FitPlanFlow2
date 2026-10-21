import { useState } from "react";
import { Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const MAX_LABELS = 5;

/** The trainer's private labels on one client ("online", "VIP"); saved on every change, never shown to the client. */
export function ClientLabelsEditor({ clientId, labels }: { clientId: string; labels: string[] }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(next: string[]) {
    setSaving(true);
    try {
      await apiRequest("PUT", `/api/trainer/clients/${clientId}/labels`, { labels: next });
      await queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
    } catch (error) {
      toast({ title: "Nie udało się zapisać etykiet", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    const label = draft.trim();
    if (!label) return;
    setDraft("");
    if (labels.some((existing) => existing.toLowerCase() === label.toLowerCase())) return;
    await save([...labels, label]);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2" data-testid={`labels-${clientId}`}>
      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
      {labels.map((label) => (
        <Badge key={label} variant="secondary" className="gap-1" data-testid={`label-${clientId}-${label}`}>
          {label}
          <button type="button" aria-label={`Usuń etykietę ${label}`} disabled={saving} onClick={() => void save(labels.filter((item) => item !== label))}>
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      {labels.length < MAX_LABELS && (
        <Input
          value={draft}
          maxLength={24}
          disabled={saving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void add();
            }
          }}
          onBlur={() => void add()}
          placeholder="Dodaj etykietę"
          className="h-7 w-36 text-xs"
          data-testid={`input-label-${clientId}`}
        />
      )}
    </div>
  );
}
