import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Upload, Pill, Heart } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  profileImageUrl: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  pharmacologicalSupport: z.string().max(2000, "Maksymalna długość to 2000 znaków").optional(),
  injuries: z.string().max(2000, "Maksymalna długość to 2000 znaków").optional(),
  healthIssues: z.string().max(2000, "Maksymalna długość to 2000 znaków").optional(),
  imageType: z.enum(["upload", "url"]).optional(),
  imageFile: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ClientProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [imageType, setImageType] = useState<"upload" | "url">("url");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
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

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        bio: profile.bio || "",
        profileImageUrl: profile.profileImageUrl || "",
        phone: profile.phone || "",
        pharmacologicalSupport: profile.pharmacologicalSupport || "",
        injuries: profile.injuries || "",
        healthIssues: profile.healthIssues || "",
      });
    }
  }, [profile, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      let imageUrl = data.profileImageUrl;

      if (imageType === "upload" && data.imageFile && data.imageFile[0]) {
        setUploadProgress(true);
        const formData = new FormData();
        formData.append("file", data.imageFile[0]);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || "Nie udało się przesłać pliku");
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
        setUploadProgress(false);
      }

      const profileData = {
        bio: data.bio || null,
        profileImageUrl: imageUrl || null,
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
        title: "Profil zaktualizowany",
        description: "Twój profil został pomyślnie zaktualizowany",
      });
      setPreviewImage(null);
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

  const onSubmitProfile = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancelProfile = () => {
    profileForm.reset();
    setPreviewImage(null);
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
    return (first + last).toUpperCase() || "U";
  };

  const getCurrentImageUrl = () => {
    if (previewImage) return previewImage;
    if (imageType === "url" && profileForm.watch("profileImageUrl")) {
      return profileForm.watch("profileImageUrl");
    }
    return profile?.profileImageUrl || user?.profileImageUrl || null;
  };

  if (isLoadingProfile) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2">Mój profil</h1>
          <p className="text-muted-foreground">
            Zarządzaj swoim profilem osobistym
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Błąd</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Nie udało się załadować profilu</span>
            <Button variant="outline" size="sm" onClick={() => refetchProfile()}>
              Spróbuj ponownie
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-profile-title">
          Mój profil
        </h1>
        <p className="text-muted-foreground">
          Zarządzaj swoim profilem osobistym
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Dane osobowe</CardTitle>
          <CardDescription>
            Zaktualizuj swoje informacje kontaktowe i opis profilu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={getCurrentImageUrl() || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {getInitials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-muted-foreground text-center">
                    Podgląd zdjęcia profilowego
                  </p>
                </div>

                <div className="flex-1 space-y-4">
                  <FormLabel>Zdjęcie profilowe</FormLabel>
                  <Tabs value={imageType} onValueChange={(v) => setImageType(v as "upload" | "url")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url">URL</TabsTrigger>
                      <TabsTrigger value="upload">Upload</TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="space-y-4">
                      <FormField
                        control={profileForm.control}
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
                              Wklej URL zdjęcia profilowego
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="upload" className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="imageFile"
                        render={({ field: { onChange, value, ...field } }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    onChange(e.target.files);
                                    handleImageFileChange(e);
                                  }}
                                  {...field}
                                  data-testid="input-profile-image-upload"
                                />
                                <Upload className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Maksymalny rozmiar: 5MB. Dozwolone formaty: JPG, PNG, WEBP
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <FormField
                control={profileForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O mnie</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Napisz coś o sobie, swoich celach treningowych..."
                        rows={5}
                        {...field}
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormDescription>
                      Opis będzie widoczny dla Twojego trenera
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
                    <FormLabel>Telefon kontaktowy</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+48 123 456 789"
                        {...field}
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormDescription>
                      Numer telefonu kontaktowego (opcjonalnie)
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
                        rows={4}
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
                        rows={4}
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
                        rows={4}
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

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending || uploadProgress}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending || uploadProgress
                    ? "Zapisywanie..."
                    : "Zapisz zmiany"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelProfile}
                  disabled={updateProfileMutation.isPending || uploadProgress}
                  data-testid="button-cancel"
                >
                  Anuluj
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
