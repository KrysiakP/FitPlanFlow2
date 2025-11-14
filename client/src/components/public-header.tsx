import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { Link, useLocation } from "wouter";

const navItems = [
  { href: "/dla-trenera", label: "Dla Trenera" },
  { href: "/pricing", label: "Cennik" },
  { href: "/pomagamy", label: "Jak Pomagamy" },
];

export function PublicHeader() {
  const [location] = useLocation();

  return (
    <header className="border-b sticky top-0 z-50 bg-background">
      <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1 -mx-2" data-testid="link-home">
            <Dumbbell className="w-8 h-8 text-primary" />
            <h1 className="font-heading font-bold text-2xl">Panel Trenera</h1>
          </Link>
          
          <Button asChild className="md:hidden" data-testid="button-login-mobile">
            <Link href="/login">Zaloguj się</Link>
          </Button>
        </div>
        
        <nav className="flex flex-wrap items-center gap-1 md:flex-1 md:justify-center" data-testid="nav-main">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              data-testid={`link-nav-${item.href.slice(1)}`}
            >
              <Button 
                variant={location === item.href ? "secondary" : "ghost"}
                size="sm"
                className="font-medium text-sm"
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <Button asChild className="hidden md:inline-flex" data-testid="button-login">
          <Link href="/login">Zaloguj się</Link>
        </Button>
      </div>
    </header>
  );
}
