import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useAuth } from "@/store/use-auth";
import type { InsertUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useLogin() {
  const { setUser } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await fetch(api.users.login.path, {
        method: api.users.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to login");
      }
      
      return api.users.login.responses[200].parse(await res.json());
    },
    onSuccess: (user) => {
      setUser(user);
      toast({
        title: "Welcome back",
        description: `Logged in as ${user.username}`,
      });
    },
    onError: () => {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  });
}
