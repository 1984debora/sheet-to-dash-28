import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cartao, Pill, Titulo, Vazio, selectCls } from "@/components/inventario";
import { EquipamentoForm } from "@/components/equipamento-form";
import { equipamentosQuery, fmtData, localizacoesQuery, rotuloLocal, statusGarantia, STATUS_EQUIP } from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/equipamentos/")({
  head: () => ({ meta: [{ title: "Equipamentos | Inventário de TI" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(equipamentosQuery),
      context.queryClient.ensureQueryData(localizacoesQuery),
    ]),
  component: Lista,
});

function Lista() {
  const { data: equips } = useSuspenseQuery(equipamentosQuery);
  const [novo, setNovo] = useState(false);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return equips.filter(
      (e) =>
        (status === "todos" || e.status === status) &&
        (!q ||
          [e.patrimonio, e.numero_serie, e.tipo, e.marca, e.modelo, e.usuario_responsavel, e.localizacoes?.setores?.nome]
            .some((v) => v?.toLowerCase().includes(q))),
    );
  }, [equips, busca, status]);

  return (
    <>
      <Titulo
        titulo="Equipamentos"
        sub={`${equips.length} cadastrados`}
        acao={<Button onClick={() => setNovo(true)}>+ Novo equipamento</Button>}
      />
      <Cartao className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar patrimônio, série, modelo, usuário, setor…"
            className="h-8 w-full rounded-md border border-line bg-paper px-3 text-[12px] sm:w-80"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} h-8 w-auto text-[12px]`}>
            <option value="todos">Status: todos</option>
            {STATUS_EQUIP.map((s) => <option key={s}>{s}</option>)}
          </select>
          <span className="ml-auto font-mono text-[11px] text-muted-ink">exibindo {filtrados.length}</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-soft">
                {["Patrimônio", "Tipo / Modelo", "Nº série", "Usuário", "Setor · Local", "Garantia", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtrados.map((e) => {
                const g = statusGarantia(e.garantia_ate);
                return (
                  <tr key={e.id} className="hover:bg-ink/[0.02]">
                    <td className="px-4 py-2.5 font-mono font-semibold">
                      <Link to="/equipamentos/$id" params={{ id: e.id }} className="hover:underline">{e.patrimonio}</Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{e.tipo}</div>
                      <div className="text-[11px] text-muted-ink">{[e.marca, e.modelo].filter(Boolean).join(" ")}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted-ink">{e.numero_serie ?? "—"}</td>
                    <td className="px-4 py-2.5">{e.usuario_responsavel ?? "—"}</td>
                    <td className="px-4 py-2.5">{rotuloLocal(e.localizacoes)}</td>
                    <td className={`px-4 py-2.5 font-mono ${g === "vencida" ? "text-crit" : g === "vencendo" ? "text-warn" : "text-muted-ink"}`}>
                      {fmtData(e.garantia_ate)}
                    </td>
                    <td className="px-4 py-2.5"><Pill texto={e.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtrados.length === 0 && <Vazio texto="Nenhum equipamento encontrado." />}
        </div>
      </Cartao>
      {novo && <EquipamentoForm aberto onClose={() => setNovo(false)} />}
    </>
  );
}
