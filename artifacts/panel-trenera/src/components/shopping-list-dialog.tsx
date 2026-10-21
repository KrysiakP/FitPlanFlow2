import { useMemo, useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { buildShoppingList, formatAmount } from "@/lib/shoppingList";

/** The week's shopping list, added up from the diet plan's meal descriptions; items can be ticked off in the shop. */
export function ShoppingListDialog({ descriptions }: { descriptions: (string | null | undefined)[] }) {
  const { toast } = useToast();
  const items = useMemo(() => buildShoppingList(descriptions), [descriptions]);
  const [done, setDone] = useState<Set<string>>(new Set());

  async function copy() {
    const text = items.map((item) => `- ${item.name}: ${formatAmount(item)}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Lista skopiowana", description: "Możesz ją wkleić do notatek lub wiadomości." });
    } catch {
      toast({ title: "Nie udało się skopiować", description: "Zaznacz listę ręcznie.", variant: "destructive" });
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-shopping-list">
          <ShoppingBasket className="w-4 h-4" />
          Lista zakupów
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lista zakupów na tydzień</DialogTitle>
          <DialogDescription>
            Policzona z posiłków, w których podano ilość (np. „100 g ryżu"). Pozycje bez ilości i opisy przygotowania są pomijane.
          </DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-shopping-empty">
            Nie znaleziono składników z ilościami. Poproś trenera o dopisanie ich w opisach posiłków.
          </p>
        ) : (
          <>
            <ul className="space-y-2" data-testid="shopping-list">
              {items.map((item) => {
                const key = `${item.name}|${item.unit}`;
                const checked = done.has(key);
                return (
                  <li key={key} className="flex items-center gap-3">
                    <Checkbox
                      id={`shop-${key}`}
                      checked={checked}
                      onCheckedChange={(value) =>
                        setDone((current) => {
                          const next = new Set(current);
                          if (value) next.add(key);
                          else next.delete(key);
                          return next;
                        })
                      }
                    />
                    <label htmlFor={`shop-${key}`} className={`flex-1 text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>
                      {item.name}
                    </label>
                    <span className="text-sm text-muted-foreground tabular-nums">{formatAmount(item)}</span>
                  </li>
                );
              })}
            </ul>
            <Button onClick={() => void copy()} data-testid="button-copy-shopping-list">
              Skopiuj listę
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
