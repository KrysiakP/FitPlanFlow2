import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { CookieConsentBanner } from "@/components/cookie-consent";
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
import MyTrainer from "@/pages/my-trainer";
import ExerciseLibrary from "@/pages/exercise-library";
import TrainerProfile from "@/pages/trainer-profile";
import ClientProfile from "@/pages/client-profile";
import WeeklyReport from "@/pages/weekly-report";
import TrainerReports from "@/pages/trainer-reports";
import InviteClient from "@/pages/invite-client";
import AdminCharityDonations from "@/pages/admin-charity-donations";
import TrainerDiets from "@/pages/trainer-diets";
import DietPlanForm from "@/pages/diet-plan-form";
import ClientDiet from "@/pages/client-diet";
import TrainerClientDietStats from "@/pages/trainer-client-diet-stats";
import TrainerClientProgress from "@/pages/trainer-client-progress";
import MyProgress from "@/pages/my-progress";
import ClientMedicalTests from "@/pages/client-medical-tests";
import PaymentSchedule from "@/pages/payment-schedule";
import Pomagamy from "@/pages/pomagamy";
import Pricing from "@/pages/pricing";
import Chat from "@/pages/chat";
import Referrals from "@/pages/referrals";
import VerifyEmail from "@/pages/verify-email";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import LegalRegulamin from "@/pages/legal-regulamin";
import LegalPolitykaPrivatnosci from "@/pages/legal-polityka-prywatnosci";
import LegalPolitykaCookies from "@/pages/legal-polityka-cookies";
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
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/legal/regulamin" component={LegalRegulamin} />
        <Route path="/legal/polityka-prywatnosci" component={LegalPolitykaPrivatnosci} />
        <Route path="/legal/polityka-cookies" component={LegalPolitykaCookies} />
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
            <Route path="/trainer/clients/:clientId/progress" component={TrainerClientProgress} />
            <Route path="/trainer/clients/:clientId/diet" component={TrainerClientDietStats} />
            <Route path="/trainer/diets/new" component={DietPlanForm} />
            <Route path="/trainer/diets/:id/edit" component={DietPlanForm} />
            <Route path="/trainer/diets" component={TrainerDiets} />
            <Route path="/invite" component={InviteClient} />
            <Route path="/trainer/reports" component={TrainerReports} />
            <Route path="/chat/:clientId" component={Chat} />
            <Route path="/chat" component={Chat} />
            <Route path="/payment-schedule" component={PaymentSchedule} />
            {user.isAdmin && (
              <Route path="/admin/charity-donations" component={AdminCharityDonations} />
            )}
            <Route path="/pomagamy" component={Pomagamy} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/referrals" component={Referrals} />
            <Route path="/legal/regulamin" component={LegalRegulamin} />
            <Route path="/legal/polityka-prywatnosci" component={LegalPolitykaPrivatnosci} />
            <Route path="/legal/polityka-cookies" component={LegalPolitykaCookies} />
            <Route path="/profile/:userId" component={TrainerProfile} />
            <Route path="/profile" component={TrainerProfile} />
          </>
        ) : (
          <>
            <Route path="/" component={ClientDashboard} />
            <Route path="/my-plan" component={ClientPlan} />
            <Route path="/my-trainer" component={MyTrainer} />
            <Route path="/my-progress" component={MyProgress} />
            <Route path="/my-medical-tests" component={ClientMedicalTests} />
            <Route path="/client/diet" component={ClientDiet} />
            <Route path="/weekly-report" component={WeeklyReport} />
            <Route path="/chat" component={Chat} />
            <Route path="/payment-schedule" component={PaymentSchedule} />
            <Route path="/pomagamy" component={Pomagamy} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/legal/regulamin" component={LegalRegulamin} />
            <Route path="/legal/polityka-prywatnosci" component={LegalPolitykaPrivatnosci} />
            <Route path="/legal/polityka-cookies" component={LegalPolitykaCookies} />
            <Route path="/profile/:userId" component={ClientProfile} />
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
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Toaster />
            <CookieConsentBanner />
            <Router />
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
