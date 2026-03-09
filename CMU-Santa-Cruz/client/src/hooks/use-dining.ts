import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertDiningOptOut } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useDiningOptOuts() {
  return useQuery({
    queryKey: [api.dining.list.path],
    queryFn: async () => {
      const res = await fetch(api.dining.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dining opt-outs");
      return api.dining.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDiningOptOut() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertDiningOptOut) => {
      const res = await fetch(api.dining.create.path, {
        method: api.dining.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to log opt-out");
      return api.dining.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dining.list.path] });
      toast({ title: "Meal skipped", description: "We've logged that you won't be eating here." });
    },
  });
}

export function useDeleteDiningOptOut() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.dining.delete.path, { id });
      const res = await fetch(url, { method: api.dining.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to remove opt-out");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dining.list.path] });
      toast({ title: "Opt-out reversed", description: "You are back on the list for this meal." });
    },
  });
}
