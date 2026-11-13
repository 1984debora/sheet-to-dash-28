import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Papel = "admin" | "tecnico" | "usuario";
export const papelQuery = queryOptions({
  queryKey: ["meu-papel"],
  queryFn: async (): Promise<Papel> => {
    const { data, error } = await supabase.rpc("meu_papel");
    if (error) throw new Error(error.message);
    return (data as Papel) ?? "usuario";
  },
  staleTime: 60_000,
});

/** UI-only hint; the database policies enforce the real permissions. */
export function usePapel() {
  const { data } = useQuery(papelQuery);
  const papel: Papel = data ?? "usuario";
  return { papel, carregado: data !== undefined, podeEditar: papel !== "usuario", ehAdmin: papel === "admin" };
}
