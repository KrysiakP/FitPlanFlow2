import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, FileText, Calendar, Activity, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertMedicalTestSchema, type MedicalTest, type MedicalTestAttachment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

const testTypeLabels: Record<string, string> = {
  blood: "Badanie krwi",
  hormone: "Badanie hormonalne",
  cardio: "Badanie kardiologiczne",
  other: "Inne",
};

const testTypeColors: Record<string, "default" | "secondary" | "outline"> = {
  blood: "default",
  hormone: "secondary",
  cardio: "outline",
  other: "outline",
};

const formSchema = insertMedicalTestSchema.extend({
  testDate: z.date(),
  attachments: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

async function uploadFileToStorage(file: File): Promise<MedicalTestAttachment> {
  const uploadResponse = await apiRequest("POST", "/api/objects/upload", {});
  const uploadData = await uploadResponse.json();
  const { uploadURL, objectPath } = uploadData;
  
  await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });
  
  return {
    id: crypto.randomUUID(),
    name: file.name,
    url: objectPath,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
}

export default function ClientMedicalTests() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<MedicalTest | null>(null);

  const { data: tests, isLoading } = useQuery<MedicalTest[]>({
    queryKey: ["/api/medical-tests"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      testName: "",
      testType: "blood",
      testDate: new Date(),
      orderingProvider: "",
      resultValue: "",
      unit: "",
      referenceRange: "",
      notes: "",
      attachments: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // CONVERT FileList to structured attachments array
      const attachments = data.attachments 
        ? await Promise.all(
            Array.from(data.attachments).map(async (file) => {
              const uploaded = await uploadFileToStorage(file);
              return uploaded;
            })
          )
        : [];

      const payload = {
        ...data,
        testDate: data.testDate.toISOString(),
        attachments: attachments
      };

      return await apiRequest("POST", "/api/medical-tests", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-tests"] });
      toast({
        title: "Sukces",
        description: "Badanie zostało dodane",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się dodać badania",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
      // Preserve existing attachments if no new files
      let attachments = editingTest?.attachments || [];
      
      if (data.attachments && data.attachments.length > 0) {
        // New files uploaded - convert them
        attachments = await Promise.all(
          Array.from(data.attachments).map(async (file) => {
            const uploaded = await uploadFileToStorage(file);
            return uploaded;
          })
        );
      }

      const payload = {
        ...data,
        testDate: data.testDate?.toISOString(),
        attachments: attachments
      };

      return await apiRequest("PUT", `/api/medical-tests/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-tests"] });
      toast({
        title: "Sukces",
        description: "Badanie zostało zaktualizowane",
      });
      setIsDialogOpen(false);
      setEditingTest(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować badania",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/medical-tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-tests"] });
      toast({
        title: "Sukces",
        description: "Badanie zostało usunięte",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się usunąć badania",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (editingTest) {
      updateMutation.mutate({ id: editingTest.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (test: MedicalTest) => {
    setEditingTest(test);
    form.reset({
      testName: test.testName,
      testType: test.testType || "blood",
      testDate: new Date(test.testDate),
      orderingProvider: test.orderingProvider || "",
      resultValue: test.resultValue || "",
      unit: test.unit || "",
      referenceRange: test.referenceRange || "",
      notes: test.notes || "",
      attachments: test.attachments || null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Czy na pewno chcesz usunąć to badanie?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingTest(null);
      form.reset();
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-heading font-bold mb-2" data-testid="heading-medical-tests">
            Moje badania medyczne
          </h1>
          <p className="text-muted-foreground text-lg">
            Zarządzaj swoimi wynikami badań medycznych
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-test" size="default">
              <Plus className="w-4 h-4 mr-2" />
              Dodaj badanie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="dialog-title">
                {editingTest ? "Edytuj badanie" : "Dodaj nowe badanie"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="testName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa badania *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="np. Morfologia, Cholesterol"
                          {...field}
                          data-testid="input-test-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ badania</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "blood"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-test-type">
                            <SelectValue placeholder="Wybierz typ badania" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="blood">Badanie krwi</SelectItem>
                          <SelectItem value="hormone">Badanie hormonalne</SelectItem>
                          <SelectItem value="cardio">Badanie kardiologiczne</SelectItem>
                          <SelectItem value="other">Inne</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data badania *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-test-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orderingProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lekarz zlecający</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="np. Dr. Jan Kowalski"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-ordering-provider"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="resultValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wynik</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="np. 45"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-result-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jednostka</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="np. mg/dl"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-unit"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="referenceRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zakres referencyjny</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="np. 30-50 mg/dl"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-reference-range"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notatki</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Dodatkowe informacje..."
                          {...field}
                          value={field.value || ""}
                          rows={3}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attachments"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Załączniki (PDFs/obrazy)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          multiple
                          onChange={(e) => onChange(e.target.files)}
                          data-testid="input-attachments"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground">
                        Możesz załączyć do 5 plików (PDF lub obrazy)
                      </p>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    data-testid="button-cancel"
                  >
                    Anuluj
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {editingTest ? "Zapisz zmiany" : "Dodaj badanie"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {!tests || tests.length === 0 ? (
        <Alert data-testid="alert-no-tests">
          <Activity className="h-5 w-5" />
          <AlertDescription className="text-base">
            Nie masz jeszcze żadnych dodanych badań medycznych.
            Kliknij "Dodaj badanie" aby dodać pierwsze badanie.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista badań</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Wynik</TableHead>
                    <TableHead>Zakres ref.</TableHead>
                    <TableHead>Załączniki</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id} data-testid={`row-test-${test.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${test.id}`}>
                        {test.testName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={testTypeColors[test.testType || "other"]} data-testid={`badge-type-${test.id}`}>
                          {testTypeLabels[test.testType || "other"]}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-date-${test.id}`}>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(test.testDate), "d MMM yyyy", { locale: pl })}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-result-${test.id}`}>
                        {test.resultValue ? `${test.resultValue} ${test.unit || ""}`.trim() : "-"}
                      </TableCell>
                      <TableCell data-testid={`text-range-${test.id}`}>
                        {test.referenceRange || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-attachments-${test.id}`}>
                        {test.attachments && Array.isArray(test.attachments) && test.attachments.length > 0
                          ? `${test.attachments.length} plik(ów)`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(test)}
                            data-testid={`button-edit-${test.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(test.id)}
                            data-testid={`button-delete-${test.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
