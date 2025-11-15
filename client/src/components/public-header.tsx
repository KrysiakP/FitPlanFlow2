import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { id: "dla-trenera", label: "Dla Trenera" },
  { id: "pricing", label: "Cennik" },
  { id: "pomagamy", label: "Jak Pomagamy" },
];

export function PublicHeader() {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleSectionScroll = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleHomeClick = () => {
    if (location === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="border-b sticky top-0 z-50 bg-background">
      <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center justify-between">
          <Link href="/" onClick={handleHomeClick} className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1 -mx-2" data-testid="link-home">
            <Dumbbell className="w-8 h-8 text-primary" />
            <h1 className="font-heading font-bold text-2xl">Panel Trenera</h1>
          </Link>
          
          {user ? (
            <Button asChild className="md:hidden" data-testid="button-dashboard-mobile">
              <Link href="/">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild className="md:hidden" data-testid="button-login-mobile">
              <Link href="/login">Zaloguj się</Link>
            </Button>
          )}
        </div>
        
        <nav className="flex flex-wrap items-center gap-1 md:flex-1 md:justify-center" data-testid="nav-main">
          {navItems.map((item) => (
            <Button 
              key={item.id}
              variant="ghost"
              size="sm"
              className="font-medium text-sm"
              onClick={() => handleSectionScroll(item.id)}
              data-testid={`link-nav-${item.id}`}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {user ? (
          <Button asChild className="hidden md:inline-flex" data-testid="button-dashboard">
            <Link href="/">Dashboard</Link>
          </Button>
        ) : (
          <Button asChild className="hidden md:inline-flex" data-testid="button-login">
            <Link href="/login">Zaloguj się</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
