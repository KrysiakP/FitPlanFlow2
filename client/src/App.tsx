import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/app-layout";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import RoleSelection from "@/pages/role-selection";
import TrainerDashboard from "@/pages/trainer-dashboard";
import ClientDashboard from "@/pages/client-dashboard";
import TrainingPlans from "@/pages/training-plans";
import PlanForm from "@/pages/plan-form";
import AssignPlan from "@/pages/assign-plan";
import Clients from "@/pages/clients";
import ClientPlan from "@/pages/client-plan";
import ExerciseLibrary from "@/pages/exercise-library";
import TrainerProfile from "@/pages/trainer-profile";
import ClientProfile from "@/pages/client-profile";
import WeeklyReport from "@/pages/weekly-report";
import TrainerReports from "@/pages/trainer-reports";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={Landing} />
      </Switch>
    );
  }

  if (!user?.role) {
    return (
      <Switch>
        <Route path="/role-selection" component={RoleSelection} />
        <Route component={RoleSelection} />
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        {user.role === "trainer" ? (
          <>
            <Route path="/" component={TrainerDashboard} />
            <Route path="/plans" component={TrainingPlans} />
            <Route path="/plans/new" component={PlanForm} />
            <Route path="/plans/:id/edit" component={PlanForm} />
            <Route path="/plans/:id/assign" component={AssignPlan} />
            <Route path="/exercise-library" component={ExerciseLibrary} />
            <Route path="/clients" component={Clients} />
            <Route path="/trainer/reports" component={TrainerReports} />
            <Route path="/profile" component={TrainerProfile} />
          </>
        ) : (
          <>
            <Route path="/" component={ClientDashboard} />
            <Route path="/my-plan" component={ClientPlan} />
            <Route path="/weekly-report" component={WeeklyReport} />
            <Route path="/profile" component={ClientProfile} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
