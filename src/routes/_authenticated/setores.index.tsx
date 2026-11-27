import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Cartao, Titulo } from "@/components/inventario";
import { CATEGORIAS_SETOR, equipamentosQuery, localizacoesQuery, setoresQuery } from "@/lib/inventario";
import { usePapel } from "@/hooks/use-papel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  EyeOff,
  Search,
  ExternalLink,
  Plus,
  History,
  Pencil,
  Trash2,
  MapPin,
  Mail,
  KeyRound,
  ShieldAlert,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const [buscaFranquias, setBuscaFranquias] = useState("");
  const [mostrarSenhas, setMostrarSenhas] = useState<Record<string, boolean>>({});

  // Modais de Franquias
  const [modalFranquiaAberto, setModalFranquiaAberto] = useState(false);
  const [franquiaEmEdicao, setFranquiaEmEdicao] = useState<any | null>(null);
  const [salvandoFranquia, setSalvandoFranquia] = useState(false);
  const [franquiaForm, setFranquiaForm] = useState({
    nome: "",
    endereco: "",
    status_ativacao: "Ativa",
    email_login: "",
    senha_login: "",
  });

  // Modal de Histórico / Chamados da Franquia
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [franquiaHistorico, setFranquiaHistorico] = useState<any | null>(null);
  const [salvandoChamado, setSalvandoChamado] = useState(false);
  const [chamadoForm, setChamadoForm] = useState({
    tipo_evento: "Chamado técnico",
    numero_chamado: "",
    motivo: "",
    tecnico: "",
    novaSenha: "",
  });

  const { podeEditar, ehAdmin } = usePapel();

  // Busca dados completos de franquias
  const { data: franquias = [], isLoading: carregandoFranquias } = useQuery({
    queryKey: ["setores_franquias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("*")
        .eq("categoria", "Franquias")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: aba === "Franquias",
  });

  // Busca histórico de chamados da franquia aberta
  const { data: chamados = [], isLoading: carregandoChamados, refetch: recarregarChamados } = useQuery({
    queryKey: ["franquia_chamados", franquiaHistorico?.id],
    queryFn: async () => {
      if (!franquiaHistorico?.id) return [];
      const { data, error } = await supabase
        .from("franquia_chamados")
        .select("*")
        .eq("setor_id", franquiaHistorico.id)
        .order("data_registro", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!franquiaHistorico?.id && modalHistoricoAberto,
  });

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

  // Filtro da tabela de franquias
  const franquiasFiltradas = useMemo(() => {
    if (!buscaFranquias.trim()) return franquias;
    const termo = buscaFranquias.toLowerCase().trim();
    return franquias.filter((f) => {
      const nome = (f.nome ?? "").toLowerCase();
      const endereco = (f.endereco ?? "").toLowerCase();
      const email = (f.email_login ?? "").toLowerCase();
      const status = (f.status_ativacao ?? "").toLowerCase();
      return nome.includes(termo) || endereco.includes(termo) || email.includes(termo) || status.includes(termo);
    });
  }, [franquias, buscaFranquias]);

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

  // Abrir modal de criação de franquia
  function abrirCriacaoFranquia() {
    setFranquiaEmEdicao(null);
    setFranquiaForm({
      nome: "",
      endereco: "",
      status_ativacao: "Ativa",
      email_login: "",
      senha_login: "",
    });
    setModalFranquiaAberto(true);
  }

  // Abrir modal de edição de franquia
  function abrirEdicaoFranquia(f: any) {
    setFranquiaEmEdicao(f);
    setFranquiaForm({
      nome: f.nome ?? "",
      endereco: f.endereco ?? "",
      status_ativacao: f.status_ativacao ?? "Ativa",
      email_login: f.email_login ?? "",
      senha_login: f.senha_login ?? "",
    });
    setModalFranquiaAberto(true);
  }

  // Salvar franquia (novo ou edição)
  async function salvarFranquia(e: React.FormEvent) {
    e.preventDefault();
    if (!franquiaForm.nome.trim()) {
      toast.error("Informe o nome da franquia.");
      return;
    }

    setSalvandoFranquia(true);
    try {
      if (franquiaEmEdicao) {
        const { error } = await supabase
          .from("setores")
          .update({
            nome: franquiaForm.nome.trim(),
            endereco: franquiaForm.endereco.trim() || null,
            status_ativacao: franquiaForm.status_ativacao,
            email_login: franquiaForm.email_login.trim() || null,
            senha_login: franquiaForm.senha_login || null,
          } as any)
          .eq("id", franquiaEmEdicao.id);
        if (error) throw error;
        toast.success("Franquia atualizada com sucesso!");
      } else {
        const { data, error } = await supabase
          .from("setores")
          .insert({
            nome: franquiaForm.nome.trim(),
            categoria: "Franquias",
            endereco: franquiaForm.endereco.trim() || null,
            status_ativacao: franquiaForm.status_ativacao || "Ativa",
            email_login: franquiaForm.email_login.trim() || null,
            senha_login: franquiaForm.senha_login || null,
          } as any)
          .select()
          .single();
        if (error) throw error;

        // Registra evento de ativação inicial no histórico
        if (data?.id) {
          await supabase.from("franquia_chamados").insert({
            setor_id: data.id,
            tipo_evento: "Ativação inicial",
            motivo: "Cadastro e ativação inicial da unidade de franquia no inventário.",
            tecnico: "Equipe de TI",
            senha_alterada: !!franquiaForm.senha_login,
          } as any);
        }
        toast.success("Franquia cadastrada com sucesso!");
      }

      qc.invalidateQueries({ queryKey: ["setores"] });
      qc.invalidateQueries({ queryKey: ["setores_franquias"] });
      setModalFranquiaAberto(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar franquia");
    } finally {
      setSalvandoFranquia(false);
    }
  }

  // Abrir modal de histórico e chamados
  function abrirHistorico(f: any) {
    setFranquiaHistorico(f);
    setChamadoForm({
      tipo_evento: "Chamado técnico",
      numero_chamado: "",
      motivo: "",
      tecnico: "",
      novaSenha: "",
    });
    setModalHistoricoAberto(true);
  }

  // Registrar novo atendimento / chamado no histórico
  async function registrarChamado(e: React.FormEvent) {
    e.preventDefault();
    if (!franquiaHistorico?.id) return;
    if (!chamadoForm.motivo.trim()) {
      toast.error("Descreva o motivo ou ocorrência do chamado.");
      return;
    }

    setSalvandoChamado(true);
    try {
      const houveTrocaSenha = !!chamadoForm.novaSenha.trim();

      // 1. Grava no histórico de chamados
      const { error: errChamado } = await supabase.from("franquia_chamados").insert({
        setor_id: franquiaHistorico.id,
        tipo_evento: chamadoForm.tipo_evento,
        numero_chamado: chamadoForm.numero_chamado.trim() || null,
        motivo: chamadoForm.motivo.trim(),
        tecnico: chamadoForm.tecnico.trim() || "TI",
        senha_alterada: houveTrocaSenha,
      } as any);
      if (errChamado) throw errChamado;

      // 2. Se informou nova senha, atualiza o cadastro da franquia
      if (houveTrocaSenha) {
        const { error: errSetor } = await supabase
          .from("setores")
          .update({ senha_login: chamadoForm.novaSenha.trim() } as any)
          .eq("id", franquiaHistorico.id);
        if (errSetor) throw errSetor;
        toast.success("Atendimento registrado e senha da franquia atualizada com sucesso!");
      } else {
        toast.success("Atendimento registrado no histórico!");
      }

      setChamadoForm({
        tipo_evento: "Chamado técnico",
        numero_chamado: "",
        motivo: "",
        tecnico: "",
        novaSenha: "",
      });

      recarregarChamados();
      qc.invalidateQueries({ queryKey: ["setores"] });
      qc.invalidateQueries({ queryKey: ["setores_franquias"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar chamado");
    } finally {
      setSalvandoChamado(false);
    }
  }

  function renderStatusBadge(status?: string) {
    const s = (status || "Ativa").toLowerCase();
    if (s === "ativa") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Ativa
        </span>
      );
    }
    if (s.includes("implanta") || s.includes("pendente")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Em implantação
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        {status || "Inativa"}
      </span>
    );
  }

  const qtd = (localId: string) => equips.filter((e) => e.localizacao_id === localId).length;
  const qtdSetor = (setorId: string) => {
    const locaisDoSetor = locais.filter((l) => l.setor_id === setorId).map((l) => l.id);
    return equips.filter((e) => e.localizacao_id && locaisDoSetor.includes(e.localizacao_id)).length;
  };

  const th = "border-b border-line bg-surface-raised px-3 py-2 text-left text-xs font-semibold text-muted-ink";
  const td = "border-b border-line px-3 py-2 text-xs";

  return (
    <>
      <Titulo
        titulo="Setores e localizações"
        sub="onde cada equipamento está sendo usado e consulta geral de acessos"
        acao={
          podeEditar && aba !== "Acessos" && aba !== "Franquias" && (
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

      {/* ======================================================== */}
      {/* ABA DE FRANQUIAS (TABELA DEDICADA COM HISTÓRICO E SENHAS) */}
      {/* ======================================================== */}
      {aba === "Franquias" ? (
        <Cartao className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-ink" />
              <Input
                placeholder="Buscar por nome da franquia, endereço, login de e-mail..."
                value={buscaFranquias}
                onChange={(e) => setBuscaFranquias(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-ink">
                {franquiasFiltradas.length} franquia{franquiasFiltradas.length === 1 ? "" : "s"} encontrada{franquiasFiltradas.length === 1 ? "" : "s"}
              </div>
              {podeEditar && (
                <Button size="sm" onClick={abrirCriacaoFranquia} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Nova Franquia
                </Button>
              )}
            </div>
          </div>

          {carregandoFranquias ? (
            <p className="py-6 text-center text-xs text-muted-ink">Carregando dados das franquias...</p>
          ) : franquiasFiltradas.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-ink">Nenhuma franquia cadastrada ou encontrada para a busca.</p>
              {podeEditar && (
                <Button variant="outline" size="sm" onClick={abrirCriacaoFranquia} className="mt-3 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Cadastrar primeira franquia
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className={th}>Franquia</th>
                    <th className={th}>Endereço</th>
                    <th className={th}>Status</th>
                    <th className={th}>Login / E-mail Corporativo</th>
                    <th className={th}>Senha de E-mail</th>
                    <th className={`${th} text-right`}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {franquiasFiltradas.map((f: any) => (
                    <tr key={f.id} className="hover:bg-surface-raised/40 transition-colors">
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          <Link
                            to="/setores/$id"
                            params={{ id: f.id }}
                            className="font-bold text-ink hover:text-brand hover:underline inline-flex items-center gap-1"
                          >
                            {f.nome}
                            <ExternalLink className="h-3 w-3 inline text-muted-ink" />
                          </Link>
                          <span className="font-mono text-[10px] text-muted-ink bg-surface-raised px-1.5 py-0.5 rounded">
                            {qtdSetor(f.id)} equip.
                          </span>
                        </div>
                      </td>
                      <td className={td}>
                        {f.endereco ? (
                          <div className="flex items-center gap-1.5 text-muted-ink max-w-xs truncate" title={f.endereco}>
                            <MapPin className="h-3 w-3 shrink-0 text-brand" />
                            <span className="truncate">{f.endereco}</span>
                          </div>
                        ) : (
                          <span className="text-muted-ink italic">Não informado</span>
                        )}
                      </td>
                      <td className={td}>{renderStatusBadge(f.status_ativacao)}</td>
                      <td className={td}>
                        {f.email_login ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <Mail className="h-3 w-3 text-muted-ink" />
                            <span>{f.email_login}</span>
                          </div>
                        ) : (
                          <span className="text-muted-ink">—</span>
                        )}
                      </td>
                      <td className={td}>
                        {f.senha_login ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <KeyRound className="h-3 w-3 text-muted-ink" />
                            <span>{mostrarSenhas[`fq_${f.id}`] ? f.senha_login : "••••••••"}</span>
                            <button
                              type="button"
                              onClick={() => alternarVisibilidade(`fq_${f.id}`)}
                              className="text-muted-ink hover:text-ink ml-1"
                              title="Revelar senha"
                            >
                              {mostrarSenhas[`fq_${f.id}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-ink">—</span>
                        )}
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirHistorico(f)}
                            className="h-7 px-2 text-[11px] gap-1 text-ink"
                            title="Ver histórico de ativação, chamados e redefinição de senhas"
                          >
                            <History className="h-3.5 w-3.5 text-brand" />
                            Histórico
                          </Button>
                          {podeEditar && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirEdicaoFranquia(f)}
                              className="h-7 px-2 text-[11px]"
                              title="Editar dados da franquia"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {ehAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => remover("setores", f.id, f.nome)}
                              className="h-7 px-2 text-[11px] text-muted-ink hover:text-crit"
                              title="Remover franquia"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      ) : aba === "Acessos" ? (
        /* ======================================================== */
        /* ABA DE CONSULTA GERAL DE ACESSOS                          */
        /* ======================================================== */
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
        /* ======================================================== */
        /* ABAS NORMAIS DE SETORES (ADMINISTRATIVO, LOJAS, TODOS)     */
        /* ======================================================== */
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

      {/* ======================================================== */}
      {/* MODAL: CADASTRAR OU EDITAR FRANQUIA                      */}
      {/* ======================================================== */}
      <Dialog open={modalFranquiaAberto} onOpenChange={setModalFranquiaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{franquiaEmEdicao ? "Editar Franquia" : "Nova Franquia"}</DialogTitle>
            <DialogDescription>
              Cadastre ou atualize as informações cadastrais e de acesso corporativo da franquia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={salvarFranquia} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-ink">Nome da Franquia *</label>
              <Input
                placeholder="Ex: Franquia Shopping Metrô Tatuapé"
                value={franquiaForm.nome}
                onChange={(e) => setFranquiaForm((p) => ({ ...p, nome: e.target.value }))}
                required
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-ink">Endereço Completo</label>
              <Input
                placeholder="Ex: Av. Radial Leste, 1234 - Loja 204 - São Paulo/SP"
                value={franquiaForm.endereco}
                onChange={(e) => setFranquiaForm((p) => ({ ...p, endereco: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-ink">Status da Unidade</label>
              <select
                value={franquiaForm.status_ativacao}
                onChange={(e) => setFranquiaForm((p) => ({ ...p, status_ativacao: e.target.value }))}
                className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-xs"
              >
                <option value="Ativa">Ativa (Em funcionamento)</option>
                <option value="Em implantação">Em implantação</option>
                <option value="Inativa">Inativa / Encerrada</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-ink">Login / E-mail Corporativo</label>
                <Input
                  placeholder="ex: fq.tatuape@oticasgassi.com.br"
                  value={franquiaForm.email_login}
                  onChange={(e) => setFranquiaForm((p) => ({ ...p, email_login: e.target.value }))}
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-ink">Senha de E-mail</label>
                <Input
                  type="text"
                  placeholder="Senha de acesso"
                  value={franquiaForm.senha_login}
                  onChange={(e) => setFranquiaForm((p) => ({ ...p, senha_login: e.target.value }))}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalFranquiaAberto(false)} disabled={salvandoFranquia}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoFranquia}>
                {salvandoFranquia ? "Salvando..." : franquiaEmEdicao ? "Atualizar" : "Cadastrar Franquia"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: HISTÓRICO DE ATIVAÇÕES E CHAMADOS TÉCNICOS        */}
      {/* ======================================================== */}
      <Dialog open={modalHistoricoAberto} onOpenChange={setModalHistoricoAberto}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-brand" />
                Histórico & Chamados: {franquiaHistorico?.nome}
              </DialogTitle>
            </div>
            <DialogDescription>
              Registro de ativações, intervenções de suporte e histórico de recolocação de senhas no perfil da franquia.
            </DialogDescription>
          </DialogHeader>

          {/* Form para registrar novo chamado/intervenção */}
          <div className="my-3 rounded-lg border border-line bg-surface-raised/40 p-3">
            <h4 className="text-xs font-bold text-ink mb-2 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-brand" />
              Registrar Atendimento / Reconfiguração de Senha
            </h4>
            <form onSubmit={registrarChamado} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-ink">Tipo de Evento</label>
                  <select
                    value={chamadoForm.tipo_evento}
                    onChange={(e) => setChamadoForm((p) => ({ ...p, tipo_evento: e.target.value }))}
                    className="mt-1 w-full rounded border border-line bg-surface px-2 py-1.5 text-xs"
                  >
                    <option value="Chamado técnico">Chamado técnico</option>
                    <option value="Redefinição de senha">Redefinição de senha</option>
                    <option value="Configuração Outlook">Configuração Outlook/Perfil</option>
                    <option value="Ativação inicial">Ativação inicial</option>
                    <option value="Manutenção de Equipamento">Manutenção de Equipamento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-ink">Nº do Chamado (Opcional)</label>
                  <Input
                    placeholder="Ex: #10452"
                    value={chamadoForm.numero_chamado}
                    onChange={(e) => setChamadoForm((p) => ({ ...p, numero_chamado: e.target.value }))}
                    className="mt-1 h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-ink">Técnico Responsável</label>
                  <Input
                    placeholder="Ex: Débora / Sara"
                    value={chamadoForm.tecnico}
                    onChange={(e) => setChamadoForm((p) => ({ ...p, tecnico: e.target.value }))}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-ink">Motivo / Ocorrência do Atendimento *</label>
                <Textarea
                  placeholder="Ex: Usuário não lembrava da senha corporativa; acessamos via AnyDesk e recolocamos a nova senha no perfil do Outlook."
                  value={chamadoForm.motivo}
                  onChange={(e) => setChamadoForm((p) => ({ ...p, motivo: e.target.value }))}
                  required
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="rounded border border-line bg-surface p-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-[11px]">
                    <span className="font-semibold text-ink">Atualizar senha no cadastro da franquia?</span>
                    <p className="text-muted-ink text-[10px]">
                      Se preencher a nova senha abaixo, o sistema atualizará o cadastro da unidade e marcará que houve alteração de senha.
                    </p>
                  </div>
                  <Input
                    placeholder="Nova senha (opcional)"
                    value={chamadoForm.novaSenha}
                    onChange={(e) => setChamadoForm((p) => ({ ...p, novaSenha: e.target.value }))}
                    className="h-8 max-w-xs text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={salvandoChamado} className="text-xs">
                  {salvandoChamado ? "Registrando..." : "Gravar no Histórico"}
                </Button>
              </div>
            </form>
          </div>

          {/* Linha do tempo de atendimentos */}
          <div className="mt-4">
            <h4 className="text-xs font-bold text-ink mb-2">Linha do Tempo de Chamados e Ativações</h4>

            {carregandoChamados ? (
              <p className="py-4 text-center text-xs text-muted-ink">Carregando histórico...</p>
            ) : chamados.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-ink">Nenhum evento registrado ainda para esta franquia.</p>
            ) : (
              <div className="space-y-2.5">
                {chamados.map((c: any) => (
                  <div key={c.id} className="rounded-lg border border-line bg-surface p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{c.tipo_evento}</span>
                        {c.numero_chamado && (
                          <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-muted-ink">
                            {c.numero_chamado}
                          </span>
                        )}
                        {c.senha_alterada && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 border border-amber-500/20">
                            <KeyRound className="h-3 w-3" />
                            Senha recolocada/alterada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-ink text-[11px]">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(c.data_registro).toLocaleString("pt-BR")}</span>
                        {c.tecnico && (
                          <span className="font-medium text-ink bg-surface-raised px-1.5 py-0.5 rounded text-[10px]">
                            Técnico: {c.tecnico}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-muted-ink whitespace-pre-wrap">{c.motivo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setModalHistoricoAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
