import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cookie, Settings } from "lucide-react";
import { Link } from "wouter";

type CookieConsent = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
};

const CONSENT_KEY = "cookie_consent";

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      const timer = setTimeout(() => setShowBanner(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (newConsent: CookieConsent) => {
    const consentWithTimestamp = { ...newConsent, timestamp: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentWithTimestamp));
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    saveConsent({ necessary: true, analytics: true, marketing: true, timestamp: Date.now() });
  };

  const acceptNecessary = () => {
    saveConsent({ necessary: true, analytics: false, marketing: false, timestamp: Date.now() });
  };

  const saveCustom = () => {
    saveConsent(consent);
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {showBanner && !showSettings && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg"
          data-testid="cookie-banner"
        >
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="w-6 h-6 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Ta strona używa plików cookies</p>
                  <p className="text-sm text-muted-foreground">
                    Używamy cookies, aby zapewnić najlepsze doświadczenia na naszej stronie. 
                    Możesz zarządzać swoimi preferencjami lub zaakceptować wszystkie cookies.{" "}
                    <Link 
                      href="/legal/polityka-cookies" 
                      className="text-primary hover:underline"
                      data-testid="link-cookie-policy"
                    >
                      Dowiedz się więcej
                    </Link>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  data-testid="button-cookie-settings"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Ustawienia
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={acceptNecessary}
                  data-testid="button-accept-necessary"
                >
                  Tylko niezbędne
                </Button>
                <Button 
                  size="sm"
                  onClick={acceptAll}
                  data-testid="button-accept-all"
                >
                  Akceptuj wszystkie
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg" data-testid="modal-cookie-settings">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5" />
              Ustawienia cookies
            </DialogTitle>
            <DialogDescription>
              Zarządzaj swoimi preferencjami dotyczącymi plików cookies. Niezbędne cookies są wymagane do działania strony.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="font-medium">Niezbędne</Label>
                <p className="text-sm text-muted-foreground">
                  Wymagane do podstawowego działania strony (sesja, bezpieczeństwo)
                </p>
              </div>
              <Switch checked disabled data-testid="switch-necessary" />
            </div>

            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border">
              <div className="space-y-1">
                <Label className="font-medium">Analityczne</Label>
                <p className="text-sm text-muted-foreground">
                  Pomagają nam zrozumieć, jak użytkownicy korzystają ze strony
                </p>
              </div>
              <Switch 
                checked={consent.analytics}
                onCheckedChange={(checked) => setConsent(prev => ({ ...prev, analytics: checked }))}
                data-testid="switch-analytics"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border">
              <div className="space-y-1">
                <Label className="font-medium">Marketingowe</Label>
                <p className="text-sm text-muted-foreground">
                  Używane do personalizacji reklam i treści
                </p>
              </div>
              <Switch 
                checked={consent.marketing}
                onCheckedChange={(checked) => setConsent(prev => ({ ...prev, marketing: checked }))}
                data-testid="switch-marketing"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={acceptNecessary} data-testid="button-modal-necessary">
              Tylko niezbędne
            </Button>
            <Button onClick={saveCustom} data-testid="button-modal-save">
              Zapisz preferencje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        setConsent(JSON.parse(stored));
      } catch {
        setConsent(null);
      }
    }
  }, []);

  return consent;
}

export function CookieSettingsButton() {
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        setConsent(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const saveConsent = (newConsent: CookieConsent) => {
    const consentWithTimestamp = { ...newConsent, timestamp: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentWithTimestamp));
    setShowSettings(false);
  };

  const acceptNecessary = () => {
    saveConsent({ necessary: true, analytics: false, marketing: false, timestamp: Date.now() });
  };

  const saveCustom = () => {
    saveConsent(consent);
  };

  return (
    <>
      <button
        onClick={() => setShowSettings(true)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-manage-cookies"
      >
        Zarządzaj cookies
      </button>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg" data-testid="modal-cookie-settings-footer">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5" />
              Ustawienia cookies
            </DialogTitle>
            <DialogDescription>
              Zarządzaj swoimi preferencjami dotyczącymi plików cookies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="font-medium">Niezbędne</Label>
                <p className="text-sm text-muted-foreground">
                  Wymagane do podstawowego działania strony
                </p>
              </div>
              <Switch checked disabled data-testid="switch-necessary-footer" />
            </div>

            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border">
              <div className="space-y-1">
                <Label className="font-medium">Analityczne</Label>
                <p className="text-sm text-muted-foreground">
                  Pomagają zrozumieć, jak korzystasz ze strony
                </p>
              </div>
              <Switch 
                checked={consent.analytics}
                onCheckedChange={(checked) => setConsent(prev => ({ ...prev, analytics: checked }))}
                data-testid="switch-analytics-footer"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border">
              <div className="space-y-1">
                <Label className="font-medium">Marketingowe</Label>
                <p className="text-sm text-muted-foreground">
                  Personalizacja reklam i treści
                </p>
              </div>
              <Switch 
                checked={consent.marketing}
                onCheckedChange={(checked) => setConsent(prev => ({ ...prev, marketing: checked }))}
                data-testid="switch-marketing-footer"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={acceptNecessary} data-testid="button-modal-necessary-footer">
              Tylko niezbędne
            </Button>
            <Button onClick={saveCustom} data-testid="button-modal-save-footer">
              Zapisz preferencje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
