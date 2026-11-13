import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cartao, Campo, Titulo, Vazio, selectCls } from "@/components/inventario";
import { suprimentosQuery, suprimentoMovimentosQuery } from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/suprimentos")({
  head: () => ({ meta: [{ title: "Suprimentos | Inventário de TI" }, { name: "description", content: "Controle de suprimentos de TI: quantidades, mínimos, entradas e saídas." }, { property: "og:title", content: "Suprimentos | Inventário de TI" }, { property: "og:description", content: "Controle de suprimentos de TI: quantidades, mínimos, entradas e saídas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(suprimentosQuery),
      context.queryClient.ensureQueryData(suprimentoMovimentosQuery),
    ]),
  component: SuprimentosConteudo,
});

const CATEGORIAS = ["Cabos", "Periféricos", "Impressão", "Rede", "Peças", "Outros"] as const;

export function SuprimentosConteudo() {
  const { data: itens } = useSuspenseQuery(suprimentosQuery);
  const { data: movs } = useSuspenseQuery(suprimentoMovimentosQuery);
  const qc = useQueryClient();

  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", categoria: CATEGORIAS[0] as string, especificacao: "", quantidade: "0", minimo: "1" });
  const [mov, setMov] = useState<{ id: string; tipo: "Entrada" | "Saída"; quantidade: string; destino: string } | null>(null);

  const baixos = itens.filter((i) => i.quantidade <= i.minimo);

  async function salvarNovo() {
    if (!form.nome.trim()) { toast.error("Informe o nome do suprimento"); return; }
    const { error } = await supabase.from("suprimentos").insert({
      nome: form.nome.trim().slice(0, 100),
      categoria: form.categoria,
      especificacao: form.especificacao.trim() || null,
      quantidade: Math.max(0, Number(form.quantidade) || 0),
      minimo: Math.max(0, Number(form.minimo) || 0),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Suprimento cadastrado");
    setNovo(false);
    setForm({ nome: "", categoria: CATEGORIAS[0], especificacao: "", quantidade: "0", minimo: "1" });
    qc.invalidateQueries();
  }

  async function confirmarMov() {
    if (!mov) return;
    const qtd = Number(mov.quantidade);
    if (!qtd || qtd <= 0) { toast.error("Informe uma quantidade válida"); return; }
    const item = itens.find((i) => i.id === mov.id);
    if (!item) return;
    if (mov.tipo === "Saída" && qtd > item.quantidade) { toast.error("Quantidade maior que o disponível"); return; }
    if (mov.tipo === "Saída" && !mov.destino.trim()) { toast.error("Informe o destino da saída"); return; }

    const novaQtd = mov.tipo === "Entrada" ? item.quantidade + qtd : item.quantidade - qtd;
    const { error: errMov } = await supabase.from("suprimento_movimentos").insert({
      suprimento_id: mov.id,
      tipo: mov.tipo,
      quantidade: qtd,
      destino: mov.tipo === "Saída" ? mov.destino.trim().slice(0, 100) : null,
    });
    if (errMov) { toast.error(errMov.message); return; }
    const { error: errUpd } = await supabase.from("suprimentos").update({ quantidade: novaQtd }).eq("id", mov.id);
    if (errUpd) { toast.error(errUpd.message); return; }
    toast.success(`${mov.tipo} registrada`);
    setMov(null);
    qc.invalidateQueries();
  }

  const th = "px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-ink";
  const td = "px-3 py-2";

  return (
    <>
      <Titulo
        titulo="Suprimentos"
        sub={`${itens.length} itens cadastrados · ${baixos.length} abaixo do mínimo`}
        acao={<Button onClick={() => setNovo(true)}>+ Cadastrar suprimento</Button>}
      />

      {novo && (
        <Cartao className="mb-4 p-4">
          <h2 className="mb-3 text-[14px] font-bold">Novo suprimento</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Campo label="Nome">
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={100} />
            </Campo>
            <Campo label="Categoria">
              <select className={selectCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
            <Campo label="Especificação (opcional)">
              <Input value={form.especificacao} onChange={(e) => setForm({ ...form, especificacao: e.target.value })} maxLength={200} />
            </Campo>
            <Campo label="Quantidade inicial">
              <Input type="number" min={0} value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
            </Campo>
            <Campo label="Estoque mínimo">
              <Input type="number" min={0} value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} />
            </Campo>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={salvarNovo}>Salvar</Button>
            <Button variant="ghost" onClick={() => setNovo(false)}>Cancelar</Button>
          </div>
        </Cartao>
      )}

      {baixos.length > 0 && (
        <Cartao className="mb-4 p-4">
          <h2 className="mb-2 text-[14px] font-bold text-warn">Abaixo do estoque mínimo</h2>
          <ul className="divide-y divide-line text-[12.5px]">
            {baixos.map((i) => (
              <li key={i.id} className="flex justify-between py-1">
                <span>{i.nome}</span>
                <span><b>{i.quantidade}</b> em estoque · mínimo {i.minimo}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Cartao className="mb-4">
        <h2 className="px-4 pt-4 text-[14px] font-bold">Itens</h2>
        {itens.length === 0 ? <Vazio texto="Nenhum suprimento cadastrado." /> : (
          <table className="w-full text-[12.5px]">
            <thead><tr><th className={th}>Nome</th><th className={th}>Categoria</th><th className={th}>Especificação</th><th className={th}>Quantidade</th><th className={th}>Mínimo</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {itens.map((i) => (
                <tr key={i.id}>
                  <td className={`${td} font-medium`}>{i.nome}</td>
                  <td className={td}>{i.categoria}</td>
                  <td className={td}>{i.especificacao ?? "—"}</td>
                  <td className={td}>
                    <b className={i.quantidade <= i.minimo ? "text-warn" : ""}>{i.quantidade}</b>
                  </td>
                  <td className={td}>{i.minimo}</td>
                  <td className={td}>
                    {mov?.id === i.id ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <Campo label="Tipo">
                          <select className={selectCls} value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value as "Entrada" | "Saída" })}>
                            <option value="Entrada">Entrada</option>
                            <option value="Saída">Saída</option>
                          </select>
                        </Campo>
                        <Campo label="Quantidade">
                          <Input type="number" min={1} value={mov.quantidade} onChange={(e) => setMov({ ...mov, quantidade: e.target.value })} />
                        </Campo>
                        {mov.tipo === "Saída" && (
                          <Campo label="Destino">
                            <Input value={mov.destino} onChange={(e) => setMov({ ...mov, destino: e.target.value })} maxLength={100} />
                          </Campo>
                        )}
                        <Button size="sm" onClick={confirmarMov}>Confirmar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setMov(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setMov({ id: i.id, tipo: "Saída", quantidade: "1", destino: "" })}>Movimentar</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>

      <Cartao>
        <h2 className="px-4 pt-4 text-[14px] font-bold">Histórico de movimentações</h2>
        {movs.length === 0 ? <Vazio texto="Nenhuma movimentação ainda." /> : (
          <table className="w-full text-[12.5px]">
            <thead><tr><th className={th}>Data</th><th className={th}>Tipo</th><th className={th}>Item</th><th className={th}>Quantidade</th><th className={th}>Destino</th></tr></thead>
            <tbody className="divide-y divide-line">
              {movs.map((m) => (
                <tr key={m.id}>
                  <td className={`${td} font-mono`}>{new Date(m.created_at).toLocaleString("pt-BR")}</td>
                  <td className={td}><span className={m.tipo === "Entrada" ? "font-semibold text-ok" : "font-semibold text-warn"}>{m.tipo}</span></td>
                  <td className={td}>{m.suprimentos?.nome ?? "—"}</td>
                  <td className={td}>{m.quantidade}</td>
                  <td className={td}>{m.destino ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>
    </>
  );
}
