import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Cartao, Pill, Titulo } from "@/components/inventario";
import {
  equipamentosQuery,
  fmtData,
  manutencoesQuery,
  movimentacoesQuery,
  rotuloLocal,
  statusGarantia,
  STATUS_EQUIP,
} from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel | Inventário de TI" }, { name: "description", content: "Visão geral dos equipamentos, garantias e manutenções da TI." }, { property: "og:title", content: "Painel | Inventário de TI" }, { property: "og:description", content: "Visão geral dos equipamentos, garantias e manutenções da TI." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(equipamentosQuery),
      context.queryClient.ensureQueryData(manutencoesQuery),
      context.queryClient.ensureQueryData(movimentacoesQuery),
    ]),
  component: Painel,
});

function Painel() {
  const { data: equips } = useSuspenseQuery(equipamentosQuery);
  const { data: mans } = useSuspenseQuery(manutencoesQuery);
  const { data: movs } = useSuspenseQuery(movimentacoesQuery);

  const abertas = mans.filter((m) => m.status !== "Concluída").length;
  const vencendo = equips.filter((e) => statusGarantia(e.garantia_ate) === "vencendo").length;

  const porSetor = new Map<string, number>();
  for (const e of equips) {
    const s = e.localizacoes?.setores?.nome ?? "Sem local";
    porSetor.set(s, (porSetor.get(s) ?? 0) + 1);
  }
  const setores = [...porSetor.entries()].sort((a, b) => b[1] - a[1]);
  const maior = setores[0]?.[1] ?? 1;

  const kpis = [
    { l: "Equipamentos", v: equips.length },
    { l: "Em uso", v: equips.filter((e) => e.status === "Em uso").length },
    { l: "Manutenções abertas", v: abertas },
    { l: "Garantias vencendo (30d)", v: vencendo },
  ];

  return (
    <>
      <Titulo titulo="Painel" sub="visão geral do parque de equipamentos" />
      <section className="grid grid-cols-2 gap-px overflow-hidden bg-line ring-1 ring-line md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className="bg-paper p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-ink">{k.l}</div>
            <div className="mt-3 font-mono text-3xl font-bold">{k.v}</div>
          </div>
        ))}
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <Cartao className="p-4">
          <h2 className="text-[13px] font-bold">Por status</h2>
          <ul className="mt-3 space-y-2 text-[12px]">
            {STATUS_EQUIP.map((s) => (
              <li key={s} className="flex items-center justify-between">
                <Pill texto={s} />
                <span className="font-mono">{equips.filter((e) => e.status === s).length}</span>
              </li>
            ))}
          </ul>
        </Cartao>
        <Cartao className="p-4 md:col-span-2">
          <h2 className="text-[13px] font-bold">Por setor</h2>
          <ul className="mt-3 space-y-3">
            {setores.map(([nome, v]) => (
              <li key={nome} className="text-[12px] font-medium">
                <div className="flex justify-between">
                  <span>{nome}</span>
                  <span className="font-mono text-muted-ink">{v}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(v / maior) * 100}%` }} />
                </div>
              </li>
            ))}
            {setores.length === 0 && <li className="text-[12px] text-muted-ink">Nenhum equipamento cadastrado.</li>}
          </ul>
        </Cartao>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <Cartao className="p-4">
          <h2 className="text-[13px] font-bold">Últimas movimentações</h2>
          <ul className="mt-3 divide-y divide-line text-[12px]">
            {movs.slice(0, 6).map((m) => (
              <li key={m.id} className="py-2">
                <Link to="/equipamentos/$id" params={{ id: m.equipamento_id }} className="font-semibold hover:underline">
                  {m.equipamentos?.patrimonio}
                </Link>{" "}
                <span className="text-muted-ink">
                  {rotuloLocal(m.origem)} → {rotuloLocal(m.destino)} · {fmtData(m.data)}
                </span>
              </li>
            ))}
            {movs.length === 0 && <li className="py-2 text-muted-ink">Nenhuma movimentação ainda.</li>}
          </ul>
        </Cartao>
        <Cartao className="p-4">
          <h2 className="text-[13px] font-bold">Manutenções recentes</h2>
          <ul className="mt-3 divide-y divide-line text-[12px]">
            {mans.slice(0, 6).map((m) => (
              <li key={m.id} className="flex items-center gap-2 py-2">
                <Link to="/equipamentos/$id" params={{ id: m.equipamento_id }} className="font-semibold hover:underline">
                  {m.equipamentos?.patrimonio}
                </Link>
                <span className="truncate text-muted-ink">{m.descricao}</span>
                <span className="ml-auto"><Pill texto={m.status} /></span>
              </li>
            ))}
            {mans.length === 0 && <li className="py-2 text-muted-ink">Nenhuma manutenção ainda.</li>}
          </ul>
        </Cartao>
      </section>
    </>
  );
}
