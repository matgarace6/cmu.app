import { useQuery } from "@tanstack/react-query";
import { User, DiningOptOut } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function KitchenView() {
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery<{ users: User[], optOuts: DiningOptOut[] }>({
    queryKey: ["/api/kitchen/report"],
  });

  if (isLoading) return <div className="p-10 text-center font-bold">Cargando reporte de cocina...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      <Card className="mb-8 border-orange-200 shadow-md">
        <CardHeader className="bg-orange-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl flex justify-between items-center">
            <span>Panel de Cocina CMU Santa Cruz</span>
            <span className="text-xs font-normal border border-white/40 px-2 py-1 rounded">ACCESO PÚBLICO</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">
              Listado de Alergias y Faltas al Comedor
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Fecha:</span>
              <Input 
                type="date" 
                className="w-44" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)} 
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-3 font-bold text-slate-600 text-xs uppercase">Habitación</th>
                  <th className="p-3 font-bold text-slate-600 text-xs uppercase">Alergias</th>
                  <th className="p-3 font-bold text-slate-600 text-xs uppercase">Comida</th>
                  <th className="p-3 font-bold text-slate-600 text-xs uppercase">Cena</th>
                </tr>
              </thead>
              <tbody>
                {data?.users.map(u => {
                  const isLunchOut = data.optOuts.some(o => o.userId === u.id && o.date === filterDate && o.mealType === "Lunch");
                  const isDinnerOut = data.optOuts.some(o => o.userId === u.id && o.date === filterDate && o.mealType === "Dinner");

                  return (
                    <tr key={u.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">{u.roomNumber}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${u.allergies.toLowerCase() === 'ninguna' || u.allergies.toLowerCase() === 'ninguna ' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 uppercase'}`}>
                          {u.allergies}
                        </span>
                      </td>
                      <td className="p-3">
                        {isLunchOut ? <span className="text-red-600 font-bold text-xs uppercase">NO VIENE</span> : <span className="text-slate-400 text-xs">Asiste</span>}
                      </td>
                      <td className="p-3">
                        {isDinnerOut ? <span className="text-red-600 font-bold text-xs uppercase">NO VIENE</span> : <span className="text-slate-400 text-xs">Asiste</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="text-center pb-10">
        <a href="/auth" className="text-slate-400 text-xs underline">Volver al inicio de colegiales</a>
      </div>
    </div>
  );
}