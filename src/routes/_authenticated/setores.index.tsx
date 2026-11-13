import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cartao, Titulo } from "@/components/inventario";
import { CATEGORIAS_SETOR, equipamentosQuery, localizacoesQuery, setoresQuery } from "@/lib/inventario";
import { usePapel } from "@/hooks/use-papel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/setores/")({
  head: () => ({ meta: [{ title: "Setores e locais | Inventário de TI" }, { name: "description", content: "Cadastro de setores e localizações do inventário de TI." }, { property: "og:title", content: "Setores e locais | Inventário de TI" }, { property: "og:description", content: "Cadastro de setores e localizações do inventário de TI." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(setoresQuery),
      context.queryClient.ensureQueryData(localizacoesQuery),
      context.queryClient.ensureQueryData(equipamentosQuery),
    ]),
  component: Pagina,
});

function Pagina() {
  const { data: setores } = useSuspenseQuery(setoresQuery);
  const { data: locais } = useSuspenseQuery(localizacoesQuery);
  const { data: equips } = useSuspenseQuery(equipamentosQuery);
  const qc = useQueryClient();
  const [novoSetor, setNovoSetor] = useState("");
  const [novoLocal, setNovoLocal] = useState<Record<string, string>>({});
  const [aba, setAba] = useState<string>("Lojas");
  const { podeEditar, ehAdmin } = usePapel();
  const visiveis = aba === "Todos" ? setores : setores.filter((s) => s.categoria === aba);

  async function mudarCategoria(id: string, categoria: string) {
    const { error } = await supabase.from("setores").update({ categoria }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
  }

  async function addSetor(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoSetor.trim().slice(0, 80);
    if (!nome) return;
    const { error } = await supabase.from("setores").insert({ nome, categoria: aba === "Todos" ? "Lojas" : aba });
    if (error) { toast.error(error.message.includes("duplicate") ? "Setor já existe" : error.message); return; }
    setNovoSetor("");
    qc.invalidateQueries();
  }

  async function addLocal(setorId: string) {
    const nome = (novoLocal[setorId] ?? "").trim().slice(0, 80);
    if (!nome) return;
    const { error } = await supabase.from("localizacoes").insert({ setor_id: setorId, nome });
    if (error) { toast.error(error.message); return; }
    setNovoLocal((p) => ({ ...p, [setorId]: "" }));
    qc.invalidateQueries();
  }

  async function remover(tabela: "setores" | "localizacoes", id: string, nome: string) {
    if (!confirm(`Remover "${nome}"? Equipamentos nele ficarão sem local.`)) return;
    const { error } = await supabase.from(tabela).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
  }

  const qtd = (localId: string) => equips.filter((e) => e.localizacao_id === localId).length;

  return (
    <>
      <Titulo
        titulo="Setores e localizações"
        sub="onde cada equipamento está sendo usado"
        acao={podeEditar &&
          <form onSubmit={addSetor} className="flex gap-2">
            <Input placeholder="Novo setor" value={novoSetor} onChange={(e) => setNovoSetor(e.target.value)} maxLength={80} />
            <Button type="submit">Adicionar</Button>
          </form>
        }
      />
      <Tabs value={aba} onValueChange={setAba} className="mb-4">
        <TabsList>
          {[...CATEGORIAS_SETOR, "Todos"].map((c) => (
            <TabsTrigger key={c} value={c}>{c} ({c === "Todos" ? setores.length : setores.filter((s) => s.categoria === c).length})</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {visiveis.length === 0 && <p className="text-sm text-muted-ink">Nenhum setor nesta aba.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visiveis.map((s) => {
          const ls = locais.filter((l) => l.setor_id === s.id);
          return (
            <Cartao key={s.id} className="p-4">
              <div className="flex items-center justify-between">
                <Link to="/setores/$id" params={{ id: s.id }} className="text-[14px] font-bold hover:text-brand">
                  {s.nome} <span className="font-mono text-[11px] font-normal text-muted-ink">· {ls.reduce((n, l) => n + qtd(l.id), 0)} equip. · ver detalhes →</span>
                </Link>
                <div className="flex items-center gap-2">
                  {podeEditar && (
                    <select aria-label="Categoria" value={s.categoria} onChange={(e) => mudarCategoria(s.id, e.target.value)} className="rounded border border-line bg-transparent px-1 py-0.5 text-[11px]">
                      {CATEGORIAS_SETOR.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  )}
                  {ehAdmin && <button onClick={() => remover("setores", s.id, s.nome)} className="text-[11px] text-muted-ink hover:text-crit">remover</button>}
                </div>
              </div>
              <ul className="mt-3 divide-y divide-line text-[12.5px]">
                {ls.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 py-2">
                    <span>{l.nome}</span>
                    <span className="font-mono text-[11px] text-muted-ink">{qtd(l.id)} equip.</span>
                    {ehAdmin && <button onClick={() => remover("localizacoes", l.id, l.nome)} className="ml-auto text-[11px] text-muted-ink hover:text-crit">
                      ×
                    </button>}
                  </li>
                ))}
                {ls.length === 0 && <li className="py-2 text-muted-ink">Nenhuma localização.</li>}
              </ul>
              {podeEditar && <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Nova localização (ex: Sala 2)"
                  value={novoLocal[s.id] ?? ""}
                  onChange={(e) => setNovoLocal((p) => ({ ...p, [s.id]: e.target.value }))}
                  maxLength={80}
                  className="h-8 text-[12px]"
                />
                <Button size="sm" variant="outline" onClick={() => addLocal(s.id)}>+</Button>
              </div>}
            </Cartao>
          );
        })}
      </div>
    </>
  );
}
