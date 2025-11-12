import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ExternalLink, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { CharityDonation } from "@shared/schema";

const POLISH_MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

export default function Pomagamy() {
  const { data: donations, isLoading } = useQuery<CharityDonation[]>({
    queryKey: ['/api/charity-donations'],
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Heart className="w-10 h-10 text-red-500" />
              <h1 className="font-heading font-bold text-4xl" data-testid="text-page-title">
                PomagaMY
              </h1>
            </div>
            
            <div className="max-w-3xl mx-auto space-y-3">
              <p className="text-lg text-muted-foreground" data-testid="text-mission-1">
                Z każdej subskrypcji Premium przekazujemy część środków na cele charytatywne
              </p>
              <p className="text-lg text-muted-foreground" data-testid="text-mission-2">
                Tutaj publikujemy miesięczne potwierdzenia przelewów - transparentność to dla nas priorytet
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20" data-testid="loading-state">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : donations && donations.length > 0 ? (
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              data-testid="donations-grid"
            >
              {donations.map((donation) => {
                const monthName = POLISH_MONTHS[donation.month - 1];
                const uploadDate = format(new Date(donation.uploadedAt), "d MMMM yyyy", { locale: pl });
                
                return (
                  <Card 
                    key={donation.id} 
                    className="flex flex-col"
                    data-testid={`card-donation-${donation.id}`}
                  >
                    <CardHeader className="space-y-2">
                      <CardTitle className="font-heading text-xl" data-testid={`text-donation-title-${donation.id}`}>
                        {monthName} {donation.year}
                      </CardTitle>
                      <CardDescription data-testid={`text-donation-date-${donation.id}`}>
                        Opublikowano: {uploadDate}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium" data-testid={`text-verified-${donation.id}`}>
                          Zweryfikowane
                        </span>
                      </div>
                      
                      <a
                        href={donation.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover-elevate active-elevate-2 px-4 py-2 rounded-md border border-primary/20 transition-colors"
                        data-testid={`link-document-${donation.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="font-medium">Zobacz potwierdzenie</span>
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="py-20" data-testid="empty-state">
              <CardContent className="text-center space-y-4">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto" />
                <div className="space-y-2">
                  <h3 className="font-heading font-semibold text-xl">
                    Wkrótce opublikujemy pierwsze potwierdzenie
                  </h3>
                  <p className="text-muted-foreground">
                    Darowizny będą publikowane miesięcznie
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
