import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mail, User, AlertCircle } from "lucide-react";

interface TrainerInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string | null;
  profileImageDisplayUrl?: string | null;
}

export default function MyTrainer() {
  const { data: trainer, isLoading, error } = useQuery<TrainerInfo>({
    queryKey: ["/api/my-trainer"],
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-trainer-title">
            Mój trener
          </h1>
          <p className="text-muted-foreground">
            Informacje o Twoim trenerze personalnym
          </p>
        </div>
        <Alert variant="destructive" data-testid="alert-no-trainer">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Brak przypisanego trenera</AlertTitle>
          <AlertDescription>
            Nie masz jeszcze przypisanego trenera. Poproś swojego trenera o zaproszenie do współpracy.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-trainer-title">
            Mój trener
          </h1>
          <p className="text-muted-foreground">
            Informacje o Twoim trenerze personalnym
          </p>
        </div>
        <Alert data-testid="alert-no-trainer">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Brak przypisanego trenera</AlertTitle>
          <AlertDescription>
            Nie masz jeszcze przypisanego trenera. Poproś swojego trenera o zaproszenie do współpracy.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-trainer-title">
          Mój trener
        </h1>
        <p className="text-muted-foreground">
          Informacje o Twoim trenerze personalnym
        </p>
      </div>

      <Card data-testid="card-trainer-info">
        <CardHeader>
          <CardTitle className="font-heading">Twój trener personalny</CardTitle>
          <CardDescription>
            Osoba odpowiedzialna za Twój rozwój i postępy treningowe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24" data-testid="avatar-trainer">
              <AvatarImage src={trainer.profileImageDisplayUrl || trainer.profileImageUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials(trainer.firstName, trainer.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="font-heading font-bold text-2xl mb-1" data-testid="text-trainer-name">
                  {trainer.firstName} {trainer.lastName}
                </h2>
                <p className="text-muted-foreground">Trener personalny</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${trainer.email}`}
                      className="text-foreground hover:text-primary transition-colors"
                      data-testid="link-trainer-email"
                    >
                      {trainer.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Status</p>
                    <p className="text-foreground" data-testid="text-trainer-status">
                      Aktywny trener
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Wsparcie</CardTitle>
          <CardDescription>
            Potrzebujesz pomocy lub masz pytania?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Skontaktuj się ze swoim trenerem za pomocą emaila{" "}
            <a
              href={`mailto:${trainer.email}`}
              className="text-primary hover:underline font-medium"
            >
              {trainer.email}
            </a>
            {" "}lub umów się na konsultację, aby omówić swoje cele treningowe i postępy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
