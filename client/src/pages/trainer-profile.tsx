import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Upload, User, Crown, CreditCard } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
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
  specialization: z.string().optional(),
  imageType: z.enum(["upload", "url"]).optional(),
  imageFile: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function TrainerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [imageType, setImageType] = useState<"upload" | "url">("url");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
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

  useEffect(() => {
    if (profile) {
      form.reset({
        bio: profile.bio || "",
        profileImageUrl: profile.profileImageUrl || "",
        phone: profile.phone || "",
        specialization: profile.specialization || "",
      });
    }
  }, [profile, form]);

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
        specialization: data.specialization || null,
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

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
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
    if (imageType === "url" && form.watch("profileImageUrl")) {
      return form.watch("profileImageUrl");
    }
    return profile?.profileImageUrl || user?.profileImageUrl || null;
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
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2">Mój profil</h1>
          <p className="text-muted-foreground">
            Zarządzaj swoimi danymi kontaktowymi i informacjami o sobie
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Błąd</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Nie udało się załadować profilu</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Spróbuj ponownie
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

  const isPremium = user?.subscriptionTier === "premium" && user?.subscriptionStatus === "active";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-profile-title">
          Mój profil
        </h1>
        <p className="text-muted-foreground">
          Zarządzaj swoimi danymi kontaktowymi i informacjami o sobie
        </p>
      </div>

      {user?.role === "trainer" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Subskrypcja
                </CardTitle>
                <CardDescription>Zarządzaj swoim planem i płatnościami</CardDescription>
              </div>
              <Badge variant={isPremium ? "default" : "secondary"} data-testid="badge-subscription-tier">
                {isPremium ? "Premium" : "Free"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isPremium ? "Plan Premium" : "Plan Free"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPremium 
                    ? "Nieograniczona liczba podopiecznych" 
                    : "Limit: 10 podopiecznych"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {isPremium ? "49 zł" : "0 zł"}
                </p>
                <p className="text-xs text-muted-foreground">/miesiąc</p>
              </div>
            </div>

            <div className="flex gap-3">
              {!isPremium ? (
                <Link href="/pricing">
                  <Button className="flex-1" data-testid="button-upgrade-to-premium">
                    <Crown className="w-4 h-4 mr-2" />
                    Ulepsz do Premium
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => subscriptionMutation.mutate()}
                  disabled={subscriptionMutation.isPending}
                  data-testid="button-manage-subscription"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {subscriptionMutation.isPending ? "Ładowanie..." : "Zarządzaj subskrypcją"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dane profilu</CardTitle>
          <CardDescription>
            Zaktualizuj swoje informacje kontaktowe i opis profilu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                              Wklej URL zdjęcia profilowego
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="upload" className="space-y-4">
                      <FormField
                        control={form.control}
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
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O mnie</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Napisz coś o sobie, swoim doświadczeniu i podejściu do treningu..."
                        rows={5}
                        {...field}
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormDescription>
                      Opis będzie widoczny dla Twoich podopiecznych
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

              {user?.role === "trainer" && (
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specjalizacja</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="np. Trening siłowy, CrossFit, Yoga"
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
              )}

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
                  onClick={handleCancel}
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
