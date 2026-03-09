import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertGymBooking } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useGymBookings() {
  return useQuery({
    queryKey: [api.gym.list.path],
    queryFn: async () => {
      const res = await fetch(api.gym.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch gym bookings");
      return api.gym.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateGymBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertGymBooking) => {
      const res = await fetch(api.gym.create.path, {
        method: api.gym.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create booking");
      return api.gym.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.gym.list.path] });
      toast({ title: "Gym booked", description: "You are set for a workout!" });
    },
    onError: () => {
      toast({ title: "Booking failed", variant: "destructive" });
    }
  });
}

export function useDeleteGymBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.gym.delete.path, { id });
      const res = await fetch(url, { method: api.gym.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete booking");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.gym.list.path] });
      toast({ title: "Booking cancelled", description: "Gym session removed." });
    },
  });
}
