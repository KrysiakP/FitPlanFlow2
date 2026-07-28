import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PublicHeader } from "@/components/public-header";

interface MyTrainerInfo {
  id: string;
}

interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  clientFirstName: string | null;
  clientLastInitial: string;
}

interface PublicTrainerProfile {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  bio: string | null;
  specialization: string | null;
  averageRating: number | null;
  reviewCount: number;
  reviews: PublicReview[];
}

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}
        />
      ))}
    </div>
  );
}

export default function TrainerPublicProfile() {
  const { trainerId } = useParams<{ trainerId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");

  const { data: profile, isLoading } = useQuery<PublicTrainerProfile>({
    queryKey: [`/api/public/trainers/${trainerId}`],
    enabled: !!trainerId,
  });

  const { data: myTrainer } = useQuery<MyTrainerInfo>({
    queryKey: ["/api/my-trainer"],
    enabled: !!user && user.role === "client",
    retry: false,
  });

  const canReview = !!user && user.role === "client" && myTrainer?.id === trainerId;

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/trainers/${trainerId}/reviews`, {
        rating: myRating,
        comment: myComment.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/trainers/${trainerId}`] });
      toast({ title: "Dziękujemy za opinię!" });
      setMyRating(0);
      setMyComment("");
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zapisać opinii", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-4">
        <Skeleton className="h-24 w-24 rounded-full mx-auto" />
        <Skeleton className="h-6 w-48 mx-auto" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <p className="text-muted-foreground">Nie znaleziono profilu trenera.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!user && <PublicHeader />}
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <Avatar className="w-24 h-24 mx-auto">
            <AvatarImage src={profile.profileImageUrl ?? undefined} />
            <AvatarFallback className="text-2xl">
              {profile.firstName?.[0]}{profile.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <h1 className="font-heading font-bold text-3xl" data-testid="text-trainer-name">
            {profile.firstName} {profile.lastName}
          </h1>
          {profile.specialization && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Dumbbell className="w-4 h-4" />
              <span>{profile.specialization}</span>
            </div>
          )}
          {profile.averageRating !== null ? (
            <div className="flex items-center justify-center gap-2">
              <StarRow rating={Math.round(profile.averageRating)} />
              <span className="text-sm text-muted-foreground">
                {profile.averageRating} ({profile.reviewCount} {profile.reviewCount === 1 ? "opinia" : "opinii"})
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Brak jeszcze opinii</p>
          )}
        </div>

        {profile.bio && (
          <Card>
            <CardContent className="pt-6">
              <p className="whitespace-pre-line text-sm">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {canReview && (
          <Card data-testid="card-leave-review">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Zostaw opinię</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setMyRating(n)} data-testid={`button-rate-${n}`}>
                    <Star
                      size={28}
                      className={n <= myRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Opisz swoje doświadczenie ze współpracy (opcjonalnie)"
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                maxLength={1000}
                data-testid="input-review-comment"
              />
              <Button
                onClick={() => submitReviewMutation.mutate()}
                disabled={myRating === 0 || submitReviewMutation.isPending}
                data-testid="button-submit-review"
              >
                {submitReviewMutation.isPending ? "Zapisywanie..." : "Wyślij opinię"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="font-heading font-bold text-xl">Opinie</h2>
          {profile.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ten trener nie ma jeszcze opinii.</p>
          ) : (
            profile.reviews.map((review) => (
              <Card key={review.id} data-testid={`card-review-${review.id}`}>
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {review.clientFirstName ?? "Klient"} {review.clientLastInitial}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(review.createdAt), "d MMMM yyyy", { locale: pl })}
                    </span>
                  </div>
                  <StarRow rating={review.rating} size={14} />
                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
