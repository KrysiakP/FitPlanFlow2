import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertWeeklyReportSchema, type WeeklyReport, type InsertWeeklyReportInput } from "@shared/schema";
import { Calendar as CalendarIcon, Upload, FileImage, TrendingUp, Activity } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";
// Object Storage uploader - code adapted from javascript_object_storage blueprint
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

export default function WeeklyReport() {
  const { toast } = useToast();
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>("");
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  const form = useForm<InsertWeeklyReportInput>({
    resolver: zodResolver(insertWeeklyReportSchema),
    defaultValues: {
      reportDate: new Date(),
      weight: "",
      saturation: "",
      chest: "",
      waist: "",
      hips: "",
      arm: "",
      leg: "",
      cardio: "",
      supplements: "",
      mood: "",
      thoughts: "",
      photoUrl: "",
    },
  });

  const { data: reports, isLoading } = useQuery<WeeklyReport[]>({
    queryKey: ["/api/reports"],
  });

  const createReportMutation = useMutation({
    mutationFn: async (data: InsertWeeklyReportInput) => {
      // First create the report without photo
      const report: any = await apiRequest("POST", "/api/reports", {
        ...data,
        photoUrl: "", // Will be updated separately if there's an uploaded photo
      });
      
      // If there's an uploaded photo, update the report with it
      if (uploadedPhotoUrl && report.id) {
        const photoResponse: any = await apiRequest("PUT", `/api/weekly-reports/${report.id}/photos`, {
          photoUrl: uploadedPhotoUrl,
        });
        // Update the report with the normalized object path
        report.photoUrl = photoResponse.objectPath;
      }
      
      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Raport zapisany!",
        description: "Twój cotygodniowy raport został pomyślnie zapisany.",
      });
      form.reset();
      setUploadedPhotoUrl("");
      setCurrentReportId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zapisać raportu.",
        variant: "destructive",
      });
    },
  });

  // Object Storage upload handlers - code adapted from javascript_object_storage blueprint
  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error("Failed to get upload URL");
    }
    
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadURL = uploadedFile.uploadURL;
      
      if (uploadURL) {
        setUploadedPhotoUrl(uploadURL);
        form.setValue("photoUrl", uploadURL);
        toast({
          title: "Zdjęcie przesłane!",
          description: "Zdjęcie zostało pomyślnie przesłane.",
        });
      }
    }
  };

  const onSubmit = (data: InsertWeeklyReportInput) => {
    createReportMutation.mutate(data);
  };

  const sortedReports = reports
    ? [...reports].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
    : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2">Cotygodniowy Raport</h1>
        <p className="text-muted-foreground">
          Wypełnij swój cotygodniowy raport postępów, aby śledzić swoje wyniki
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Nowy Raport
          </CardTitle>
          <CardDescription>
            Wypełnij wszystkie pola, aby stworzyć kompletny raport tygodniowy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="reportDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data raportu</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-report-date"
                          >
                            <CalendarIcon className="w-4 h-4" />
                            {field.value ? (
                              format(field.value, "PPP", { locale: pl })
                            ) : (
                              <span>Wybierz datę</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          data-testid="calendar-report-date"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Waga (np. "75.5kg")</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="75.5kg"
                          data-testid="input-weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="saturation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poziom nasycenia</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="np. dobry, średni, niski"
                          data-testid="input-saturation"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Pomiary (w cm)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="chest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Klatka</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="np. 100"
                            data-testid="input-chest"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="waist"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Talia</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="np. 80"
                            data-testid="input-waist"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hips"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biodro</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="np. 95"
                            data-testid="input-hips"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="arm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ramię</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="np. 35"
                            data-testid="input-arm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Udo/łydka</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="np. 55"
                            data-testid="input-leg"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cardio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cardio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Opisz swoje aktywności cardio..."
                          rows={4}
                          data-testid="textarea-cardio"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suplementacja</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Jakie suplementy przyjmujesz..."
                          rows={4}
                          data-testid="textarea-supplements"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Samopoczucie</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Jak się czujesz..."
                          rows={4}
                          data-testid="textarea-mood"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thoughts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ogólne przemyślenia</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Twoje przemyślenia o tym tygodniu..."
                          rows={4}
                          data-testid="textarea-thoughts"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zdjęcie raportowe sylwetki</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10485760}
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                          buttonClassName="w-full md:w-auto"
                        >
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            <span>Wybierz zdjęcie</span>
                          </div>
                        </ObjectUploader>
                        {uploadedPhotoUrl && (
                          <div className="relative w-full max-w-md">
                            <img
                              src={uploadedPhotoUrl}
                              alt="Zdjęcie raportowe"
                              className="rounded-md border w-full h-auto"
                              data-testid="img-uploaded-photo"
                            />
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <FileImage className="w-4 h-4" />
                              <span>Zdjęcie przesłane pomyślnie</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={createReportMutation.isPending}
                className="w-full md:w-auto"
                data-testid="button-submit-report"
              >
                {createReportMutation.isPending ? "Zapisywanie..." : "Zapisz raport"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-heading font-bold text-3xl mb-4">Wcześniejsze Raporty</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : sortedReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedReports.map((report) => (
              <Card key={report.id} data-testid={`card-report-${report.id}`}>
                <CardHeader>
                  <CardTitle className="font-heading flex items-center justify-between">
                    <span>Raport z {format(new Date(report.reportDate), "d MMMM yyyy", { locale: pl })}</span>
                    {report.weight && (
                      <span className="text-lg text-primary" data-testid={`text-report-weight-${report.id}`}>
                        {report.weight}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {report.photoUrl && (
                    <div className="w-full">
                      <img
                        src={report.photoUrl}
                        alt={`Raport z ${format(new Date(report.reportDate), "d MMMM yyyy", { locale: pl })}`}
                        className="rounded-md border w-full h-auto"
                        data-testid={`img-report-photo-${report.id}`}
                      />
                    </div>
                  )}
                  
                  {(report.chest || report.waist || report.hips || report.arm || report.leg) && (
                    <div>
                      <h4 className="font-heading font-medium text-sm mb-2">Pomiary (cm):</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {report.chest && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Klatka:</span>
                            <span data-testid={`text-report-chest-${report.id}`}>{report.chest}</span>
                          </div>
                        )}
                        {report.waist && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Talia:</span>
                            <span data-testid={`text-report-waist-${report.id}`}>{report.waist}</span>
                          </div>
                        )}
                        {report.hips && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Biodro:</span>
                            <span data-testid={`text-report-hips-${report.id}`}>{report.hips}</span>
                          </div>
                        )}
                        {report.arm && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ramię:</span>
                            <span data-testid={`text-report-arm-${report.id}`}>{report.arm}</span>
                          </div>
                        )}
                        {report.leg && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Udo/łydka:</span>
                            <span data-testid={`text-report-leg-${report.id}`}>{report.leg}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {report.saturation && (
                    <div>
                      <h4 className="font-heading font-medium text-sm mb-1">Poziom nasycenia:</h4>
                      <p className="text-sm" data-testid={`text-report-saturation-${report.id}`}>{report.saturation}</p>
                    </div>
                  )}

                  {report.cardio && (
                    <div>
                      <h4 className="font-heading font-medium text-sm mb-1">Cardio:</h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-report-cardio-${report.id}`}>{report.cardio}</p>
                    </div>
                  )}

                  {report.supplements && (
                    <div>
                      <h4 className="font-heading font-medium text-sm mb-1">Suplementacja:</h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-report-supplements-${report.id}`}>{report.supplements}</p>
                    </div>
                  )}

                  {report.mood && (
                    <div>
                      <h4 className="font-heading font-medium text-sm mb-1">Samopoczucie:</h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-report-mood-${report.id}`}>{report.mood}</p>
                    </div>
                  )}

                  {report.thoughts && (
                    <div>
                      <h4 className="font-heading font-medium text-sm mb-1">Ogólne przemyślenia:</h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-report-thoughts-${report.id}`}>{report.thoughts}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nie masz jeszcze żadnych raportów</p>
              <p className="text-sm text-muted-foreground mt-2">Wypełnij formularz powyżej, aby stworzyć swój pierwszy raport</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
