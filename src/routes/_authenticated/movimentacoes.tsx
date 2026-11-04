import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Cartao, Titulo, Vazio } from "@/components/inventario";
import { fmtData, movimentacoesQuery, rotuloLocal } from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  head: () => ({ meta: [{ title: "Movimentações | Inventário de TI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(movimentacoesQuery),
  component: Pagina,
});

function Pagina() {
  const { data: movs } = useSuspenseQuery(movimentacoesQuery);
  return (
    <>
      <Titulo titulo="Movimentações" sub="registre novas movimentações na página de cada equipamento" />
      <Cartao className="overflow-auto">
        {movs.length === 0 ? (
          <Vazio texto="Nenhuma movimentação registrada." />
        ) : (
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-soft">
                {["Data", "Equipamento", "Origem", "Destino", "Usuário anterior", "Novo usuário", "Motivo"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {movs.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 font-mono">{fmtData(m.data)}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold">
                    <Link to="/equipamentos/$id" params={{ id: m.equipamento_id }} className="hover:underline">
                      {m.equipamentos?.patrimonio}
                    </Link>
                    <span className="ml-1 font-sans font-normal text-muted-ink">{m.equipamentos?.tipo}</span>
                  </td>
                  <td className="px-4 py-2.5">{rotuloLocal(m.origem)}</td>
                  <td className="px-4 py-2.5">{rotuloLocal(m.destino)}</td>
                  <td className="px-4 py-2.5">{m.usuario_anterior ?? "—"}</td>
                  <td className="px-4 py-2.5">{m.usuario_novo ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-ink">{m.motivo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>
    </>
  );
}
