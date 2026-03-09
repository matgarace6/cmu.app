import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DiningOptOut } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  ChevronRight, 
  Utensils, 
  Home, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay
} from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Dining() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generar los días del calendario mensual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });

  const { data: optOuts = [] } = useQuery<DiningOptOut[]>({ 
    queryKey: ["/api/dining"] 
  });

  const optOutMutation = useMutation({
    mutationFn: async (vars: { date: string; mealType: string }) => {
      const res = await apiRequest("POST", "/api/dining", vars);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dining"] });
      const msg = data.status === "removed" ? "Asistencia confirmada" : "Falta registrada";
      toast({ title: msg });
    }
  });

  const handleToggle = (date: Date, mealType: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    optOutMutation.mutate({ date: dateStr, mealType });
  };

  return (
    <div className="p-4 max-w-6xl mx-auto font-sans">
      {/* HEADER UNIFICADO */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-sm hover:bg-slate-100">
              <Home className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Comedor</h1>
        </div>

        <div className="flex items-center bg-white border rounded-lg shadow-sm overflow-hidden">
          <Button variant="ghost" className="rounded-none border-r" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-6 font-bold min-w-[180px] text-center capitalize text-slate-700">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <Button variant="ghost" className="rounded-none border-l" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* LEYENDA DISCRETA */}
      <div className="flex gap-4 mb-4 px-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="h-2 w-2 rounded-full bg-green-500"></div> Asistiré
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="h-2 w-2 rounded-full bg-red-500"></div> No asistiré
        </div>
      </div>

      {/* CALENDARIO MENSUAL TIPO GRID */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 border rounded-2xl overflow-hidden shadow-2xl">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
          <div key={d} className="bg-slate-800 p-2 md:p-3 text-center text-[8px] md:text-[10px] font-black text-white/50 uppercase tracking-widest border-r border-white/10 last:border-0 items-center justify-center flex">{d}</div>
        ))}

        {calendarDays.map((day, idx) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const myOptOuts = optOuts.filter(o => o.date === dateStr && o.userId === user?.id);
          const isLunchOut = myOptOuts.some(o => o.mealType === "Lunch");
          const isDinnerOut = myOptOuts.some(o => o.mealType === "Dinner");
          const isCurrentMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          
          // Comprobar si el día ya ha pasado
          const todayDate = startOfDay(new Date());
          const isPastDay = isBefore(day, todayDate);

          return (
            <div key={idx} className={`bg-white min-h-[80px] md:min-h-[140px] p-1 md:p-2 flex flex-col transition-all border-r border-b border-slate-100 ${!isCurrentMonth ? 'opacity-20 bg-slate-50' : ''} ${today ? 'ring-2 ring-inset ring-blue-500/20' : ''}`}>
              <div className={`text-right font-black mb-2 md:mb-3 ${today ? 'text-blue-600' : 'text-slate-300'}`}>
                <span className={today ? "bg-blue-600 text-white px-1 md:px-1.5 py-0.5 rounded text-[8px] md:text-xs" : "text-[8px] md:text-sm"}>{format(day, "d")}</span>
              </div>

              <div className="mt-auto space-y-0.5 md:space-y-2">
                {/* BOTÓN COMIDA (LUNCH) */}
                <button
                  onClick={() => handleToggle(day, "Lunch")}
                  disabled={!isCurrentMonth || optOutMutation.isPending || isPastDay}
                  className={`w-full text-[7px] md:text-[9px] p-0.5 md:p-2 rounded-lg flex items-center justify-between border-2 transition-all duration-200 font-black tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLunchOut 
                    ? 'bg-red-50 border-red-500 text-red-600 shadow-inner' 
                    : 'bg-green-50 border-green-500 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <span>COMIDA</span>
                  {isLunchOut ? <XCircle className="h-2 w-2 md:h-3 md:w-3" /> : <CheckCircle2 className="h-2 w-2 md:h-3 md:w-3" />}
                </button>

                {/* BOTÓN CENA (DINNER) */}
                <button
                  onClick={() => handleToggle(day, "Dinner")}
                  disabled={!isCurrentMonth || optOutMutation.isPending || isPastDay}
                  className={`w-full text-[7px] md:text-[9px] p-0.5 md:p-2 rounded-lg flex items-center justify-between border-2 transition-all duration-200 font-black tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDinnerOut 
                    ? 'bg-red-50 border-red-500 text-red-600 shadow-inner' 
                    : 'bg-green-50 border-green-500 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <span>CENA</span>
                  {isDinnerOut ? <XCircle className="h-2 w-2 md:h-3 md:w-3" /> : <CheckCircle2 className="h-2 w-2 md:h-3 md:w-3" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        Marca solo los días que NO estarás presente.
      </footer>
    </div>
  );
}