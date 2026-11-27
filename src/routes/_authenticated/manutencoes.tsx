import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Cartao, Pill, Titulo, Vazio, Campo, selectCls } from "@/components/inventario";
import { fmtData, manutencoesQuery, STATUS_MANUT, STATUS_EQUIP } from "@/lib/inventario";
import { usePapel } from "@/hooks/use-papel";

export const Route = createFileRoute("/_authenticated/manutencoes")({
  head: () => ({
    meta: [
      { title: "Manutenções | Inventário de TI" },
      { name: "description", content: "Acompanhamento de manutenções e custos dos equipamentos." },
      { property: "og:title", content: "Manutenções | Inventário de TI" },
      { property: "og:description", content: "Acompanhamento de manutenções e custos dos equipamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(manutencoesQuery),
  component: Pagina,
});

function Pagina() {
  const { data: mans } = useSuspenseQuery(manutencoesQuery);
  const { podeEditar } = usePapel();
  const [status, setStatus] = useState("todos");
  const [editando, setEditando] = useState<any | null>(null);

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
                {["Data", "Equipamento", "Tipo", "Descrição / Observações", "Técnico", "Custo", "Status", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lista.map((m: any) => (
                <tr key={m.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-2.5 font-mono">{fmtData(m.data)}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold">
                    <Link to="/equipamentos/$id" params={{ id: m.equipamento_id }} className="hover:underline">
                      {m.equipamentos?.patrimonio}
                    </Link>
                    <span className="ml-1 block font-sans text-[11px] font-normal text-muted-ink">
                      {m.equipamentos?.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{m.tipo}</td>
                  <td className="px-4 py-2.5 max-w-xs">
                    <div className="font-medium text-ink">{m.descricao}</div>
                    {m.observacoes && (
                      <div className="mt-1 text-[11.5px] text-muted-ink italic bg-ink/[0.03] p-1.5 rounded border border-line">
                        <span className="font-semibold not-italic text-ink">Obs: </span>
                        {m.observacoes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{m.tecnico ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap">
                    {m.custo != null ? Number(m.custo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Pill texto={m.status} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {podeEditar && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditando(m)}
                        className="h-7 gap-1 px-2 text-[11.5px]"
                      >
                        <Pencil className="size-3" />
                        Editar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>

      {editando && (
        <EditarManutencaoDialog
          manut={editando}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  );
}

function EditarManutencaoDialog({
  manut,
  onClose,
}: {
  manut: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(manut.status ?? "Aberta");
  const [observacoes, setObservacoes] = useState(manut.observacoes ?? "");
  const [tecnico, setTécnico] = useState(manut.tecnico ?? "");
  const [custo, setCusto] = useState(manut.custo != null ? String(manut.custo) : "");
  const [salvando, setSalvando] = useState(false);

  // Se a manutenção for concluída, permite escolher como fica o status do aparelho
  const [statusEquipamento, setStatusEquipamento] = useState<string>("Em estoque");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const custoNum = custo.trim() ? Number(custo.replace(",", ".")) : null;

    // 1. Atualiza os dados da manutenção
    const { error: errManut } = await supabase
      .from("manutencoes")
      .update({
        status,
        observacoes: observacoes.trim() || null,
        tecnico: tecnico.trim() || null,
        custo: isNaN(custoNum as number) ? null : custoNum,
      } as any)
      .eq("id", manut.id);

    if (errManut) {
      setSalvando(false);
      toast.error(`Erro ao atualizar manutenção: ${errManut.message}`);
      return;
    }

    // 2. Se mudou para Concluída e o usuário optou por mudar o status da máquina
    if (status === "Concluída" && statusEquipamento !== "manter" && manut.equipamento_id) {
      await supabase
        .from("equipamentos")
        .update({ status: statusEquipamento })
        .eq("id", manut.equipamento_id);
    }

    setSalvando(false);
    toast.success("Manutenção atualizada com sucesso!");
    await qc.invalidateQueries({ queryKey: ["manutencoes"] });
    await qc.invalidateQueries({ queryKey: ["equipamentos"] });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Manutenção</DialogTitle>
        </DialogHeader>

        <form onSubmit={salvar} className="space-y-3.5">
          <div className="rounded-md bg-ink/[0.03] p-2.5 border border-line text-[12px]">
            <p className="font-semibold text-ink">
              Patrimônio: {manut.equipamentos?.patrimonio}
              <span className="font-normal text-muted-ink ml-1">({manut.equipamentos?.tipo})</span>
            </p>
            <p className="text-muted-ink mt-0.5 line-clamp-2">
              <span className="font-medium text-ink">Descrição inicial:</span> {manut.descricao}
            </p>
          </div>

          <Campo label="Status da manutenção *">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectCls}
            >
              {STATUS_MANUT.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Campo>

          <Campo label="Observações de conclusão / andamento">
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Troca de memória RAM concluída, testes de estresse finalizados sem erros. Equipamento liberado."
              rows={3}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Técnico / Empresa">
              <Input
                value={tecnico}
                onChange={(e) => setTécnico(e.target.value)}
                placeholder="Ex: Sara / Debora"
              />
            </Campo>

            <Campo label="Custo final (R$)">
              <Input
                inputMode="decimal"
                value={custo}
                onChange={(e) => setCusto(e.target.value)}
                placeholder="0,00"
              />
            </Campo>
          </div>

          {status === "Concluída" && (
            <div className="rounded-md border border-line bg-ok/5 p-3 space-y-1.5">
              <label className="text-[12px] font-semibold text-ink block">
                Ao concluir, atualizar o equipamento para:
              </label>
              <select
                value={statusEquipamento}
                onChange={(e) => setStatusEquipamento(e.target.value)}
                className={selectCls}
              >
                <option value="Em estoque">Em estoque (disponível no TI)</option>
                <option value="Em uso">Em uso (devolvido ao colaborador)</option>
                <option value="manter">Manter status atual ({manut.equipamentos?.status ?? "inalterado"})</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
