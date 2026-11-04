import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const STATUS_EQUIP = ["Em uso", "Em estoque", "Em manutenção", "Descartado"] as const;
export const STATUS_MANUT = ["Aberta", "Em andamento", "Concluída"] as const;
export const TIPOS_MANUT = ["Corretiva", "Preventiva", "Upgrade"] as const;

function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const localizacoesQuery = queryOptions({
  queryKey: ["localizacoes"],
  queryFn: async () =>
    ok(
      await supabase
        .from("localizacoes")
        .select("id, nome, setor_id, setores(nome)")
        .order("nome"),
    ),
});

export const setoresQuery = queryOptions({
  queryKey: ["setores"],
  queryFn: async () => ok(await supabase.from("setores").select("id, nome").order("nome")),
});

export const equipamentosQuery = queryOptions({
  queryKey: ["equipamentos"],
  queryFn: async () =>
    ok(
      await supabase
        .from("equipamentos")
        .select("*, localizacoes(nome, setores(nome))")
        .order("patrimonio"),
    ),
});

export const equipamentoQuery = (id: string) =>
  queryOptions({
    queryKey: ["equipamento", id],
    queryFn: async () => {
      const [e, mov, man, hist] = await Promise.all([
        supabase
          .from("equipamentos")
          .select("*, localizacoes(nome, setores(nome))")
          .eq("id", id)
          .single(),
        supabase
          .from("movimentacoes")
          .select(
            "*, origem:localizacoes!movimentacoes_origem_localizacao_id_fkey(nome, setores(nome)), destino:localizacoes!movimentacoes_destino_localizacao_id_fkey(nome, setores(nome))",
          )
          .eq("equipamento_id", id)
          .order("data", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("manutencoes")
          .select("*")
          .eq("equipamento_id", id)
          .order("data", { ascending: false }),
        supabase
          .from("historico_usuarios")
          .select("*")
          .eq("equipamento_id", id)
          .order("inicio", { ascending: false }),
      ]);
      return { equip: ok(e), movs: ok(mov), mans: ok(man), hist: ok(hist) };
    },
  });

export const manutencoesQuery = queryOptions({
  queryKey: ["manutencoes"],
  queryFn: async () =>
    ok(
      await supabase
        .from("manutencoes")
        .select("*, equipamentos(id, patrimonio, tipo, modelo)")
        .order("data", { ascending: false }),
    ),
});

export const movimentacoesQuery = queryOptions({
  queryKey: ["movimentacoes"],
  queryFn: async () =>
    ok(
      await supabase
        .from("movimentacoes")
        .select(
          "*, equipamentos(id, patrimonio, tipo), origem:localizacoes!movimentacoes_origem_localizacao_id_fkey(nome, setores(nome)), destino:localizacoes!movimentacoes_destino_localizacao_id_fkey(nome, setores(nome))",
        )
        .order("data", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});

type Loc = { nome: string; setores: { nome: string } | null } | null;
export function rotuloLocal(l: Loc) {
  if (!l) return "—";
  return `${l.setores?.nome ?? "?"} · ${l.nome}`;
}

export function fmtData(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s.length === 10 ? `${s}T12:00:00` : s);
  return d.toLocaleDateString("pt-BR");
}

/** Status da garantia relativo a uma data de referência. */
export function statusGarantia(garantiaAte: string | null, hoje = new Date()) {
  if (!garantiaAte) return "sem";
  const fim = new Date(`${garantiaAte}T23:59:59`);
  if (fim < hoje) return "vencida";
  const dias = (fim.getTime() - hoje.getTime()) / 86400000;
  return dias <= 30 ? "vencendo" : "vigente";
}
