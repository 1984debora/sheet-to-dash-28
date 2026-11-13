import { usePapel } from "@/hooks/use-papel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cartao, Campo, Pill, Titulo, Vazio, selectCls } from "@/components/inventario";
import { EquipamentoForm } from "@/components/equipamento-form";
import { TermoDialog } from "@/components/termo-dialog";
import { disponivelNoEstoque } from "@/lib/estoque-regras";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuprimentosConteudo } from "./suprimentos";
import { MovimentacoesConteudo } from "./movimentacoes";
import { movimentacoesQuery, suprimentosQuery, suprimentoMovimentosQuery, equipamentosQuery, estoqueMovimentosQuery, localizacoesQuery, rotuloLocal } from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Estoque de TI | Inventário de TI" }, { name: "description", content: "Equipamentos disponíveis, entradas, saídas e termos de entrega." }, { property: "og:title", content: "Estoque de TI | Inventário de TI" }, { property: "og:description", content: "Equipamentos disponíveis, entradas, saídas e termos de entrega." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(equipamentosQuery),
      context.queryClient.ensureQueryData(estoqueMovimentosQuery),
      context.queryClient.ensureQueryData(localizacoesQuery),
      context.queryClient.ensureQueryData(movimentacoesQuery),
      context.queryClient.ensureQueryData(suprimentosQuery),
      context.queryClient.ensureQueryData(suprimentoMovimentosQuery),
    ]),
  component: Pagina,
});

function Pagina() {
  const gatilho = "rounded-md px-4 py-1.5 text-[13px] font-semibold data-[state=active]:bg-brand data-[state=active]:text-primary-foreground";
  return (
    <Tabs defaultValue="estoque">
      <TabsList className="mb-4 h-auto gap-1 bg-card p-1 border border-line">
        <TabsTrigger value="estoque" className={gatilho}>Estoque</TabsTrigger>
        <TabsTrigger value="historico" className={gatilho}>Histórico</TabsTrigger>
        <TabsTrigger value="suprimentos" className={gatilho}>Suprimentos</TabsTrigger>
        <TabsTrigger value="movimentacoes" className={gatilho}>Movimentações</TabsTrigger>
      </TabsList>
      <TabsContent value="estoque"><EstoqueConteudo semHistorico /></TabsContent>
      <TabsContent value="historico"><HistoricoEstoque /></TabsContent>
      <TabsContent value="suprimentos"><SuprimentosConteudo /></TabsContent>
      <TabsContent value="movimentacoes"><MovimentacoesConteudo /></TabsContent>
    </Tabs>
  );
}

function HistoricoEstoque() {
  const { data: movs } = useSuspenseQuery(estoqueMovimentosQuery);
  const th = "px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-ink";
  const td = "px-3 py-2";
  return <TabelaHistorico movs={movs} th={th} td={td} />;
}

