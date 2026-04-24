import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCharityDonationSchema, type CharityDonation, type InsertCharityDonationInput } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Trash2, ExternalLink, FileText, Calendar } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const MONTHS_PL = [
  { value: 1, label: "Styczeń" },
  { value: 2, label: "Luty" },
  { value: 3, label: "Marzec" },
  { value: 4, label: "Kwiecień" },
  { value: 5, label: "Maj" },
  { value: 6, label: "Czerwiec" },
  { value: 7, label: "Lipiec" },
  { value: 8, label: "Sierpień" },
  { value: 9, label: "Wrzesień" },
  { value: 10, label: "Październik" },
  { value: 11, label: "Listopad" },
  { value: 12, label: "Grudzień" },
];

export default function AdminCharityDonations() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDocumentUrl, setUploadedDocumentUrl] = useState<string>("");

  const form = useForm<InsertCharityDonationInput>({
    resolver: zodResolver(insertCharityDonationSchema),
    defaultValues: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      documentUrl: "",
    },
  });

  const { data: donations, isLoading: donationsLoading } = useQuery<CharityDonation[]>({
    queryKey: ["/api/charity-donations"],
    enabled: !!user?.isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCharityDonationInput) => {
      const response = await apiRequest("POST", "/api/admin/charity-donations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charity-donations"] });
      toast({
        title: "Sukces",
        description: "Potwierdzenie donacji zostało dodane",
      });
      form.reset({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        documentUrl: "",
      });
      setSelectedFile(null);
      setUploadedDocumentUrl("");
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/charity-donations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charity-donations"] });
      toast({
        title: "Sukces",
        description: "Potwierdzenie donacji zostało usunięte",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Błąd",
        description: "Dozwolone są tylko pliki PDF, JPG i PNG",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Błąd podczas uploadu pliku");
      }

      const data = await response.json();
      setUploadedDocumentUrl(data.url);
      
      toast({
        title: "Sukces",
        description: "Plik wgrano pomyślnie",
      });
    } catch (error) {
      toast({
        title: "Błąd",
        description: error instanceof Error ? error.message : "Błąd podczas uploadu pliku",
        variant: "destructive",
      });
      setSelectedFile(null);
      setUploadedDocumentUrl("");
    } finally {
      setUploadingFile(false);
    }
  };

  const onSubmit = (data: InsertCharityDonationInput) => {
    if (!uploadedDocumentUrl) {
      toast({
        title: "Błąd",
        description: "Proszę wybrać plik",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      ...data,
      documentUrl: uploadedDocumentUrl,
    });
  };

  const getMonthName = (month: number) => {
    return MONTHS_PL.find(m => m.value === month)?.label || month.toString();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <p className="text-destructive font-medium">Brak dostępu</p>
            <p className="text-sm text-muted-foreground mt-2">
              Ta strona jest dostępna tylko dla administratorów platformy.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-page-title">
          Donacje charytatywne
        </h1>
        <p className="text-muted-foreground">
          Dodawaj miesięczne potwierdzenia donacji na cele charytatywne
        </p>
      </div>

      <Card data-testid="card-upload-form">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Dodaj nowe potwierdzenie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Miesiąc</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-month">
                            <SelectValue placeholder="Wybierz miesiąc" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MONTHS_PL.map((month) => (
                            <SelectItem
                              key={month.value}
                              value={month.value.toString()}
                              data-testid={`select-month-option-${month.value}`}
                            >
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rok</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={2024}
                          max={2100}
                          placeholder="2024"
                          data-testid="input-year"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="documentUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dokument potwierdzający (PDF/JPG/PNG)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileSelect}
                          disabled={uploadingFile || createMutation.isPending}
                          data-testid="input-file"
                        />
                        {selectedFile && (
                          <p className="text-sm text-muted-foreground" data-testid="text-selected-file">
                            Wybrany plik: {selectedFile.name}
                          </p>
                        )}
                        {uploadingFile && (
                          <p className="text-sm text-muted-foreground" data-testid="text-uploading">
                            Przesyłanie pliku...
                          </p>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    <input type="hidden" {...field} />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={uploadingFile || createMutation.isPending || !uploadedDocumentUrl}
                className="w-full"
                data-testid="button-submit"
              >
                {createMutation.isPending ? "Dodawanie..." : "Dodaj potwierdzenie"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-heading font-semibold text-2xl mb-4" data-testid="text-donations-list-title">
          Istniejące potwierdzenia
        </h2>
        
        {donationsLoading ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">
            Ładowanie...
          </div>
        ) : donations && donations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {donations.map((donation) => (
              <Card key={donation.id} data-testid={`card-donation-${donation.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium" data-testid={`text-donation-date-${donation.id}`}>
                          {getMonthName(donation.month)} {donation.year}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={donation.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                          data-testid={`link-document-${donation.id}`}
                        >
                          Zobacz dokument
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground" data-testid={`text-uploaded-at-${donation.id}`}>
                        Dodano: {format(new Date(donation.uploadedAt), "d MMMM yyyy, HH:mm", { locale: pl })}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteMutation.mutate(donation.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${donation.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground" data-testid="text-no-donations">
              Brak dodanych potwierdzeń donacji
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
