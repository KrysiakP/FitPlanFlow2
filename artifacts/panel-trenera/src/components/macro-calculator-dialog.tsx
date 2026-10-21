import { useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateMacros, validateMacroInput, type Activity, type GoalKind, type MacroInput, type Sex } from "@/lib/macros";

const ACTIVITY_LABELS: Record<Activity, string> = {
  low: "Niska (praca siedząca, mało ruchu)",
  light: "Lekka (1–3 treningi w tygodniu)",
  moderate: "Umiarkowana (3–5 treningów)",
  high: "Wysoka (6–7 treningów lub praca fizyczna)",
};
const GOAL_LABELS: Record<GoalKind, string> = { lose: "Redukcja", maintain: "Utrzymanie wagi", gain: "Budowa masy" };

/** Rough daily calories and macros; a starting point to talk through with the trainer. */
export function MacroCalculatorDialog() {
  const [sex, setSex] = useState<Sex | undefined>();
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goal, setGoal] = useState<GoalKind>("maintain");
  const [shown, setShown] = useState(false);

  const input: Partial<MacroInput> = { sex, age: Number(age), heightCm: Number(height), weightKg: Number(weight.replace(",", ".")), activity, goal };
  const problem = validateMacroInput(input);
  const result = shown && !problem ? calculateMacros(input as MacroInput) : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-macro-calculator">
          <Calculator className="w-4 h-4" />
          Kalkulator kalorii
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kalkulator kalorii i makroskładników</DialogTitle>
          <DialogDescription>Orientacyjne zapotrzebowanie (wzór Mifflina–St Jeora). To punkt wyjścia do rozmowy z trenerem, nie zalecenie medyczne.</DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setShown(true);
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="macro-sex">Płeć</Label>
            <Select value={sex} onValueChange={(value) => setSex(value as Sex)}>
              <SelectTrigger id="macro-sex" data-testid="select-macro-sex">
                <SelectValue placeholder="Wybierz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Kobieta</SelectItem>
                <SelectItem value="male">Mężczyzna</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="macro-age">Wiek (lata)</Label>
            <Input id="macro-age" inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} data-testid="input-macro-age" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="macro-height">Wzrost (cm)</Label>
            <Input id="macro-height" inputMode="numeric" value={height} onChange={(event) => setHeight(event.target.value)} data-testid="input-macro-height" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="macro-weight">Waga (kg)</Label>
            <Input id="macro-weight" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} data-testid="input-macro-weight" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label htmlFor="macro-activity">Aktywność</Label>
            <Select value={activity} onValueChange={(value) => setActivity(value as Activity)}>
              <SelectTrigger id="macro-activity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {ACTIVITY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label htmlFor="macro-goal">Cel</Label>
            <Select value={goal} onValueChange={(value) => setGoal(value as GoalKind)}>
              <SelectTrigger id="macro-goal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GOAL_LABELS) as GoalKind[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {GOAL_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="col-span-2" data-testid="button-macro-calculate">
            Policz
          </Button>
        </form>
        {shown && problem && (
          <p className="text-sm text-destructive" role="alert" data-testid="text-macro-error">
            {problem}
          </p>
        )}
        {result && (
          <div className="rounded-lg border p-4 space-y-1" data-testid="macro-result">
            <p className="text-2xl font-bold">{result.calories} kcal dziennie</p>
            <p className="text-sm text-muted-foreground">
              Białko {result.proteinG} g · Tłuszcz {result.fatG} g · Węglowodany {result.carbsG} g
            </p>
            <p className="text-xs text-muted-foreground">
              Podstawowa przemiana materii {result.bmr} kcal, całkowite zapotrzebowanie {result.tdee} kcal.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
