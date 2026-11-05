import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cartao, Titulo } from "@/components/inventario";
import { equipamentosQuery, localizacoesQuery, setoresQuery } from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/setores/")({
  head: () => ({ meta: [{ title: "Setores e locais | Inventário de TI" }] }),
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

  async function addSetor(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoSetor.trim().slice(0, 80);
    if (!nome) return;
    const { error } = await supabase.from("setores").insert({ nome });
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
        acao={
          <form onSubmit={addSetor} className="flex gap-2">
            <Input placeholder="Novo setor" value={novoSetor} onChange={(e) => setNovoSetor(e.target.value)} maxLength={80} />
            <Button type="submit">Adicionar</Button>
          </form>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {setores.map((s) => {
          const ls = locais.filter((l) => l.setor_id === s.id);
          return (
            <Cartao key={s.id} className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold">{s.nome}</h2>
                <button onClick={() => remover("setores", s.id, s.nome)} className="text-[11px] text-muted-ink hover:text-crit">
                  remover
                </button>
              </div>
              <ul className="mt-3 divide-y divide-line text-[12.5px]">
                {ls.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 py-2">
                    <span>{l.nome}</span>
                    <span className="font-mono text-[11px] text-muted-ink">{qtd(l.id)} equip.</span>
                    <button onClick={() => remover("localizacoes", l.id, l.nome)} className="ml-auto text-[11px] text-muted-ink hover:text-crit">
                      ×
                    </button>
                  </li>
                ))}
                {ls.length === 0 && <li className="py-2 text-muted-ink">Nenhuma localização.</li>}
              </ul>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Nova localização (ex: Sala 2)"
                  value={novoLocal[s.id] ?? ""}
                  onChange={(e) => setNovoLocal((p) => ({ ...p, [s.id]: e.target.value }))}
                  maxLength={80}
                  className="h-8 text-[12px]"
                />
                <Button size="sm" variant="outline" onClick={() => addLocal(s.id)}>+</Button>
              </div>
            </Cartao>
          );
        })}
      </div>
    </>
  );
}
