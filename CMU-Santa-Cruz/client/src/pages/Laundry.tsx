import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LaundryBooking } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus, Home, X } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale/es";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

export default function Laundry() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);
  const [machineType, setMachineType] = useState<"Lavadora" | "Secadora">("Lavadora");
  const [machineId, setMachineId] = useState("1");
  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  const { data: bookings = [], isLoading, isError } = useQuery<LaundryBooking[]>({ queryKey: ["/api/laundry"] });

  const bookMutation = useMutation({
    mutationFn: async (vars: any) => { await apiRequest("POST", "/api/laundry", vars); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundry"] });
      toast({ title: "Reserva confirmada" });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "No se pudo reservar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (vars: any) => { await apiRequest("POST", "/api/laundry/cancel", vars); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundry"] });
      toast({ title: "Reserva cancelada" });
    }
  });

  const handleOpenDialog = (date: Date, time: string) => {
    setSelectedSlot({ date, time });
    setMachineId("1");
    setIsDialogOpen(true);
  };

  const machineNumbers = machineType === "Lavadora" ? ["1", "2", "3", "4"] : ["1", "2", "3"];

  return (
    <div className="p-4 max-w-7xl mx-auto font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-sm">
              <Home className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Lavandería</h1>
        </div>

        <div className="flex items-center bg-white border rounded-lg shadow-sm overflow-hidden">
          <Button variant="ghost" className="rounded-none border-r" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="px-6 font-bold min-w-[180px] text-center capitalize">{format(currentWeekStart, "MMMM yyyy", { locale: es })}</span>
          <Button variant="ghost" className="rounded-none border-l" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>


      <div className="md:hidden mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {weekDays.map((day, idx) => (
            <Button
              key={day.toString()}
              variant={mobileDayIndex === idx ? "default" : "outline"}
              size="sm"
              onClick={() => setMobileDayIndex(idx)}
              className="whitespace-nowrap"
            >
              {format(day, "EEE d", { locale: es })}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          {TIMES.map((time) => {
            const day = weekDays[mobileDayIndex];
            const dateStr = format(day, "yyyy-MM-dd");
            const slotBookings = bookings.filter((b) => b.timeSlot === time && b.date === dateStr);
            const today = startOfDay(new Date());
            const isPastDay = isBefore(day, today);

            return (
              <div key={time} className="border rounded-lg p-2 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm">{time}</p>
                  <Button size="sm" className="h-9" onClick={() => handleOpenDialog(day, time)} disabled={isPastDay}>
                    <Plus className="h-4 w-4 mr-1" /> Reservar
                  </Button>
                </div>
                <div className="space-y-1">
                  {slotBookings.length === 0 ? (
                    <p className="text-xs text-slate-400">Sin reservas</p>
                  ) : (
                    slotBookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded bg-slate-50">
                        <span>{b.machineType} {b.machineId}</span>
                        {b.userId === user?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-red-600"
                            onClick={() => cancelMutation.mutate({ date: dateStr, timeSlot: time, machineType: b.machineType, machineId: b.machineId })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto border rounded-2xl shadow-xl bg-white">        {isLoading && (
          <div className="px-4 py-3 text-sm font-semibold text-slate-500 border-b bg-slate-50">
            Cargando reservas de lavandería...
          </div>
        )}
        {isError && (
          <div className="px-4 py-3 text-sm font-semibold text-red-600 border-b bg-red-50">
            No pudimos cargar las reservas. Recarga la página para intentarlo de nuevo.
          </div>
        )}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white font-bold">
              <th className="p-2 md:p-4 text-[8px] md:text-[10px] uppercase font-black opacity-40">Hora</th>
              {weekDays.map(day => (
                <th key={day.toString()} className="p-2 md:p-4 border-l border-white/10 min-w-[60px] md:min-w-[130px]">
                  <div className="text-[7px] md:text-[10px] uppercase opacity-60 font-bold">{format(day, "eee", { locale: es })}</div>
                  <div className="text-sm md:text-xl font-black">{format(day, "d")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIMES.map(time => (
              <tr key={time} className="border-b last:border-0">
                <td className="p-1 md:p-3 border-r font-bold text-slate-400 text-center bg-slate-50 text-[8px] md:text-xs">{time}</td>
                {weekDays.map(day => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const slotBookings = bookings.filter(b => b.timeSlot === time && b.date === dateStr);
                  
                  // Comprobar si el día ya ha pasado
                  const today = startOfDay(new Date());
                  const isPastDay = isBefore(day, today);

                  return (
                    <td key={day.toString()} className="p-1 md:p-2 border-r align-top h-20 md:h-28 bg-white hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col gap-0.5 md:gap-1.5 h-full">
                        <div className="flex flex-col gap-0.5 md:gap-1 mb-auto">
                          {slotBookings.map(b => (
                            <div key={b.id} className={`flex items-center justify-between px-1 md:px-2 py-0.5 md:py-1 rounded text-[7px] md:text-[9px] font-bold border shadow-sm ${
                              b.machineType === "Lavadora" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}>
                              <span>{b.machineType === "Lavadora" ? "LAV" : "SEC"} {b.machineId}</span>
                              {b.userId === user?.id && (
                                <button 
                                  onClick={() => { if(window.confirm("¿Cancelar reserva?")) cancelMutation.mutate({ date: dateStr, timeSlot: time, machineType: b.machineType, machineId: b.machineId }) }}
                                  className="ml-0.5 md:ml-1 text-red-500 hover:text-red-700 bg-white rounded-full p-0.5 shadow-sm border border-red-100"
                                >
                                  <X className="h-2 w-2 md:h-3 md:w-3 stroke-[3px]" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <Button 
                          variant="ghost" size="sm" 
                          className="w-full h-6 md:h-7 text-[8px] md:text-[10px] text-blue-500 hover:bg-blue-50 font-black border border-dashed border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleOpenDialog(day, time)}
                          disabled={isPastDay}
                        >
                          <Plus className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" /> RESERVAR
                        </Button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold italic">Reserva de Lavandería</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-tighter">Máquina</label>
              <Select value={machineType} onValueChange={(val: any) => { setMachineType(val); setMachineId("1"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lavadora">Lavadora (4 disponibles)</SelectItem>
                  <SelectItem value="Secadora">Secadora (3 disponibles)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-tighter">Número</label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {machineNumbers.map(num => {
                    // --- PROTECCIÓN AQUÍ ---
                    const slotDate = selectedSlot ? format(selectedSlot.date, "yyyy-MM-dd") : "";
                    const isOccupied = slotDate ? bookings.some(b => 
                      b.date === slotDate && 
                      b.timeSlot === selectedSlot?.time && 
                      b.machineType === machineType && 
                      b.machineId === parseInt(num)
                    ) : false;

                    return <SelectItem key={num} value={num} disabled={isOccupied}>Máquina {num} {isOccupied ? "(OCUPADA)" : ""}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1 font-bold" onClick={() => setIsDialogOpen(false)}>CANCELAR</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold" 
              onClick={() => {
                if (selectedSlot) {
                  bookMutation.mutate({ 
                    date: format(selectedSlot.date, "yyyy-MM-dd"), 
                    timeSlot: selectedSlot.time, 
                    machineType, 
                    machineId: parseInt(machineId) 
                  });
                }
              }}
            >CONFIRMAR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
