import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { LaundryBooking, GymBooking } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  LogOut, 
  WashingMachine, 
  Dumbbell, 
  Utensils, 
  UserMinus,
  CalendarDays,
  Clock,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Obtener datos de reservas
  const { data: laundry = [] } = useQuery<LaundryBooking[]>({ queryKey: ["/api/laundry"] });
  const { data: gym = [] } = useQuery<GymBooking[]>({ queryKey: ["/api/gym"] });

  // Filtrar solo las del usuario actual para HOY
  const myLaundry = laundry.filter(b => b.userId === user?.id && b.date === todayStr);
  const myGym = gym.filter(b => b.userId === user?.id && b.date === todayStr);

  const hasReservations = myLaundry.length > 0 || myGym.length > 0;

  const handleDeleteAccount = async () => {
    if (confirm("¿Seguro que quieres borrar tu perfil? Se liberará tu habitación inmediatamente.")) {
      const res = await fetch("/api/user/delete-account", { method: "POST" });
      if (res.ok) window.location.href = "/auth";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-black text-slate-800 tracking-tighter uppercase">CMU Santa Cruz</h1>

          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" className="h-8 text-[10px] font-bold" onClick={handleDeleteAccount}>
              <UserMinus className="h-3 w-3 mr-1" /> Borrar perfil
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-3 w-3 mr-1" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* LÍNEA DISCRETA: INFO USUARIO */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 bg-slate-100 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Habitación:</span>
            <span className="text-sm font-bold text-slate-700">{user?.roomNumber}</span>
          </div>
          <div className="h-3 w-px bg-slate-300 hidden sm:block"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alergias:</span>
            <span className="text-sm font-medium text-slate-600">{user?.allergies || "Ninguna"}</span>
          </div>
        </div>

        {/* BANNER PRINCIPAL: PRÓXIMAS RESERVAS */}
        <Card className={`border-none shadow-xl transition-all ${hasReservations ? 'bg-white' : 'bg-slate-200/50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-slate-500">
              <CalendarDays className="h-4 w-4" /> Próximas Reservas (Hoy)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            {!hasReservations ? (
              <div className="flex flex-col items-center py-6 text-slate-400">
                <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm italic">No tienes reservas pendientes para hoy.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {myLaundry.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-600 p-2 rounded-lg text-white">
                        <WashingMachine className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-600 uppercase tracking-tighter">Lavandería</p>
                        <p className="text-xs font-black text-blue-900 leading-tight">
                          {b.machineType} {b.machineId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold bg-white px-3 py-1 rounded-full border border-blue-200">
                      <Clock className="h-4 w-4" /> {b.timeSlot}
                    </div>
                  </div>
                ))}

                {myGym.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-600 p-2 rounded-lg text-white">
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-600 uppercase tracking-tighter">Gimnasio</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-white px-3 py-1 rounded-full border border-emerald-200">
                      <Clock className="h-4 w-4" /> {b.timeSlot}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* REJILLA DE SERVICIOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/laundry">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 overflow-hidden group">
              <CardContent className="p-0">
                <div className="bg-blue-600 p-4 flex justify-center group-hover:bg-blue-700">
                  <WashingMachine className="h-8 w-8 text-white" />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-bold text-slate-800">Lavandería</h3>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/gym">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 overflow-hidden group">
              <CardContent className="p-0">
                <div className="bg-emerald-600 p-4 flex justify-center group-hover:bg-emerald-700">
                  <Dumbbell className="h-8 w-8 text-white" />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-bold text-slate-800">Gimnasio</h3>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dining">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 overflow-hidden group">
              <CardContent className="p-0">
                <div className="bg-orange-600 p-4 flex justify-center group-hover:bg-orange-700">
                  <Utensils className="h-8 w-8 text-white" />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-bold text-slate-800">Comedor</h3>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}