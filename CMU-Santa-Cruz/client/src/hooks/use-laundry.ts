import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertLaundryBooking } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useLaundryBookings() {
  return useQuery({
    queryKey: [api.laundry.list.path],
    queryFn: async () => {
      const res = await fetch(api.laundry.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch laundry bookings");
      return api.laundry.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateLaundryBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertLaundryBooking) => {
      const res = await fetch(api.laundry.create.path, {
        method: api.laundry.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create booking");
      return api.laundry.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.laundry.list.path] });
      toast({ title: "Booking confirmed", description: "Your laundry slot is reserved." });
    },
    onError: () => {
      toast({ title: "Booking failed", description: "That slot might be taken.", variant: "destructive" });
    }
  });
}

export function useDeleteLaundryBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.laundry.delete.path, { id });
      const res = await fetch(url, { method: api.laundry.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete booking");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.laundry.list.path] });
      toast({ title: "Booking cancelled", description: "Your slot has been freed up." });
    },
  });
}
