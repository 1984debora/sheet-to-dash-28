import { usePapel } from "@/hooks/use-papel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cartao, Pill, Titulo, Vazio, selectCls } from "@/components/inventario";
import { ContasMoveisPainel } from "@/components/contas-moveis";
import { EquipamentoForm } from "@/components/equipamento-form";
import { equipamentosQuery, fmtData, localizacoesQuery, rotuloLocal, statusGarantia, STATUS_EQUIP } from "@/lib/inventario";
import { baixarEtiquetasLote } from "@/lib/etiqueta";
import { toast } from "sonner";
import { Printer } from "lucide-react";


export const Route = createFileRoute("/_authenticated/equipamentos/")({
  head: () => ({ meta: [{ title: "Equipamentos | Inventário de TI" }, { name: "description", content: "Inventário e cadastro dos equipamentos da equipe de TI." }, { property: "og:title", content: "Equipamentos | Inventário de TI" }, { property: "og:description", content: "Inventário e cadastro dos equipamentos da equipe de TI." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
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
  const { podeEditar } = usePapel();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [aba, setAba] = useState<"equip" | "contas">("equip");

  // 1. Filtragem da busca e status
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

  // 2. Estados e funções de seleção para impressão de etiquetas
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [gerandoEtiquetas, setGerandoEtiquetas] = useState(false);

  const todosFiltradosSelecionados = filtrados.length > 0 && filtrados.every((e) => selecionados.includes(e.id));
  
  const toggleTodos = () => {
    if (todosFiltradosSelecionados) {
      setSelecionados([]);
    } else {
      setSelecionados(filtrados.map((e) => e.id));
    }
  };

  const toggleUm = (id: string) => {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const imprimirLote = async (itens: typeof equips) => {
    if (itens.length === 0) return;
    setGerandoEtiquetas(true);
    try {
      await baixarEtiquetasLote(itens);
      toast.success(`${itens.length} etiquetas geradas no PDF!`);
    } catch {
      toast.error("Não foi possível gerar as etiquetas.");
    } finally {
      setGerandoEtiquetas(false);
    }
  };

  return (
    <>
      <Titulo
        titulo="Equipamentos"
        sub={`${equips.length} cadastrados`}
        acao={podeEditar && <Button onClick={() => setNovo(true)}>+ Novo equipamento</Button>}
      />
      {podeEditar && (
        <div className="mb-3 flex gap-2">
          <Button size="sm" variant={aba === "equip" ? "default" : "outline"} onClick={() => setAba("equip")}>Equipamentos</Button>
          <Button size="sm" variant={aba === "contas" ? "default" : "outline"} onClick={() => setAba("contas")}>Contas de e-mail (celulares/tablets)</Button>
        </div>
      )}
      {aba === "contas" && podeEditar ? <ContasMoveisPainel /> : (
      <Cartao className="overflow-hidden">
        {/* Barra superior de busca, status e botões de impressão */}
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

          {/* Botões de impressão em lote */}
          <div className="flex items-center gap-2">
            {selecionados.length > 0 && (
              <Button
                size="sm"
                onClick={() => imprimirLote(equips.filter((e) => selecionados.includes(e.id)))}
                disabled={gerandoEtiquetas}
              >
                <Printer className="size-4 mr-1" />
                Imprimir selecionados ({selecionados.length})
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => imprimirLote(filtrados)}
              disabled={gerandoEtiquetas || filtrados.length === 0}
              title="Gera etiqueta de todos que aparecem na busca/filtro atual"
            >
              <Printer className="size-4 mr-1" />
              Imprimir filtro ({filtrados.length})
            </Button>
          </div>

          <span className="ml-auto font-mono text-[11px] text-muted-ink">exibindo {filtrados.length}</span>
        </div>

        {/* Tabela de equipamentos com caixas de seleção */}
        <div className="overflow-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-soft">
                <th className="px-4 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={todosFiltradosSelecionados}
                    onChange={toggleTodos}
                    className="size-4 rounded border-line cursor-pointer"
                    title="Selecionar todos os filtrados"
                  />
                </th>
                {["Patrimônio", "Tipo / Modelo", "Nº série", "Usuário", "Setor · Local", "Garantia", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtrados.map((e) => {
                const g = statusGarantia(e.garantia_ate);
                const selecionado = selecionados.includes(e.id);
                return (
                  <tr key={e.id} className={`hover:bg-ink/[0.02] ${selecionado ? "bg-ink/[0.04]" : ""}`}>
                    <td className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() => toggleUm(e.id)}
                        className="size-4 rounded border-line cursor-pointer"
                      />
                    </td>
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
      )}
      {novo && <EquipamentoForm aberto onClose={() => setNovo(false)} />}
    </>
  );
}
