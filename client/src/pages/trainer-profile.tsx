import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Upload, User, Crown, CreditCard, Gift, ArrowLeft, Mail, Phone, Briefcase } from "lucide-react";
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
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

const profileSchema = z.object({
  bio: z.string().optional(),
  profileImageUrl: z.string().optional().or(z.literal("")),
  phone: z.string().optional(),
  specialization: z.string().optional(),
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

export default function TrainerProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const params = useParams<{ userId?: string }>();
  const [, navigate] = useLocation();
  const [imageType, setImageType] = useState<"upload" | "url">("url");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>("");
  const [objectPath, setObjectPath] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");

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

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      profileImageUrl: "",
      phone: "",
      specialization: "",
    },
  });

  // FIX: Use complete profile data from unified query
  const displayUser = profileData?.user;
  const displayProfile = profileData?.profile;

  useEffect(() => {
    // Populate form when viewing own profile
    if (isOwnProfile && displayProfile) {
      form.reset({
        bio: displayProfile.bio || "",
        profileImageUrl: displayProfile.profileImageUrl || "",
        phone: displayProfile.phone || "",
        specialization: displayProfile.specialization || "",
      });
    }
  }, [displayProfile, form, isOwnProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      let imageUrl = data.profileImageUrl;

      if (uploadedPhotoUrl) {
        const photoResponse: any = await apiRequest("PUT", "/api/profile/photo", {
          photoUrl: uploadedPhotoUrl,
        });
        data.profileImageUrl = photoResponse.objectPath;
        setPreviewImage(photoResponse.publicUrl);
        imageUrl = photoResponse.objectPath;
      }

      const profileData = {
        bio: data.bio || null,
        profileImageUrl: imageUrl || null,
        phone: data.phone || null,
        specialization: data.specialization || null,
      };

      await apiRequest("PUT", "/api/profile", profileData);
      return profileData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setUploadedPhotoUrl("");
      setImageType("url");
      toast({
        title: "Profil zaktualizowany!",
        description: "Twoje zmiany zostały zapisane.",
      });
    },
    onError: (error: Error) => {
      setUploadProgress(false);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować profilu",
        variant: "destructive",
      });
    },
  });

  const subscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/portal", {});
      return await response.json() as { url: string };
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się otworzyć portalu subskrypcji",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error("Failed to get upload URL");
    }
    
    const data = await response.json();
    
    setObjectPath(data.objectPath);
    setPreviewUrl(data.previewUrl);
    
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0 && previewUrl) {
      setUploadedPhotoUrl(previewUrl);
      setPreviewImage(previewUrl);
      toast({
        title: "Zdjęcie przesłane!",
        description: "Zapisz profil aby dodać zdjęcie.",
      });
    }
  };

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    setUploadedPhotoUrl("");
    setObjectPath("");
    setPreviewUrl("");
    setImageType("url");
    // Use USER auth state (stable) not PROFILE query (stale)
    setPreviewImage(user?.profileImageDisplayUrl || user?.profileImageUrl || null);
    // Trigger profile refetch to sync
    queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Plik za duży",
          description: "Maksymalny rozmiar pliku to 5MB",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
          data-testid="button-back-to-clients"
        >
          <Link href="/clients">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót do listy podopiecznych
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
          <Link href="/clients">
            <ArrowLeft className="w-4 h-4" />
            Powrót do listy podopiecznych
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

              {displayProfile?.specialization && (
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Specjalizacja</p>
                    <p className="text-base" data-testid="text-profile-specialization">{displayProfile.specialization}</p>
                  </div>
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
                Zarządzaj swoimi danymi osobowymi i informacjami profilowymi
              </p>
            </div>

            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info" data-testid="tab-info">Informacje</TabsTrigger>
                <TabsTrigger value="subscription" data-testid="tab-subscription">Subskrypcja</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dane profilowe</CardTitle>
                    <CardDescription>Zaktualizuj swoje dane osobowe i informacje kontaktowe</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Zdjęcie profilowe</label>
                            <div className="space-y-4">
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  type="button"
                                  variant={imageType === "upload" ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setImageType("upload")}
                                  data-testid="button-upload-option"
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Prześlij plik
                                </Button>
                                <Button
                                  type="button"
                                  variant={imageType === "url" ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setImageType("url")}
                                  data-testid="button-url-option"
                                >
                                  Link URL
                                </Button>
                              </div>

                              {imageType === "upload" ? (
                                <ObjectUploader
                                  maxNumberOfFiles={1}
                                  maxFileSize={5242880}
                                  onGetUploadParameters={handleGetUploadParameters}
                                  onComplete={handleUploadComplete}
                                  buttonClassName="w-full md:w-auto"
                                >
                                  <div className="flex items-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    <span>Wybierz zdjęcie</span>
                                  </div>
                                </ObjectUploader>
                              ) : (
                                <FormField
                                  control={form.control}
                                  name="profileImageUrl"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          placeholder="https://example.com/image.jpg"
                                          {...field}
                                          data-testid="input-profile-image-url"
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Wprowadź adres URL zdjęcia profilowego
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}

                              {(previewUrl || form.watch("profileImageUrl")) && (
                                <div className="flex items-center gap-4">
                                  <Avatar className="w-20 h-20">
                                    <AvatarImage src={previewUrl || form.watch("profileImageUrl")} alt="Podgląd" />
                                    <AvatarFallback>
                                      <User className="w-10 h-10" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <p className="text-sm text-muted-foreground">Podgląd zdjęcia profilowego</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>O mnie</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Opowiedz o sobie, swoim doświadczeniu i osiągnięciach..."
                                    className="resize-none min-h-32"
                                    {...field}
                                    data-testid="textarea-bio"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Ta informacja będzie widoczna dla Twoich podopiecznych
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
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
                            control={form.control}
                            name="specialization"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Specjalizacja</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="np. Trening siłowy, kulturystyka, fitness"
                                    {...field}
                                    data-testid="input-specialization"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Twoja specjalizacja treningowa
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
                            onClick={() => form.reset()}
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
              </TabsContent>

              <TabsContent value="subscription" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-primary" />
                      Status subskrypcji
                    </CardTitle>
                    <CardDescription>Zarządzaj swoją subskrypcją i płatnościami</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-4 p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium" data-testid="text-subscription-tier">
                          Plan: {user?.subscriptionTier?.toUpperCase() || "START"}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid="text-subscription-status">
                          Status: {user?.subscriptionStatus === "active" ? "Aktywny" : user?.subscriptionStatus || "Brak subskrypcji"}
                        </p>
                      </div>
                      <Button
                        onClick={() => subscriptionMutation.mutate()}
                        disabled={subscriptionMutation.isPending}
                        data-testid="button-manage-subscription"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {subscriptionMutation.isPending ? "Ładowanie..." : "Zarządzaj subskrypcją"}
                      </Button>
                    </div>

                    <Alert>
                      <Gift className="w-4 h-4" />
                      <AlertTitle>Program poleceń</AlertTitle>
                      <AlertDescription>
                        Poleć swoim znajomym i otrzymaj darmowy miesiąc subskrypcji!
                        <Button asChild variant="ghost" className="p-0 h-auto ml-1 text-primary underline-offset-4 hover:underline" data-testid="link-referrals">
                          <Link href="/referrals">
                            Zobacz szczegóły
                          </Link>
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}
