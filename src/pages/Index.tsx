import { useState, useEffect } from "react";
import { Droplet, Download, ArrowLeft, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingForm, type BookingFormValues } from "@/components/BookingForm";
import { TimeSlotList } from "@/components/TimeSlotList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import tjgoLogo from "@/assets/tjgo-logo.png";
import AdminAuthDialog from "@/components/AdminAuthDialog";

interface Booking {
  id: string;
  nome: string;
  data_nascimento: string;
  matricula: string;
  telefone: string;
  horario: string;
  created_at: string;
}

// Gera slots de 10:00 às 16:00 com intervalos de 4 minutos
const generateTimeSlots = () => {
  const slots: string[] = [];
  const startHour = 10;
  const endHour = 16;

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 4) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      slots.push(timeString);
    }
  }

  // Adiciona o último slot às 16:00
  slots.push("16:00");

  return slots;
};

type PendingAction = "export" | "clear" | null;

const Index = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [step, setStep] = useState<"form" | "time">("form");
  const [formData, setFormData] = useState<BookingFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // auth modal
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const availableSlots = generateTimeSlots();

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .order("horario", { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch {
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    // Realtime subscription
    const channel = supabase
      .channel("agendamentos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agendamentos",
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const bookedSlots = bookings.map((b) => b.horario.slice(0, 5));

  const handleFormNext = (data: BookingFormValues) => {
    setFormData(data);
    setStep("time");
  };

  const handleTimeSelect = async (slot: string) => {
    if (!formData) return;

    setIsSubmitting(true);

    try {
      const dateParts = formData.data_nascimento.split("/");
      const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

      const { error } = await supabase.from("agendamentos").insert({
        nome: formData.nome,
        data_nascimento: formattedDate,
        matricula: formData.matricula,
        telefone: formData.telefone,
        horario: slot,
      });

      if (error) {
        if ((error as any).code === "23505") {
          toast.error("Este horário já foi agendado por outra pessoa!");
        } else {
          toast.error("Erro ao realizar agendamento. Tente novamente.");
        }
        return;
      }

      toast.success("Agendamento realizado com sucesso!");
      setFormData(null);
      setStep("form");
      fetchBookings();
    } catch {
      toast.error("Erro ao realizar agendamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
  };

  // ====== AÇÕES PROTEGIDAS POR AUTENTICAÇÃO ======

  // 1) Exportar
  const doExportToExcel = async () => {
    if (bookings.length === 0) {
      toast.error("Não há agendamentos para exportar");
      return;
    }

    const dataForExport = bookings.map((booking) => ({
      Nome: booking.nome,
      "Data de Nascimento": booking.data_nascimento,
      Matrícula: booking.matricula,
      Telefone: booking.telefone,
      Horário: booking.horario.slice(0, 5),
      "Data do Agendamento": new Date(booking.created_at).toLocaleString("pt-BR"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agendamentos");

    XLSX.writeFile(
      workbook,
      `agendamentos-doacao-sangue-${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success("Arquivo Excel exportado com sucesso!");
  };

  // 2) Limpar Agendamentos
  const doClearAll = async () => {
    const { error } = await supabase
      .from("agendamentos")
      .delete()
      .not("id", "is", null); // filtro sempre-verdadeiro

    if (error) {
      toast.error("Falha ao apagar agendamentos.");
      return;
    }
    toast.success("Agendamentos apagados.");
    await fetchBookings();
  };

  // 3) Disparadores — abrem o modal
  const requestExport = () => {
    setPendingAction("export");
    setAuthOpen(true);
  };

  const requestClear = () => {
    setPendingAction("clear");
    setAuthOpen(true);
  };

  // 4) Após autenticar
  const onAuthSuccess = async () => {
    if (pendingAction === "export") {
      await doExportToExcel();
    } else if (pendingAction === "clear") {
      await doClearAll();
    }
    setPendingAction(null);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center mb-4">
            <img src={tjgoLogo} alt="TJGO Logo" className="h-64 mb-4" />
            <div className="flex items-center gap-3">
              <Droplet className="h-12 w-12 text-primary animate-pulse" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Campanha de Doação de Sangue
              </h1>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sistema de Agendamento -{" "}
            <span className="font-semibold text-foreground">13 de Novembro</span>
          </p>
          <p className="text-muted-foreground mt-2">
            Horário de atendimento: 10:00 às 16:00
          </p>
        </div>

        {/* Main Form/Selection Card */}
        <Card className="mb-8 shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {step === "time" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToForm}
                    className="mr-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                {step === "form" ? (
                  <User className="h-5 w-5 text-primary" />
                ) : (
                  <User className="h-5 w-5 text-success" />
                )}
                <CardTitle className="text-2xl">
                  {step === "form" ? "Seus Dados" : "Escolha o Horário"}
                </CardTitle>
              </div>

              {/* Botões protegidos */}
              <div className="flex items-center gap-2">
                {step === "form" && (
                  <>
                    <Button
                      onClick={requestExport}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={bookings.length === 0}
                    >
                      <Download className="h-4 w-4" />
                      Exportar
                    </Button>

                    <Button
                      onClick={requestClear}
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Limpar Agendamentos
                    </Button>
                  </>
                )}
              </div>
            </div>

            <CardDescription>
              {step === "form"
                ? "Preencha seus dados para prosseguir"
                : "Selecione um horário disponível"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "form" ? (
              <BookingForm onNext={handleFormNext} />
            ) : isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-muted-foreground">
                  Carregando horários...
                </div>
              </div>
            ) : (
              <>
                {formData && (
                  <div className="bg-muted/50 p-4 rounded-lg mb-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Agendamento para:
                    </p>
                    <p className="font-semibold text-foreground">
                      {formData.nome}
                    </p>
                  </div>
                )}
                <TimeSlotList
                  availableSlots={availableSlots}
                  bookedSlots={bookedSlots}
                  onSlotSelect={handleTimeSelect}
                  isSubmitting={isSubmitting}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de autenticação */}
      <AdminAuthDialog
        open={authOpen}
        onClose={() => { setAuthOpen(false); setPendingAction(null); }}
        onSuccess={onAuthSuccess}
        title={
          pendingAction === "export"
            ? "Autenticação para Exportar"
            : pendingAction === "clear"
            ? "Autenticação para Limpar Agendamentos"
            : "Autenticação de Admin"
        }
      />
    </div>
  );
};

export default Index;
