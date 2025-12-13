import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SubscriptionWarningModal } from "@/components/subscription-warning-modal";
import { ClientAccessBlockModal } from "@/components/client-access-block-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dumbbell, LayoutDashboard, ClipboardList, Users, LogOut, Menu, User, FileText, Crown, CreditCard, UserPlus, ShieldCheck, Heart, UtensilsCrossed, Apple, GraduationCap, TrendingUp, DollarSign, Clock, MessageSquare, Bell, Activity } from "lucide-react";
import { RestTimerButton } from "@/components/rest-timer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUnreadCount } from "@/hooks/use-chat";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isTrainer = user?.role === "trainer";

  // Helper function to calculate days remaining in trial
  const getDaysRemaining = (trialEndsAt: Date | string | null | undefined) => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const isInTrial = user?.trialEndsAt && new Date(user.trialEndsAt) > new Date();
  const daysRemaining = getDaysRemaining(user?.trialEndsAt);

  const { data: unreadReportsData } = useQuery<{ count: number }>({
    queryKey: ["/api/trainer/unread-reports-count"],
    enabled: isTrainer,
    refetchInterval: 30000,
  });

  const unreadCount = unreadReportsData?.count || 0;

  const { data: upcomingPayments = [] } = useQuery<any[]>({
    queryKey: ["/api/payments/upcoming"],
    enabled: !!user,
    refetchInterval: 60000,
  });

  const upcomingPaymentsCount = upcomingPayments.length;

  const { data: unreadMessagesData } = useUnreadCount();
  const unreadMessagesCount = unreadMessagesData?.count || 0;

  // Notification queries (trainer only)
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: isTrainer,
    refetchInterval: 60000,
  });

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "teraz";
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;
    return date.toLocaleDateString('pl-PL');
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  const trainerNavItems = [
    { href: "/", icon: LayoutDashboard, label: "Panel" },
    { href: "/plans", icon: ClipboardList, label: "Plany treningowe" },
    { href: "/exercise-library", icon: Dumbbell, label: "Moje ćwiczenia" },
    { href: "/clients", icon: Users, label: "Podopieczni" },
    { href: "/trainer/diets", icon: UtensilsCrossed, label: "Diety" },
    { href: "/invite", icon: UserPlus, label: "Zaproś podopiecznego" },
    { href: "/trainer/reports", icon: FileText, label: "Raporty tygodniowe" },
    { href: "/chat", icon: MessageSquare, label: "Wiadomości" },
    { href: "/payment-schedule", icon: DollarSign, label: "Płatności" },
    ...(user?.isAdmin ? [{ href: "/admin/charity-donations", icon: ShieldCheck, label: "Panel Admin" }] : []),
    { href: "/pomagamy", icon: Heart, label: "PomagaMY" },
    { href: "/pricing", icon: Crown, label: "Subskrypcja" },
  ];

  const clientNavItems = [
    { href: "/", icon: LayoutDashboard, label: "Panel" },
    { href: "/my-plan", icon: ClipboardList, label: "Mój plan" },
    { href: "/my-trainer", icon: GraduationCap, label: "Mój trener" },
    { href: "/client/diet", icon: Apple, label: "Dieta" },
    { href: "/weekly-report", icon: FileText, label: "Raport tygodniowy" },
    { href: "/my-progress", icon: TrendingUp, label: "Mój progres" },
    { href: "/my-medical-tests", icon: Activity, label: "Badania medyczne" },
    { href: "/chat", icon: MessageSquare, label: "Wiadomości" },
    { href: "/payment-schedule", icon: DollarSign, label: "Płatności" },
    { href: "/pomagamy", icon: Heart, label: "PomagaMY" },
  ];

  const navItems = isTrainer ? trainerNavItems : clientNavItems;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href === "/chat" && location.startsWith("/chat"));
        const showReportsBadge = isTrainer && item.href === "/trainer/reports" && unreadCount > 0;
        const showPaymentsBadge = item.href === "/payment-schedule" && upcomingPaymentsCount > 0;
        const showMessagesBadge = item.href === "/chat" && unreadMessagesCount > 0;
        return (
          <Link key={item.href} href={item.href}>
            <button
              onClick={onClick}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover-elevate text-left ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              }`}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </div>
              {showReportsBadge && (
                <Badge 
                  variant="destructive" 
                  className="text-xs px-2 py-0.5"
                  data-testid="badge-unread-reports"
                >
                  {unreadCount}
                </Badge>
              )}
              {showPaymentsBadge && (
                <Badge 
                  variant="destructive" 
                  className="text-xs px-2 py-0.5"
                  data-testid="badge-upcoming-payments"
                >
                  {upcomingPaymentsCount}
                </Badge>
              )}
              {showMessagesBadge && (
                <Badge 
                  variant="destructive" 
                  className="text-xs px-2 py-0.5"
                  data-testid="badge-unread-messages"
                >
                  {unreadMessagesCount}
                </Badge>
              )}
            </button>
          </Link>
        );
      })}
      <div className="pt-4 border-t mt-4">
        <RestTimerButton />
      </div>
    </nav>
  );

  return (
    <div className="min-h-svh flex flex-col bg-background" style={{ "--app-header-height": "4rem" } as React.CSSProperties}>
      <SubscriptionWarningModal
        subscriptionStatus={user?.subscriptionStatus ?? null}
        subscriptionCancelledAt={user?.subscriptionCancelledAt ?? null}
        isTrainer={isTrainer}
        hasFreeAccess={user?.hasFreeAccess ?? false}
      />
      <ClientAccessBlockModal />
      <header className="shrink-0 z-50 border-b bg-background h-16">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex items-center gap-2 mb-8">
                  <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center" data-testid="img-logo-mobile">
                    <Dumbbell className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-heading font-bold text-lg">Panel Trenera</span>
                </div>
                <NavLinks onClick={() => setMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>

            <Link href="/">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center" data-testid="img-logo-header">
                  <Dumbbell className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-heading font-bold text-xl hidden sm:inline">
                  Panel Trenera
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isTrainer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative"
                    data-testid="button-notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadNotificationsCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        data-testid="badge-notification-count"
                      >
                        {unreadNotificationsCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80" data-testid="dropdown-notifications">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Powiadomienia</span>
                    {unreadNotificationsCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllNotificationsReadMutation.mutate()}
                        disabled={markAllNotificationsReadMutation.isPending}
                        className="h-auto p-1 text-xs"
                        data-testid="button-mark-all-read"
                      >
                        Oznacz wszystkie
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
                        Brak powiadomień
                      </div>
                    ) : (
                      notifications.map((notification: any) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                            !notification.isRead ? "bg-primary/5" : ""
                          }`}
                          onClick={() => {
                            if (!notification.isRead) {
                              markNotificationReadMutation.mutate(notification.id);
                            }
                          }}
                          data-testid={`notification-${notification.id}`}
                        >
                          <div className="flex items-start justify-between w-full gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-none mb-1" data-testid={`notification-title-${notification.id}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`notification-body-${notification.id}`}>
                                {notification.body}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" data-testid={`notification-unread-dot-${notification.id}`} />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground" data-testid={`notification-time-${notification.id}`}>
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profileImageDisplayUrl || user?.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">
                  {user?.firstName} {user?.lastName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs leading-none text-muted-foreground capitalize">
                      {user?.role === "trainer" ? "Trener" : "Podopieczny"}
                    </p>
                    {user?.role === "trainer" && (
                      <Badge 
                        variant={user?.subscriptionTier === "premium" && user?.subscriptionStatus === "active" ? "default" : "secondary"}
                        className="text-xs"
                        data-testid="badge-nav-subscription"
                      >
                        {user?.subscriptionTier === "premium" && user?.subscriptionStatus === "active" ? (
                          <>
                            <Crown className="w-3 h-3 mr-1" />
                            Premium
                          </>
                        ) : (
                          "Free"
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                className="cursor-pointer"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Wyloguj się
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <aside className="hidden md:flex md:flex-col w-64 border-r overflow-y-auto">
          <div className="p-6">
            <NavLinks />
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 md:p-8">
            <div className="container mx-auto max-w-7xl flex-1 flex flex-col min-h-0">
            {isTrainer && isInTrial && !user?.hasFreeAccess && (
              <Alert className="mb-6 border-primary/50 bg-primary/5" data-testid="alert-trial-banner">
                <Clock className="h-4 w-4 text-primary" />
                <AlertTitle data-testid="text-trial-title" className="text-primary">
                  {(() => {
                    const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
                    const isPromotionalTrial = trialEnd && 
                      trialEnd.getFullYear() === 2026 && 
                      trialEnd.getMonth() === 0 && 
                      trialEnd.getDate() === 31;
                    return isPromotionalTrial ? "Darmowy dostęp promocyjny" : "Okres próbny";
                  })()}
                </AlertTitle>
                <AlertDescription data-testid="text-trial-description">
                  {(() => {
                    const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
                    const isPromotionalTrial = trialEnd && 
                      trialEnd.getFullYear() === 2026 && 
                      trialEnd.getMonth() === 0 && 
                      trialEnd.getDate() === 31;
                    
                    if (isPromotionalTrial) {
                      return (
                        <>
                          Korzystasz z darmowego dostępu do <strong>31 stycznia 2026</strong>. 
                          <Link href="/pricing">
                            <button className="ml-2 underline hover:text-primary font-medium" data-testid="link-trial-pricing">
                              Zobacz plany subskrypcji
                            </button>
                          </Link> i wybierz pakiet odpowiedni dla Ciebie.
                        </>
                      );
                    }
                    
                    return (
                      <>
                        Twój trial kończy się za {daysRemaining} {daysRemaining === 1 ? 'dzień' : 'dni'}. 
                        <Link href="/pricing">
                          <button className="ml-2 underline hover:text-primary" data-testid="link-trial-pricing">
                            Wykup subskrypcję
                          </button>
                        </Link> aby kontynuować z nieograniczoną liczbą podopiecznych.
                      </>
                    );
                  })()}
                </AlertDescription>
              </Alert>
            )}
            {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
