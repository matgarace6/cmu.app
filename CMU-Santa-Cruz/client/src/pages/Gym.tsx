import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, UserPlus, Users, X, Home } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

const TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

interface GymBookingWithRoom {
  id: number;
  userId: number;
  date: string;
  timeSlot: string;
  roomNumber?: string;
}

export default function Gym() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const { data: bookings = [] } = useQuery<GymBookingWithRoom[]>({ queryKey: ["/api/gym"] });

  const bookMutation = useMutation({
    mutationFn: async (vars: any) => {
      await apiRequest("POST", "/api/gym", vars);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gym"] });
      toast({ title: "Reserva confirmada" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo realizar la reserva.", variant: "destructive" });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (vars: { date: string; timeSlot: string }) => {
     
      await apiRequest("POST", "/api/gym/cancel", vars);
    },
    onSuccess: () => {
      // Esta línea hace que el calendario se refresque solo y desaparezca la reserva
      queryClient.invalidateQueries({ queryKey: ["/api/gym"] });
      toast({ title: "Reserva cancelada" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "No se pudo cancelar la reserva", 
        variant: "destructive" 
      });
    }
  });

  return (
    <div className="p-4 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-sm">
              <Home className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gimnasio</h1>
        </div>

        <div className="flex items-center bg-white border rounded-lg shadow-sm overflow-hidden">
          <Button variant="ghost" className="rounded-none border-r" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="px-4 font-bold min-w-[200px] text-center capitalize">{format(currentWeekStart, "MMMM yyyy", { locale: es })}</span>
          <Button variant="ghost" className="rounded-none border-l" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-2 md:p-4 border-r text-slate-400 font-bold text-[8px] md:text-[10px] uppercase tracking-widest">Hora</th>
              {weekDays.map(day => (
                <th key={day.toString()} className="p-2 md:p-4 border-r min-w-[60px] md:min-w-[110px]">
                  <div className="text-[7px] md:text-[10px] uppercase text-slate-400 font-bold">{format(day, "eee", { locale: es })}</div>
                  <div className="text-sm md:text-lg font-black text-slate-700">{format(day, "d")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIMES.map(time => (
              <tr key={time} className="border-b last:border-0 hover:bg-slate-50/30 transition-colors">
                <td className="p-1 md:p-3 border-r font-bold text-slate-400 text-center bg-slate-50/30 text-[8px] md:text-xs">{time}</td>
                {weekDays.map(day => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const slotBookings = bookings.filter(b => b.date === dateStr && b.timeSlot === time);
                  const isBookedByMe = slotBookings.some(b => b.userId === user?.id);
                  const isFull = slotBookings.length >= 3;
                  
                  // Comprobar si el día ya ha pasado
                  const today = startOfDay(new Date());
                  const isPastDay = isBefore(day, today);
                  
                  // Determinar color de fondo según estado del slot
                  let bgColor = "bg-green-50"; // Vacío
                  if (isBookedByMe) {
                    bgColor = "bg-blue-50"; // Reservado por el usuario
                  } else if (isFull) {
                    bgColor = "bg-red-50"; // Lleno
                  } else if (slotBookings.length > 0) {
                    bgColor = "bg-orange-50"; // Parcialmente ocupado
                  }

                  return (
                    <td key={day.toString()} className={`p-1 md:p-2 border-r h-16 md:h-20 text-center relative group ${bgColor}`}>
                      <div className="flex flex-col items-center justify-center gap-0.5 md:gap-1 h-full">
                        {/* LISTA DE NÚMEROS DE HABITACIÓN */}
                        <div className="flex flex-col gap-0.5 items-center mb-auto min-h-[20px] md:min-h-[24px]">
                          {slotBookings.map(booking => (
                            <span 
                              key={booking.id}
                              className={`text-[7px] md:text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                                booking.userId === user?.id 
                                  ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {booking.roomNumber || 'N/A'}
                            </span>
                          ))}
                        </div>

                        {/* CONTADOR Y BOTÓN DE ACCIÓN */}
                        <div className="flex items-center gap-0.5 md:gap-1 text-[8px] md:text-[10px] font-bold text-slate-400">
                          <Users className={`h-2 w-2 md:h-3 md:w-3 ${isFull ? 'text-red-400' : 'text-slate-300'}`} />
                          <span className={isFull ? 'text-red-500' : 'text-slate-400'}>
                            {slotBookings.length}/3
                          </span>
                        </div>

                        {isBookedByMe ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 md:h-6 md:w-6 rounded-full text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                            onClick={() => {
                              if (window.confirm("¿Seguro que quieres cancelar tu plaza en el gimnasio?")) {
                                cancelMutation.mutate({ date: dateStr, timeSlot: time });
                              }
                            }}
                            disabled={cancelMutation.isPending}
                          >
                            <X className="h-3 w-3 md:h-4 md:w-4 stroke-[3px]" />
                          </Button>
                        ) : isFull ? (
                          <span className="text-[7px] md:text-[9px] text-slate-300 italic font-medium">Lleno</span>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 md:h-7 text-[8px] md:text-[10px] font-bold text-green-600 hover:bg-green-50 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => bookMutation.mutate({ date: dateStr, timeSlot: time })}
                            disabled={bookMutation.isPending || isPastDay}
                          >
                            <UserPlus className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" /> Apuntarse
                          </Button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}