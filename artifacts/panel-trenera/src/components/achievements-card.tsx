import { useQuery } from "@tanstack/react-query";
import { Award, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  progress: number;
  current: number;
  target: number;
}

/** Milestones: earned ones first, the rest with a progress bar. Hidden until the data arrives. */
export function AchievementsCard() {
  const { data } = useQuery<{ achievements: Achievement[]; earned: number }>({ queryKey: ["/api/client/achievements"] });
  if (!data) return null;
  const sorted = [...data.achievements].sort((a, b) => Number(b.earned) - Number(a.earned) || b.progress - a.progress);

  return (
    <Card data-testid="card-achievements">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Award className="w-5 h-5" />
          Osiągnięcia
        </CardTitle>
        <CardDescription>
          {data.earned} z {data.achievements.length} zdobyte. Liczymy z Twoich treningów i raportów, nic nie trzeba zgłaszać.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {sorted.map((item) => (
            <li key={item.id} className={`rounded-lg border p-3 space-y-2 ${item.earned ? "bg-primary/5 border-primary/30" : ""}`} data-testid={`achievement-${item.id}`}>
              <div className="flex items-center gap-2 font-medium">
                {item.earned ? <Award className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                {item.title}
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              {!item.earned && (
                <div className="space-y-1">
                  <Progress value={item.progress * 100} aria-label={`Postęp: ${item.title}`} />
                  <p className="text-xs text-muted-foreground">
                    {item.current} z {item.target}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
