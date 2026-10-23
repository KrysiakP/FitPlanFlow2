import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { MonthlyReportView } from "@/pages/monthly-report";
import type { MonthReport, MonthSession, MonthStrengthHistory } from "@/lib/monthlyReport";

/** The trainer's printable monthly summary of one client, from the data the trainer already sees on the progress page. */
export default function TrainerClientMonthly() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: client } = useQuery<{ firstName: string | null; lastName: string | null }>({ queryKey: [`/api/clients/${clientId}`], enabled: !!clientId });
  const { data: reports = [], isLoading: loadingReports } = useQuery<(MonthReport & { id: string })[]>({ queryKey: [`/api/clients/${clientId}/reports`], enabled: !!clientId });
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<MonthSession[]>({ queryKey: [`/api/trainer/clients/${clientId}/workout-sessions`], enabled: !!clientId });
  const { data: strength = [] } = useQuery<MonthStrengthHistory[]>({ queryKey: [`/api/trainer/clients/${clientId}/exercise-history`], enabled: !!clientId });

  return (
    <MonthlyReportView
      reports={reports}
      sessions={sessions}
      strength={strength}
      loading={loadingReports || loadingSessions}
      person={[client?.firstName, client?.lastName].filter(Boolean).join(" ") || "Podopieczny"}
      backHref={`/trainer/clients/${clientId}/progress`}
      backLabel="Progres podopiecznego"
    />
  );
}
