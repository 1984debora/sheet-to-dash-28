import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cartao, Titulo } from "@/components/inventario";
import { CATEGORIAS_SETOR, equipamentosQuery, localizacoesQuery, setoresQuery } from "@/lib/inventario";
import { usePapel } from "@/hooks/use-papel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Search, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/setores/")({
  head: () => ({
    meta: [
      { title: "Setores e locais | Inventário de TI" },
      { name: "description", content: "Cadastro de setores e localizações do inventário de TI." },
      { property: "og:title", content: "Setores e locais | Inventário de TI" },
      { property: "og:description", content: "Cadastro de setores e localizações do inventário de TI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
  const [aba, setAba] = useState<string>("Administrativo");
  const [buscaAcessos, setBuscaAcessos] = useState("");
  const [mostrarSenhas, setMostrarSenhas] = useState<Record<string, boolean>>({});

  const { podeEditar, ehAdmin } = usePapel();

  // Busca todos os usuários de setores com os dados do setor associado
  const { data: todosUsuarios = [], isLoading: carregandoAcessos } = useQuery({
    queryKey: ["todos_setor_usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setor_usuarios")
        .select("*, setores(id, nome, categoria)")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: aba === "Acessos",
  });

  const visiveis = aba === "Todos" ? setores : setores.filter((s) => s.categoria === aba);

  // Filtro inteligente da tabela de acessos
  const acessosFiltrados = useMemo(() => {
    if (!buscaAcessos.trim()) return todosUsuarios;
    const termo = buscaAcessos.toLowerCase().trim();
    return todosUsuarios.filter((u: any) => {
      const nome = (u.nome ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const setorNome = (u.setores?.nome ?? "").toLowerCase();
      const pc = (u.computador ?? "").toLowerCase();
      const anydesk = (u.anydesk ?? "").toLowerCase();
      return (
        nome.includes(termo) ||
        email.includes(termo) ||
        setorNome.includes(termo) ||
        pc.includes(termo) ||
        anydesk.includes(termo)
      );
    });
  }, [todosUsuarios, buscaAcessos]);

  function alternarVisibilidade(id: string) {
    setMostrarSenhas((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function mudarCategoria(id: string, categoria: string) {
    const { error } = await supabase.from("setores").update({ categoria }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
  }

  async function addSetor(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoSetor.trim().slice(0, 80);
    if (!nome) return;
    const { error } = await supabase.from("setores").insert({ nome, categoria: aba === "Todos" || aba === "Acessos" ? "Lojas" : aba });
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

  const th = "border-b border-line bg-surface-raised px-3 py-2 text-left text-xs font-semibold text-muted-ink";
  const td = "border-b border-line px-3 py-2 text-xs";

  return (
    <>
      <Titulo
        titulo="Setores e localizações"
        sub="onde cada equipamento está sendo usado e consulta geral de acessos"
        acao={
          podeEditar && aba !== "Acessos" && (
            <form onSubmit={addSetor} className="flex gap-2">
              <Input
                placeholder="Novo setor"
                value={novoSetor}
                onChange={(e) => setNovoSetor(e.target.value)}
                maxLength={80}
              />
              <Button type="submit">Adicionar</Button>
            </form>
          )
        }
      />

      <Tabs value={aba} onValueChange={setAba} className="mb-4">
        <TabsList className="flex flex-wrap gap-1">
          {[...CATEGORIAS_SETOR, "Todos"].map((c) => (
            <TabsTrigger key={c} value={c}>
              {c} ({c === "Todos" ? setores.length : setores.filter((s) => s.categoria === c).length})
            </TabsTrigger>
          ))}
          <TabsTrigger value="Acessos" className="font-semibold text-brand">
            🔑 Todos os Acessos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ABA DE CONSULTA GERAL DE ACESSOS */}
      {aba === "Acessos" ? (
        <Cartao className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-ink" />
              <Input
                placeholder="Buscar por colaborador, e-mail, loja, computador, anydesk..."
                value={buscaAcessos}
                onChange={(e) => setBuscaAcessos(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="text-xs text-muted-ink">
              {acessosFiltrados.length} colaborador{acessosFiltrados.length === 1 ? "" : "es"} encontrado{acessosFiltrados.length === 1 ? "" : "s"}
            </div>
          </div>

          {carregandoAcessos ? (
            <p className="py-6 text-center text-xs text-muted-ink">Carregando acessos...</p>
          ) : acessosFiltrados.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-ink">Nenhum acesso encontrado para a busca.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className={th}>Colaborador</th>
                    <th className={th}>Setor / Loja</th>
                    <th className={th}>E-mail Corporativo</th>
                    <th className={th}>Senha E-mail</th>
                    <th className={th}>Computador</th>
                    <th className={th}>Senha Windows</th>
                    <th className={th}>AnyDesk</th>
                    <th className={th}>Senha AnyDesk</th>
                    <th className={th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {acessosFiltrados.map((u: any) => (
                    <tr key={u.id} className="hover:bg-surface-raised/40 transition-colors">
                      <td className={td}>
                        <div className="font-medium text-ink">{u.nome}</div>
                        {u.celular && <div className="text-[10px] text-muted-ink">{u.celular}</div>}
                      </td>
                      <td className={td}>
                        {u.setores ? (
                          <Link
                            to="/setores/$id"
                            params={{ id: u.setor_id }}
                            className="font-medium text-brand hover:underline inline-flex items-center gap-1"
                          >
                            {u.setores.nome}
                            <ExternalLink className="h-3 w-3 inline" />
                          </Link>
                        ) : (
                          <span className="text-muted-ink">—</span>
                        )}
                      </td>
                      <td className={td}>{u.email || <span className="text-muted-ink">—</span>}</td>
                      <td className={td}>
                        {u.senha_email ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span>{mostrarSenhas[`se_${u.id}`] ? u.senha_email : "••••••••"}</span>
                            <button
                              type="button"
                              onClick={() => alternarVisibilidade(`se_${u.id}`)}
                              className="text-muted-ink hover:text-ink"
                              title="Revelar senha"
                            >
                              {mostrarSenhas[`se_${u.id}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-ink">—</span>
                        )}
                      </td>
                      <td className={td}>
                        {u.computador ? (
                          <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px]">
                            {u.computador}
                          </span>
                        ) : (
                          <span className="text-muted-ink">—</span>
                        )}
                      </td>
                      <td className={td}>
                        {u.senha ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span>{mostrarSenhas[`sw_${u.id}`] ? u.senha : "••••••••"}</span>
                            <button
                              type="button"
                              onClick={() => alternarVisibilidade(`sw_${u.id}`)}
                              className="text-muted-ink hover:text-ink"
                              title="Revelar senha"
                            >
                              {mostrarSenhas[`sw_${u.id}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-ink">—</span>
                        )}
                      </td>
                      <td className={td}>
                        {u.anydesk ? (
                          <span className="font-mono">{u.anydesk}</span>
                        ) : (
                          <span className="text-muted-ink">—</span>
                        )}
                      </td>
                      <td className={td}>
                        {u.senha_anydesk ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span>{mostrarSenhas[`sa_${u.id}`] ? u.senha_anydesk : "••••••••"}</span>
                            <button
                              type="button"
                              onClick={() => alternarVisibilidade(`sa_${u.id}`)}
                              className="text-muted-ink hover:text-ink"
                              title="Revelar senha"
                            >
                              {mostrarSenhas[`sa_${u.id}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-ink">—</span>
                        )}
                      </td>
                      <td className={td}>
                        <Link
                          to="/setores/$id"
                          params={{ id: u.setor_id }}
                          className="rounded border border-line px-2 py-1 text-[11px] font-medium text-brand hover:bg-surface-raised inline-flex items-center gap-1"
                        >
                          Ver setor
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      ) : (
        /* ABAS NORMAIS DE SETORES (ADMINISTRATIVO, LOJAS, ETC) */
        <>
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
                        <select
                          aria-label="Categoria"
                          value={s.categoria}
                          onChange={(e) => mudarCategoria(s.id, e.target.value)}
                          className="rounded border border-line bg-transparent px-1 py-0.5 text-[11px]"
                        >
                          {CATEGORIAS_SETOR.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      )}
                      {ehAdmin && (
                        <button onClick={() => remover("setores", s.id, s.nome)} className="text-[11px] text-muted-ink hover:text-crit">
                          remover
                        </button>
                      )}
                    </div>
                  </div>
                  <ul className="mt-3 divide-y divide-line text-[12.5px]">
                    {ls.map((l) => (
                      <li key={l.id} className="flex items-center gap-2 py-2">
                        <span>{l.nome}</span>
                        <span className="font-mono text-[11px] text-muted-ink">{qtd(l.id)} equip.</span>
                        {ehAdmin && (
                          <button onClick={() => remover("localizacoes", l.id, l.nome)} className="ml-auto text-[11px] text-muted-ink hover:text-crit">
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                    {ls.length === 0 && <li className="py-2 text-muted-ink">Nenhuma localização.</li>}
                  </ul>
                  {podeEditar && (
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
                  )}
                </Cartao>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
