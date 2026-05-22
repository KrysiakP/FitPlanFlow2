import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Pill, Heart, ArrowLeft, Mail, Phone, User, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams, useLocation } from "wouter";
import type { UserProfile } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";

const profileSchema = z.object({
  bio: z.string().optional(),
  profileImageUrl: z.string().optional().or(z.literal("")),
  phone: z.string().optional(),
  pharmacologicalSupport: z.string().max(2000, "Maksymalna długość to 2000 znaków").optional(),
  injuries: z.string().max(2000, "Maksymalna długość to 2000 znaków").optional(),
  healthIssues: z.string().max(2000, "Maksymalna długość to 2000 znaków").optional(),
  imageType: z.enum(["upload", "url"]).optional(),
  imageFile: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileData = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string | null;
    profileImageUrl: string | null;
    profileImageDisplayUrl: string | null;
  };
  profile: UserProfile | null;
};

export default function ClientProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const params = useParams<{ userId?: string }>();
  const [, navigate] = useLocation();

  const viewingOtherProfile = !!params.userId;
  const isOwnProfile = !params.userId || params.userId === user?.id;

  // FIX: ALWAYS fetch profile data (even for own profile)
  // Use single unified query that works for both own and other profiles
  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useQuery<ProfileData>({
    queryKey: params.userId ? ["/api/profile", params.userId] : ["/api/profile", user?.id],
    queryFn: async () => {
      // When viewing own profile (no params.userId), fetch using own user ID
      // When viewing other profile, fetch using params.userId
      const targetUserId = params.userId || user?.id;
      
      if (!targetUserId) {
        throw new Error("Brak ID użytkownika");
      }

      const response = await fetch(`/api/profile/${targetUserId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Brak dostępu do tego profilu");
        }
        throw new Error("Nie udało się pobrać profilu");
      }
      
      return await response.json();
    },
    enabled: !!user?.id, // Only fetch when we have a user ID
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      profileImageUrl: "",
      phone: "",
      pharmacologicalSupport: "",
      injuries: "",
      healthIssues: "",
    },
  });

  // FIX: Use complete profile data from unified query
  const displayUser = profileData?.user;
  const displayProfile = profileData?.profile;

  useEffect(() => {
    // Populate form when viewing own profile
    if (isOwnProfile && displayProfile) {
      profileForm.reset({
        bio: displayProfile.bio || "",
        profileImageUrl: displayProfile.profileImageUrl || "",
        phone: displayProfile.phone || "",
        pharmacologicalSupport: displayProfile.pharmacologicalSupport || "",
        injuries: displayProfile.injuries || "",
        healthIssues: displayProfile.healthIssues || "",
      });
    }
  }, [displayProfile, profileForm, isOwnProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const profileData = {
        bio: data.bio || null,
        profileImageUrl: data.profileImageUrl || null,
        phone: data.phone || null,
        pharmacologicalSupport: data.pharmacologicalSupport || null,
        injuries: data.injuries || null,
        healthIssues: data.healthIssues || null,
      };

      await apiRequest("PUT", "/api/profile", profileData);
      return profileData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profil zaktualizowany!",
        description: "Twoje zmiany zostały zapisane.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować profilu",
        variant: "destructive",
      });
    },
  });

  const onSubmitProfile = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancelProfile = () => {
    profileForm.reset();
    queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  const getRoleBadgeVariant = (role: string | null) => {
    if (role === "trainer") return "default";
    if (role === "client") return "secondary";
    return "outline";
  };

  const getRoleLabel = (role: string | null) => {
    if (role === "trainer") return "Trener";
    if (role === "client") return "Podopieczny";
    return "Użytkownik";
  };

  // Show loading when auth is loading, query is loading, or data not yet available
  if (authLoading || isLoading || (!profileData && !error)) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive" data-testid="alert-profile-error">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Błąd dostępu</AlertTitle>
          <AlertDescription>
            {error.message || "Nie udało się załadować profilu"}
          </AlertDescription>
        </Alert>
        <Button 
          asChild 
          variant="outline" 
          className="mt-4"
          data-testid="button-back-to-dashboard"
        >
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót do panelu
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Back navigation when viewing another user's profile */}
      {viewingOtherProfile && (
        <Button 
          asChild 
          variant="ghost" 
          className="gap-2"
          data-testid="button-back-navigation"
        >
          <Link href="/">
            <ArrowLeft className="w-4 h-4" />
            Powrót do panelu
          </Link>
        </Button>
      )}

      {/* TOP SECTION - READONLY PROFILE INFO */}
      <Card data-testid="card-profile-readonly">
        <CardHeader>
          <div className="flex items-start gap-6 flex-wrap">
            <Avatar className="w-24 h-24">
              <AvatarImage 
                src={displayUser?.profileImageDisplayUrl || displayUser?.profileImageUrl || undefined} 
                alt={`${displayUser?.firstName} ${displayUser?.lastName}`}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-2xl">
                {getInitials(displayUser?.firstName, displayUser?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="font-heading font-bold text-3xl" data-testid="text-profile-name">
                    {displayUser?.firstName} {displayUser?.lastName}
                  </h1>
                  <Badge variant={getRoleBadgeVariant(displayUser?.role || null)} data-testid="badge-role">
                    {getRoleLabel(displayUser?.role || null)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span data-testid="text-profile-email">{displayUser?.email}</span>
                </div>
              </div>

              {displayProfile?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span data-testid="text-profile-phone">{displayProfile.phone}</span>
                </div>
              )}

              {displayProfile?.bio && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">O mnie</p>
                  <p className="text-base whitespace-pre-wrap" data-testid="text-profile-bio">
                    {displayProfile.bio}
                  </p>
                </div>
              )}

              {displayProfile?.pharmacologicalSupport && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Wsparcie farmakologiczne</p>
                  </div>
                  <p className="text-base whitespace-pre-wrap" data-testid="text-profile-pharma">
                    {displayProfile.pharmacologicalSupport}
                  </p>
                </div>
              )}

              {displayProfile?.injuries && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Kontuzje</p>
                  </div>
                  <p className="text-base whitespace-pre-wrap" data-testid="text-profile-injuries">
                    {displayProfile.injuries}
                  </p>
                </div>
              )}

              {displayProfile?.healthIssues && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Problemy zdrowotne</p>
                  </div>
                  <p className="text-base whitespace-pre-wrap" data-testid="text-profile-health">
                    {displayProfile.healthIssues}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* BOTTOM SECTION - EDITABLE (ONLY FOR OWN PROFILE) */}
      {isOwnProfile && (
        <>
          <Separator />
          
          <div className="space-y-6">
            <div>
              <h2 className="font-heading font-bold text-2xl mb-2" data-testid="text-edit-profile-title">
                Edytuj profil
              </h2>
              <p className="text-muted-foreground">
                Zarządzaj swoimi danymi osobowymi i informacjami zdrowotnymi
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Dane profilowe</CardTitle>
                <CardDescription>Zaktualizuj swoje informacje kontaktowe i medyczne</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>O mnie</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Napisz coś o sobie, swoich celach treningowych..."
                                className="resize-none min-h-32"
                                {...field}
                                data-testid="textarea-bio"
                              />
                            </FormControl>
                            <FormDescription>
                              Ta informacja będzie widoczna dla Twojego trenera
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+48 123 456 789"
                                {...field}
                                data-testid="input-phone"
                              />
                            </FormControl>
                            <FormDescription>
                              Numer telefonu kontaktowego
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="pharmacologicalSupport"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Pill className="w-4 h-4" />
                              Wsparcie farmakologiczne/Suplementacja
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Wymień przyjmowane leki, suplementy, ich dawkowanie i częstotliwość..."
                                className="resize-none min-h-32"
                                {...field}
                                data-testid="textarea-pharmacological-support"
                              />
                            </FormControl>
                            <FormDescription>
                              Informacje o przyjmowanych lekach i suplementach (opcjonalnie, max 2000 znaków)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="injuries"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Heart className="w-4 h-4" />
                              Kontuzje i urazy
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Wymień przebyte kontuzje, urazy, dolegliwości kostno-stawowe..."
                                className="resize-none min-h-32"
                                {...field}
                                data-testid="textarea-injuries"
                              />
                            </FormControl>
                            <FormDescription>
                              Informacje o kontuzjach i urazach (opcjonalnie, max 2000 znaków)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="healthIssues"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Heart className="w-4 h-4" />
                              Problemy zdrowotne
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Alergie, choroby przewlekłe, problemy zdrowotne..."
                                className="resize-none min-h-32"
                                {...field}
                                data-testid="textarea-health-issues"
                              />
                            </FormControl>
                            <FormDescription>
                              Informacje o problemach zdrowotnych, alergiach, chorobach przewlekłych (opcjonalnie, max 2000 znaków)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => profileForm.reset()}
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-cancel"
                      >
                        Anuluj
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

          <Card className="border-destructive/40 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Strefa niebezpieczna
              </CardTitle>
              <CardDescription>
                Trwałe usunięcie konta i wszystkich powiązanych danych
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="destructive" size="sm">
                <Link href="/delete-account">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Usuń konto i dane
                </Link>
              </Button>
            </CardContent>
          </Card>

          </div>
        </>
      )}
    </div>
  );
}
