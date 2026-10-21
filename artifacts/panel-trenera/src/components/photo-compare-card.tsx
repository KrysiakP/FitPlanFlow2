import { useMemo, useState } from "react";
import { Images } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReportWithPhoto {
  id: string;
  reportDate: string | Date;
  weight?: string | null;
  photoUrl?: string | null;
}

/** Two progress photos side by side ("before" and "after"); defaults to the first and the latest one. */
export function PhotoCompareCard({ reports }: { reports: ReportWithPhoto[] }) {
  const withPhoto = useMemo(
    () => reports.filter((report) => !!report.photoUrl).sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()),
    [reports],
  );
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);

  if (withPhoto.length < 2) return null;

  const before = withPhoto.find((report) => report.id === beforeId) ?? withPhoto[0];
  const after = withPhoto.find((report) => report.id === afterId) ?? withPhoto[withPhoto.length - 1];
  const label = (report: ReportWithPhoto) => format(new Date(report.reportDate), "d MMM yyyy", { locale: pl });

  const side = (title: string, selected: ReportWithPhoto, onChange: (id: string) => void, testId: string) => (
    <div className="space-y-2" data-testid={testId}>
      <Select value={selected.id} onValueChange={onChange}>
        <SelectTrigger aria-label={`${title}: wybierz zdjęcie`}>
          <SelectValue placeholder={title} />
        </SelectTrigger>
        <SelectContent>
          {withPhoto.map((report) => (
            <SelectItem key={report.id} value={report.id}>
              {label(report)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <img src={selected.photoUrl ?? undefined} alt={`${title}, ${label(selected)}`} className="w-full rounded-md border object-cover aspect-[3/4] bg-muted" />
      <p className="text-sm text-muted-foreground text-center">
        {title} · {label(selected)}
        {selected.weight ? ` · ${selected.weight} kg` : ""}
      </p>
    </div>
  );

  return (
    <Card data-testid="card-photo-compare">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Images className="w-5 h-5" />
          Zdjęcia przed i po
        </CardTitle>
        <CardDescription>Wybierz dwa raporty i porównaj sylwetkę obok siebie.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {side("Przed", before, setBeforeId, "compare-before")}
          {side("Po", after, setAfterId, "compare-after")}
        </div>
      </CardContent>
    </Card>
  );
}
