import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const TIMES = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"];

interface AdminDashboard {
  users: Array<{ id: number; roomNumber: string; name: string; allergies: string }>;
  blockedMachines: Array<{ id: number; date: string; timeSlot: string; machineType: string; machineId: number }>;
  blockedSlots: Array<{ id: number; service: "laundry" | "gym"; date: string; timeSlot: string }>;
  auditLogs: Array<{ id: number; action: string; details: string; createdAt: string | null }>;
}

export default function AdminPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [timeSlot, setTimeSlot] = useState("18:00");
  const [machineType, setMachineType] = useState("Lavadora");
  const [machineId, setMachineId] = useState("1");
  const [service, setService] = useState<"laundry" | "gym">("laundry");

  const { data, isLoading, isError } = useQuery<AdminDashboard>({
    queryKey: ["/api/admin/dashboard"],
  });

  const [editedUsers, setEditedUsers] = useState<Record<number, { name: string; allergies: string }>>({});

  const blockMachine = useMutation({
    mutationFn: async (blocked: boolean) => {
      await apiRequest("POST", "/api/admin/laundry/block-machine", {
        date,
        timeSlot,
        machineType,
        machineId: Number(machineId),
        blocked,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({ title: "Cambios guardados" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const blockSlot = useMutation({
    mutationFn: async (blocked: boolean) => {
      await apiRequest("POST", "/api/admin/block-slot", {
        service,
        date,
        timeSlot,
        blocked,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({ title: "Cambios guardados" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateUser = useMutation({
    mutationFn: async (payload: { userId: number; name: string; allergies: string }) => {
      await apiRequest("POST", "/api/admin/user/update", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({ title: "Usuario actualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });


  const deleteUser = useMutation({
    mutationFn: async (targetUserId: number) => {
      await apiRequest("POST", "/api/admin/user/delete", { userId: targetUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({ title: "Perfil eliminado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const machineBlocked = useMemo(() => data?.blockedMachines.some(
    (b) => b.date === date && b.timeSlot === timeSlot && b.machineType === machineType && b.machineId === Number(machineId),
  ) ?? false, [data, date, machineId, machineType, timeSlot]);

  const slotBlocked = useMemo(() => data?.blockedSlots.some(
    (b) => b.service === service && b.date === date && b.timeSlot === timeSlot,
  ) ?? false, [data, date, service, timeSlot]);

  if (isLoading) return <div className="p-8">Cargando panel de administración...</div>;
  if (isError || !data) return <div className="p-8 text-red-600">No tienes permisos o hubo un error cargando el panel.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black">Panel administrativo</h1>
          <Link href="/">
            <Button variant="outline"><Home className="h-4 w-4 mr-2" /> Inicio</Button>
          </Link>
        </div>

        <Card>
          <CardHeader><CardTitle>Bloqueos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger><SelectValue placeholder="Hora" /></SelectTrigger>
                <SelectContent>{TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={machineType} onValueChange={(v) => setMachineType(v as "Lavadora" | "Secadora")}>
                <SelectTrigger><SelectValue placeholder="Máquina" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lavadora">Lavadora</SelectItem>
                  <SelectItem value="Secadora">Secadora</SelectItem>
                </SelectContent>
              </Select>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger><SelectValue placeholder="Número" /></SelectTrigger>
                <SelectContent>{["1","2","3","4"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={service} onValueChange={(v) => setService(v as "laundry" | "gym")}>
                <SelectTrigger><SelectValue placeholder="Servicio" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="laundry">Laundry</SelectItem>
                  <SelectItem value="gym">Gym</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => blockMachine.mutate(!machineBlocked)}>
                {machineBlocked ? "Desbloquear máquina" : "Bloquear máquina"}
              </Button>
              <Button variant="secondary" onClick={() => blockSlot.mutate(!slotBlocked)}>
                {slotBlocked ? `Desbloquear franja ${service}` : `Bloquear franja ${service}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Usuarios (editar nombre, alergias y borrar perfil)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Habitación</th>
                    <th className="py-2">Nombre</th>
                    <th className="py-2">Alergias</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => {
                    const edited = editedUsers[u.id] ?? { name: u.name, allergies: u.allergies };
                    return (
                      <tr key={u.id} className="border-b">
                        <td className="py-2">{u.roomNumber}</td>
                        <td className="py-2 pr-2">
                          <Input
                            value={edited.name}
                            onChange={(e) => setEditedUsers((prev) => ({
                              ...prev,
                              [u.id]: { ...edited, name: e.target.value },
                            }))}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            value={edited.allergies}
                            onChange={(e) => setEditedUsers((prev) => ({
                              ...prev,
                              [u.id]: { ...edited, allergies: e.target.value },
                            }))}
                          />
                        </td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateUser.mutate({ userId: u.id, name: edited.name, allergies: edited.allergies })}
                            >
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteUser.isPending || user?.id === u.id}
                              onClick={() => {
                                if (window.confirm(`¿Seguro que quieres borrar el perfil de la habitación ${u.roomNumber}?`)) {
                                  deleteUser.mutate(u.id);
                                }
                              }}
                            >
                              Borrar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Historial de trazabilidad</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {data.auditLogs.map((log) => (
                <div key={log.id} className="border rounded p-2 bg-white">
                  <p className="text-xs text-slate-500">{log.createdAt ? format(new Date(log.createdAt), "dd/MM/yyyy HH:mm") : "Sin fecha"} · {log.action}</p>
                  <p className="text-sm font-medium">{log.details}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