export function EstoqueConteudo({ localPadrao, semHistorico }: { localPadrao?: string | undefined; semHistorico?: boolean }) {
  const { data: equips } = useSuspenseQuery(equipamentosQuery);
  const { data: movs } = useSuspenseQuery(estoqueMovimentosQuery);
  const { data: locais } = useSuspenseQuery(localizacoesQuery);
  const qc = useQueryClient();
  const estoque = equips.filter(disponivelNoEstoque);
  const fora = equips.filter((e) => e.status !== "Em estoque" && e.status !== "Descartado");
  const porTipo = Object.entries(
    estoque.reduce<Record<string, number>>((a, e) => ((a[e.tipo] = (a[e.tipo] ?? 0) + 1), a), {}),
  ).sort((a, b) => b[1] - a[1]);

  const [novo, setNovo] = useState(false);
  const { podeEditar } = usePapel();
  const [saida, setSaida] = useState<{ id: string; usuario: string; local: string } | null>(null);
  const [entradaId, setEntradaId] = useState("");
  const [termo, setTermo] = useState<{ equip: (typeof equips)[number]; setor: string } | null>(null);

  async function confirmarSaida() {
    if (!saida) return;
    if (!saida.usuario.trim()) { toast.error("Informe quem recebe o equipamento"); return; }
    const { error } = await supabase.from("equipamentos").update({
      status: "Em uso",
      usuario_responsavel: saida.usuario.trim().slice(0, 100),
      ...(saida.local ? { localizacao_id: saida.local } : {}),
    }).eq("id", saida.id);
    if (error) { toast.error(error.message); return; }
    const entregue = equips.find(e => e.id === saida.id);
    const destino = locais.find(l => l.id === saida.local);
    if (entregue) setTermo({ equip: { ...entregue, usuario_responsavel: saida.usuario.trim() }, setor: destino?.setores?.nome ?? entregue.localizacoes?.setores?.nome ?? "" });
    toast.success("Saída registrada");
    setSaida(null);
    qc.invalidateQueries();
  }

  async function registrarEntrada() {
    if (!entradaId) { toast.error("Escolha o equipamento"); return; }
    const { error } = await supabase.from("equipamentos")
      .update({ status: "Em estoque", usuario_responsavel: null }).eq("id", entradaId);
    if (error) { toast.error(error.message); return; }
    toast.success("Entrada registrada");
    setEntradaId("");
    qc.invalidateQueries();
  }

  const th = "px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-ink";
  const td = "px-3 py-2";

  return (
    <>
      <Titulo
        titulo="Estoque da TI"
        sub={`${estoque.length} equipamentos disponíveis para entrega`}
        acao={podeEditar && <Button onClick={() => setNovo(true)}>+ Cadastrar no estoque</Button>}
      />
      {novo && <EquipamentoForm aberto statusPadrao="Em estoque" localPadrao={localPadrao} onClose={() => setNovo(false)} />}
      {termo && <TermoDialog equip={termo.equip} setor={termo.setor} onClose={() => setTermo(null)} />}

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Cartao className="p-4">
          <h2 className="mb-2 text-[14px] font-bold">Disponível por tipo</h2>
          {porTipo.length === 0 ? <Vazio texto="Estoque vazio." /> : (
            <ul className="divide-y divide-line text-[12.5px]">
              {porTipo.map(([t, n]) => <li key={t} className="flex justify-between py-1"><span>{t}</span><b>{n}</b></li>)}
            </ul>
          )}
        </Cartao>
        <Cartao className="p-4">
          <h2 className="mb-2 text-[14px] font-bold">Registrar entrada (devolução ao estoque)</h2>
          <div className="flex gap-2">
            <select className={selectCls} value={entradaId} onChange={(e) => setEntradaId(e.target.value)}>
              <option value="">Escolha um equipamento em uso…</option>
              {fora.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.patrimonio} · {e.tipo} {e.usuario_responsavel ? `· ${e.usuario_responsavel}` : ""}
                </option>
              ))}
            </select>
            <Button onClick={registrarEntrada}>Dar entrada</Button>
          </div>
        </Cartao>
      </div>

      <Cartao className="mb-4">
        <h2 className="px-4 pt-4 text-[14px] font-bold">Equipamentos em estoque</h2>
        {estoque.length === 0 ? <Vazio texto="Nenhum equipamento em estoque." /> : (
          <table className="w-full text-[12.5px]">
            <thead><tr><th className={th}>Patrimônio</th><th className={th}>Tipo</th><th className={th}>Marca / Modelo</th><th className={th}>Local</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {estoque.map((e) => (
                <tr key={e.id}>
                  <td className={td}><Link to="/equipamentos/$id" params={{ id: e.id }} className="font-mono hover:text-brand">{e.patrimonio}</Link></td>
                  <td className={td}>{e.tipo}</td>
                  <td className={td}>{[e.marca, e.modelo].filter(Boolean).join(" ") || "—"}</td>
                  <td className={td}>{rotuloLocal(e.localizacoes)}</td>
                  <td className={td}>
                    {saida?.id === e.id ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <Campo label="Entregar para">
                          <Input value={saida.usuario} onChange={(ev) => setSaida({ ...saida, usuario: ev.target.value })} maxLength={100} />
                        </Campo>
                        <Campo label="Destino">
                          <select className={selectCls} value={saida.local} onChange={(ev) => setSaida({ ...saida, local: ev.target.value })}>
                            <option value="">Manter local</option>
                            {locais.map((l) => <option key={l.id} value={l.id}>{rotuloLocal(l)}</option>)}
                          </select>
                        </Campo>
                        <Button size="sm" onClick={confirmarSaida}>Confirmar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setSaida(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setSaida({ id: e.id, usuario: "", local: "" })}>Dar saída</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>

      {!semHistorico && <TabelaHistorico movs={movs} th={th} td={td} />}
    </>
  );
}

function TabelaHistorico({ movs, th, td }: { movs: Array<any>; th: string; td: string }) {
  return (
      <Cartao>
        <h2 className="px-4 pt-4 text-[14px] font-bold">Histórico de entradas e saídas</h2>
        {movs.length === 0 ? <Vazio texto="Nenhuma movimentação de estoque ainda." /> : (
          <table className="w-full text-[12.5px]">
            <thead><tr><th className={th}>Data</th><th className={th}>Tipo</th><th className={th}>Equipamento</th><th className={th}>Usuário</th><th className={th}>Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {movs.map((m: any) => (
                <tr key={m.id}>
                  <td className={`${td} font-mono`}>{new Date(m.created_at).toLocaleString("pt-BR")}</td>
                  <td className={td}><span className={m.tipo === "Entrada" ? "font-semibold text-ok" : m.tipo === "Saída" ? "font-semibold text-warn" : "font-semibold text-brand"}>{m.tipo}</span></td>
                  <td className={td}>{m.equipamentos ? <Link to="/equipamentos/$id" params={{ id: m.equipamentos.id }} className="font-mono hover:text-brand">{m.equipamentos.patrimonio}</Link> : "—"} {m.equipamentos?.tipo}</td>
                  <td className={td}>{m.usuario ?? "—"}</td>
                  <td className={td}>{m.status_anterior ? <><Pill texto={m.status_anterior} /> → </> : null}{m.status_novo && <Pill texto={m.status_novo} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>
  );
}
