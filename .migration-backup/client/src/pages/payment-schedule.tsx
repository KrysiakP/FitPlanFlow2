import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, Trash2, Check, Plus, Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientPaymentSchema } from "@shared/schema";
import { z } from "zod";
import { useState, useRef } from "react";
import type { ClientPayment, User } from "@shared/schema";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const formSchema = insertClientPaymentSchema.extend({
  clientId: z.string().min(1, "Wybierz klienta"),
});

type FormData = z.infer<typeof formSchema>;

export default function PaymentSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const isTrainer = user?.role === "trainer";

  const { data: payments = [], isLoading } = useQuery<ClientPayment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/trainer/clients"],
    enabled: isTrainer,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      amount: 0,
      dueDate: new Date(),
      isPaid: false,
      notes: "",
      isRecurring: false,
      recurringAmount: 0,
      recurringDayOfMonth: 1,
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/upcoming"] });
      toast({
        title: "Płatność dodana",
        description: "Płatność została pomyślnie dodana",
      });
      form.reset({
        clientId: "",
        amount: 0,
        dueDate: new Date(),
        isPaid: false,
        notes: "",
        isRecurring: false,
        recurringAmount: 0,
        recurringDayOfMonth: 1,
      });
      // Close dialog programmatically after successful submission
      dialogCloseRef.current?.click();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: error.message || "Nie udało się dodać płatności",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return await apiRequest("PATCH", `/api/payments/${paymentId}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/upcoming"] });
      toast({
        title: "Płatność oznaczona",
        description: "Płatność została oznaczona jako zapłacona",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: error.message || "Nie udało się oznaczyć płatności",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return await apiRequest("DELETE", `/api/payments/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/upcoming"] });
      toast({
        title: "Płatność usunięta",
        description: "Płatność została pomyślnie usunięta",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: error.message || "Nie udało się usunąć płatności",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const amountInGrosze = Math.round(data.amount * 100);
    const paymentData = {
      ...data,
      amount: amountInGrosze,
      recurringAmount: data.isRecurring ? amountInGrosze : 0,
    };
    createPaymentMutation.mutate(paymentData);
  };

  const formatAmount = (amountInCents: number): string => {
    const amountInZloty = amountInCents / 100;
    return `${amountInZloty.toFixed(2).replace('.', ',')} zł`;
  };

  const formatDate = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, "d MMMM yyyy", { locale: pl });
  };

  const isOverdue = (payment: ClientPayment): boolean => {
    const dueDate = new Date(payment.dueDate);
    const now = new Date();
    return !payment.isPaid && dueDate < now;
  };

  const getClientName = (clientId: string): string => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Nieznany klient";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2" data-testid="heading-payment-schedule">
            <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Terminarz płatności
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            {isTrainer 
              ? "Zarządzaj płatnościami podopiecznych" 
              : "Twój harmonogram płatności"}
          </p>
        </div>
        
        {isTrainer && (
          <Dialog>
            <DialogTrigger asChild>
              <Button data-testid="button-add-payment">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj płatność
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Dodaj nową płatność</DialogTitle>
                <DialogDescription>
                  Utwórz nowy wpis płatności dla podopiecznego
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Podopieczny</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-client">
                              <SelectValue placeholder="Wybierz podopiecznego" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem 
                                key={client.id} 
                                value={client.id}
                                data-testid={`option-client-${client.id}`}
                              >
                                {client.firstName} {client.lastName}
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
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kwota (zł)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="200"
                            data-testid="input-amount"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Podaj kwotę w złotówkach (np. 200 = 200 zł)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Termin płatności</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="input-due-date"
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
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
                        <FormLabel>Notatki (opcjonalnie)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Dodatkowe informacje o płatności..."
                            data-testid="input-notes"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            data-testid="checkbox-recurring"
                            className="rounded border-input"
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">
                          Płatność powtarzająca się co miesiąc
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch("isRecurring") && (
                    <FormField
                      control={form.control}
                      name="recurringDayOfMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dzień miesiąca (1-28)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="28"
                              placeholder="15"
                              data-testid="input-recurring-day"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <p className="text-sm text-muted-foreground">
                            Płatność będzie się powtarzać na ten dzień każdego miesiąca
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        data-testid="button-cancel"
                      >
                        Anuluj
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={createPaymentMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createPaymentMutation.isPending ? "Dodawanie..." : "Dodaj płatność"}
                    </Button>
                  </div>
                  
                  {/* Hidden DialogClose button for programmatic close after successful submission */}
                  <DialogClose ref={dialogCloseRef} type="button" className="hidden" />
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {isTrainer ? "Wszystkie płatności" : "Moje płatności"}
          </CardTitle>
          <CardDescription>
            {payments.length === 0 
              ? "Brak płatności do wyświetlenia" 
              : `Łącznie: ${payments.length} płatności`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Brak płatności w systemie</p>
            </div>
          ) : (
            <>
              {/* Mobile view - cards */}
              <div className="md:hidden space-y-3" data-testid="payments-mobile-view">
                {payments.map((payment) => (
                  <div 
                    key={payment.id}
                    data-testid={`card-payment-${payment.id}`}
                    className={`p-4 rounded-lg border ${isOverdue(payment) ? "border-destructive/50 bg-destructive/5" : "bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        {isTrainer && (
                          <p className="font-medium truncate" data-testid={`mobile-client-${payment.id}`}>
                            {getClientName(payment.clientId)}
                          </p>
                        )}
                        <p className={`text-xl font-bold ${isOverdue(payment) ? "text-destructive" : ""}`} data-testid={`mobile-amount-${payment.id}`}>
                          {formatAmount(payment.amount)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        {payment.isPaid ? (
                          <Badge variant="default" className="bg-green-500" data-testid={`badge-paid-${payment.id}`}>
                            Zapłacono
                          </Badge>
                        ) : isOverdue(payment) ? (
                          <Badge variant="destructive" data-testid={`badge-overdue-${payment.id}`}>
                            Zaległość
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-pending-${payment.id}`}>
                            Oczekuje
                          </Badge>
                        )}
                        {payment.isRecurring && (
                          <Badge variant="outline" className="gap-1" data-testid={`badge-recurring-${payment.id}`}>
                            <Repeat className="w-3 h-3" />
                            Cykliczna
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <Calendar className="w-4 h-4" />
                      <span className={isOverdue(payment) ? "text-destructive" : ""} data-testid={`mobile-date-${payment.id}`}>
                        {formatDate(payment.dueDate)}
                      </span>
                    </div>
                    
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground mb-3" data-testid={`mobile-notes-${payment.id}`}>
                        {payment.notes}
                      </p>
                    )}
                    
                    {isTrainer && (
                      <div className="flex gap-2">
                        {!payment.isPaid && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => markPaidMutation.mutate(payment.id)}
                            disabled={markPaidMutation.isPending}
                            data-testid={`button-mark-paid-${payment.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Zapłacono
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => deletePaymentMutation.mutate(payment.id)}
                          disabled={deletePaymentMutation.isPending}
                          data-testid={`button-delete-${payment.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop view - table */}
              <div className="hidden md:block overflow-x-auto">
                <Table data-testid="table-payments">
                  <TableHeader>
                    <TableRow>
                      {isTrainer && <TableHead>Podopieczny</TableHead>}
                      <TableHead>Kwota</TableHead>
                      <TableHead>Termin płatności</TableHead>
                      <TableHead>Status</TableHead>
                      {payments.some(p => p.notes) && <TableHead>Notatki</TableHead>}
                      {isTrainer && <TableHead className="text-right">Akcje</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow 
                        key={payment.id} 
                        data-testid={`row-payment-${payment.id}`}
                        className={isOverdue(payment) ? "bg-destructive/5" : ""}
                      >
                        {isTrainer && (
                          <TableCell className="font-medium" data-testid={`cell-client-${payment.id}`}>
                            {getClientName(payment.clientId)}
                          </TableCell>
                        )}
                        <TableCell 
                          className={`font-semibold ${isOverdue(payment) ? "text-destructive" : ""}`}
                          data-testid={`cell-amount-${payment.id}`}
                        >
                          {formatAmount(payment.amount)}
                        </TableCell>
                        <TableCell 
                          className={isOverdue(payment) ? "text-destructive" : ""}
                          data-testid={`cell-due-date-${payment.id}`}
                        >
                          {formatDate(payment.dueDate)}
                        </TableCell>
                        <TableCell data-testid={`cell-status-${payment.id}`}>
                          <div className="flex flex-col gap-2">
                            <div>
                              {payment.isPaid ? (
                                <Badge variant="default" className="bg-green-500" data-testid={`badge-paid-${payment.id}`}>
                                  Zapłacono
                                </Badge>
                              ) : isOverdue(payment) ? (
                                <Badge variant="destructive" data-testid={`badge-overdue-${payment.id}`}>
                                  Zaległość
                                </Badge>
                              ) : (
                                <Badge variant="secondary" data-testid={`badge-pending-${payment.id}`}>
                                  Oczekuje
                                </Badge>
                              )}
                            </div>
                            {payment.isRecurring && (
                              <Badge variant="outline" className="gap-1" data-testid={`badge-recurring-${payment.id}`}>
                                <Repeat className="w-3 h-3" />
                                Cykliczna
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {payments.some(p => p.notes) && (
                          <TableCell className="text-sm text-muted-foreground" data-testid={`cell-notes-${payment.id}`}>
                            {payment.notes || "-"}
                          </TableCell>
                        )}
                        {isTrainer && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!payment.isPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markPaidMutation.mutate(payment.id)}
                                  disabled={markPaidMutation.isPending}
                                  data-testid={`button-mark-paid-${payment.id}`}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Zapłacono
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deletePaymentMutation.mutate(payment.id)}
                                disabled={deletePaymentMutation.isPending}
                                data-testid={`button-delete-${payment.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
