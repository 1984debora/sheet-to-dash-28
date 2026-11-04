import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Cartao, Pill, Titulo, Vazio, selectCls } from "@/components/inventario";
import { fmtData, manutencoesQuery, STATUS_MANUT } from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/manutencoes")({
  head: () => ({ meta: [{ title: "Manutenções | Inventário de TI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(manutencoesQuery),
  component: Pagina,
});

function Pagina() {
  const { data: mans } = useSuspenseQuery(manutencoesQuery);
  const [status, setStatus] = useState("todos");
  const lista = mans.filter((m) => status === "todos" || m.status === status);
  const total = lista.reduce((s, m) => s + Number(m.custo ?? 0), 0);

  return (
    <>
      <Titulo
        titulo="Manutenções"
        sub={`custo total exibido: ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
        acao={
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} w-auto`}>
            <option value="todos">Status: todos</option>
            {STATUS_MANUT.map((s) => <option key={s}>{s}</option>)}
          </select>
        }
      />
      <Cartao className="overflow-auto">
        {lista.length === 0 ? (
          <Vazio texto="Nenhuma manutenção encontrada." />
        ) : (
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-soft">
                {["Data", "Equipamento", "Tipo", "Descrição", "Técnico", "Custo", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lista.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 font-mono">{fmtData(m.data)}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold">
                    <Link to="/equipamentos/$id" params={{ id: m.equipamento_id }} className="hover:underline">
                      {m.equipamentos?.patrimonio}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{m.tipo}</td>
                  <td className="px-4 py-2.5">{m.descricao}</td>
                  <td className="px-4 py-2.5">{m.tecnico ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono">
                    {m.custo != null ? Number(m.custo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                  </td>
                  <td className="px-4 py-2.5"><Pill texto={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>
    </>
  );
}
