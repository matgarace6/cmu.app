import { useState } from "react";
import { useLogin } from "@/hooks/use-users";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

export function LoginModal({ isOpen }: { isOpen: boolean }) {
  const [roomNumber, setRoomNumber] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber || !password) return;
    login.mutate({ roomNumber, password });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        <div className="bg-primary/5 p-8 flex flex-col items-center justify-center border-b border-primary/10">
          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Portal de la Residencia</DialogTitle>
          <DialogDescription className="text-center mt-2">
            Inicia sesión para gestionar tus servicios y reservas.
          </DialogDescription>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
          <div className="space-y-2">
            <Label htmlFor="roomNumber">Habitación</Label>
            <Input 
              id="roomNumber" 
              placeholder="ej. 204" 
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="h-12 bg-gray-50/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input 
              id="password" 
              type="password"
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-gray-50/50"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 text-md font-semibold" 
            disabled={login.isPending}
          >
            {login.isPending ? "Iniciando sesión..." : "Entrar al Portal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
