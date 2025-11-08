import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Upload, User, TrendingUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, ClientProgress } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";

const profileSchema = z.object({
  bio: z.string().optional(),
  profileImageUrl: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  imageType: z.enum(["upload", "url"]).optional(),
  imageFile: z.any().optional(),
});

const progressSchema = z.object({
  weight: z.string().optional(),
  height: z.string().optional(),
  goal: z.string().optional(),
  mood: z.string().optional(),
  completedWorkouts: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type ProgressFormValues = z.infer<typeof progressSchema>;

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

  const {
    data: progress,
    isLoading: isLoadingProgress,
    error: progressError,
    refetch: refetchProgress,
  } = useQuery<ClientProgress | null>({
    queryKey: ["/api/client/progress"],
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      profileImageUrl: "",
      phone: "",
    },
  });

  const progressForm = useForm<ProgressFormValues>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      weight: "",
      height: "",
      goal: "",
      mood: "",
      completedWorkouts: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        bio: profile.bio || "",
        profileImageUrl: profile.profileImageUrl || "",
        phone: profile.phone || "",
      });
    }
  }, [profile, profileForm]);

  useEffect(() => {
    if (progress) {
      progressForm.reset({
        weight: progress.weight || "",
        height: progress.height || "",
        goal: progress.goal || "",
        mood: progress.mood || "",
        completedWorkouts: progress.completedWorkouts || 0,
        notes: progress.notes || "",
      });
    }
  }, [progress, progressForm]);

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

  const updateProgressMutation = useMutation({
    mutationFn: async (data: ProgressFormValues) => {
      const progressData = {
        weight: data.weight || null,
        height: data.height || null,
        goal: data.goal || null,
        mood: data.mood || null,
        completedWorkouts: data.completedWorkouts,
        notes: data.notes || null,
      };

      await apiRequest("PUT", "/api/client/progress", progressData);
      return progressData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/progress"] });
      toast({
        title: "Postępy zaktualizowane",
        description: "Twoje postępy zostały pomyślnie zapisane",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować postępów",
        variant: "destructive",
      });
    },
  });

  const onSubmitProfile = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitProgress = (data: ProgressFormValues) => {
    updateProgressMutation.mutate(data);
  };

  const handleCancelProfile = () => {
    profileForm.reset();
    setPreviewImage(null);
  };

  const handleCancelProgress = () => {
    progressForm.reset();
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

  if (isLoadingProfile || isLoadingProgress) {
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

  if (profileError || progressError) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2">Mój profil</h1>
          <p className="text-muted-foreground">
            Zarządzaj swoim profilem i śledź swoje postępy
          </p>
        </div>
        {profileError && (
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
        )}
        {progressError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Błąd</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Nie udało się załadować postępów</span>
              <Button variant="outline" size="sm" onClick={() => refetchProgress()}>
                Spróbuj ponownie
              </Button>
            </AlertDescription>
          </Alert>
        )}
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
          Zarządzaj swoim profilem i śledź swoje postępy
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

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Moje postępy</CardTitle>
          </div>
          <CardDescription>
            Śledź swoje postępy treningowe i cele
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...progressForm}>
            <form onSubmit={progressForm.handleSubmit(onSubmitProgress)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={progressForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Waga</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="np. 75kg"
                          {...field}
                          data-testid="input-weight"
                        />
                      </FormControl>
                      <FormDescription>
                        Twoja aktualna waga
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={progressForm.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wzrost</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="np. 180cm"
                          {...field}
                          data-testid="input-height"
                        />
                      </FormControl>
                      <FormDescription>
                        Twój wzrost
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={progressForm.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cel treningowy</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Opisz swój cel treningowy, np. schudnąć 5kg, zbudować masę mięśniową..."
                        rows={4}
                        {...field}
                        data-testid="input-goal"
                      />
                    </FormControl>
                    <FormDescription>
                      Twój główny cel treningowy
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={progressForm.control}
                  name="mood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Samopoczucie</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="input-mood">
                            <SelectValue placeholder="Wybierz samopoczucie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Świetne">Świetne</SelectItem>
                          <SelectItem value="Dobre">Dobre</SelectItem>
                          <SelectItem value="Średnie">Średnie</SelectItem>
                          <SelectItem value="Słabe">Słabe</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Jak się dzisiaj czujesz?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={progressForm.control}
                  name="completedWorkouts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Liczba ukończonych treningów</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          data-testid="input-completed-workouts"
                        />
                      </FormControl>
                      <FormDescription>
                        Ile treningów już ukończyłeś?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={progressForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notatki motywacyjne</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Zapisz swoje myśli, sukcesy, wyzwania..."
                        rows={4}
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormDescription>
                      Twoje osobiste notatki i refleksje
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={updateProgressMutation.isPending}
                  data-testid="button-save-progress"
                >
                  {updateProgressMutation.isPending
                    ? "Zapisywanie..."
                    : "Zapisz postępy"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelProgress}
                  disabled={updateProgressMutation.isPending}
                  data-testid="button-cancel-progress"
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
