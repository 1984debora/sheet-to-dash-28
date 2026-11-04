import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inventário de TI | Gestão de equipamentos" },
      {
        name: "description",
        content: "Plataforma interna para gerenciar equipamentos, movimentações e manutenções da TI.",
      },
      { property: "og:title", content: "Inventário de TI" },
      {
        property: "og:description",
        content: "Equipamentos, setores, localizações, movimentações e manutenções em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/painel" : "/auth" });
  },
});
