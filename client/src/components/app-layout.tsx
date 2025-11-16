import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dumbbell, LayoutDashboard, ClipboardList, Users, LogOut, Menu, User, FileText, UserCircle, Crown, CreditCard, UserPlus, ShieldCheck, Heart, UtensilsCrossed, Apple, GraduationCap, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isTrainer = user?.role === "trainer";

  const { data: unreadReportsData } = useQuery<{ count: number }>({
    queryKey: ["/api/trainer/unread-reports-count"],
    enabled: isTrainer,
    refetchInterval: 30000,
  });

  const unreadCount = unreadReportsData?.count || 0;

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
    ...(user?.isAdmin ? [{ href: "/admin/charity-donations", icon: ShieldCheck, label: "Panel Admin" }] : []),
    { href: "/pomagamy", icon: Heart, label: "PomagaMY" },
    { href: "/pricing", icon: Crown, label: "Subskrypcja" },
    { href: "/profile", icon: UserCircle, label: "Profil" },
  ];

  const clientNavItems = [
    { href: "/", icon: LayoutDashboard, label: "Panel" },
    { href: "/my-plan", icon: ClipboardList, label: "Mój plan" },
    { href: "/my-trainer", icon: GraduationCap, label: "Mój trener" },
    { href: "/client/diet", icon: Apple, label: "Dieta" },
    { href: "/weekly-report", icon: FileText, label: "Raport tygodniowy" },
    { href: "/my-progress", icon: TrendingUp, label: "Mój progres" },
    { href: "/pomagamy", icon: Heart, label: "PomagaMY" },
    { href: "/profile", icon: UserCircle, label: "Profil" },
  ];

  const navItems = isTrainer ? trainerNavItems : clientNavItems;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        const showBadge = isTrainer && item.href === "/trainer/reports" && unreadCount > 0;
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
              {showBadge && (
                <Badge 
                  variant="destructive" 
                  className="text-xs px-2 py-0.5"
                  data-testid="badge-unread-reports"
                >
                  {unreadCount}
                </Badge>
              )}
            </button>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background">
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
                  <Dumbbell className="w-6 h-6 text-primary" />
                  <span className="font-heading font-bold text-lg">Panel Trenera</span>
                </div>
                <NavLinks onClick={() => setMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>

            <Link href="/">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-8 h-8 text-primary" />
                <span className="font-heading font-bold text-xl hidden sm:inline">
                  Panel Trenera
                </span>
              </div>
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
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
      </header>

      <div className="flex">
        <aside className="hidden md:block w-64 border-r min-h-[calc(100vh-4rem)] sticky top-16">
          <div className="p-6">
            <NavLinks />
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          <div className="container mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
