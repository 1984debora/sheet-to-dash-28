import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Cartao, Campo, Titulo, Vazio, Pill } from "@/components/inventario";
import { equipamentosQuery, fmtData, setorQuery } from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/setores/$id")({
  head: () => ({ meta: [{ title: "Detalhes do setor | Inventário de TI" }] }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(setorQuery(params.id)),
      context.queryClient.ensureQueryData(equipamentosQuery),
    ]),
  component: Pagina,
});

const tem = (tipo: string, k: string) => tipo.toLowerCase().includes(k);

const usuarioSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(100),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido").max(255)]),
  celular: z.string().trim().max(30),
});

function Secao({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <Cartao className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-bold">{titulo}</h2>
        {acao}
      </div>
      {children}
    </Cartao>
  );
}

function Pagina() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(setorQuery(id));
  const { data: todos } = useSuspenseQuery(equipamentosQuery);
  const qc = useQueryClient();
  const { setor, usuarios, apps } = data;
  const equips = todos.filter((e) => e.localizacoes?.setores?.nome === setor.nome);
  const impressoras = equips.filter((e) => tem(e.tipo, "impressora") || tem(e.tipo, "multifuncional"));
  const celulares = equips.filter((e) => tem(e.tipo, "celular") || tem(e.tipo, "smartphone"));
  const notebooks = equips.filter((e) => tem(e.tipo, "notebook"));
  const scanners = equips.filter((e) => tem(e.tipo, "scanner") || tem(e.tipo, "escaner") || tem(e.tipo, "escâner"));

  const porTipo = Object.entries(
    equips.reduce<Record<string, number>>((a, e) => ((a[e.tipo] = (a[e.tipo] ?? 0) + 1), a), {}),
  ).sort((a, b) => b[1] - a[1]);
  const porModelo = Object.entries(
    equips.reduce<Record<string, number>>((a, e) => {
      const k = [e.tipo, e.marca, e.modelo].filter(Boolean).join(" · ");
      a[k] = (a[k] ?? 0) + 1;
      return a;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const atualizar = () => qc.invalidateQueries({ queryKey: ["setor", id] });

  async function salvarSetor(campos: { usa_scanner?: boolean; observacoes?: string | null }) {
    const { error } = await supabase.from("setores").update(campos).eq("id", id);
    if (error) return toast.error(error.message);
    atualizar();
  }

  // Usuários
  const [u, setU] = useState({ nome: "", email: "", celular: "" });
  async function addUsuario(e: React.FormEvent) {
    e.preventDefault();
    const r = usuarioSchema.safeParse(u);
    if (!r.success) return toast.error(r.error.issues[0].message);
    const { error } = await supabase.from("setor_usuarios").insert({
      setor_id: id, nome: r.data.nome, email: r.data.email || null, celular: r.data.celular || null,
    });
    if (error) return toast.error(error.message);
    setU({ nome: "", email: "", celular: "" });
    atualizar();
  }

  // Aplicativos
  const [a, setA] = useState({ nome: "", versao: "", fornecedor: "", ultima_atualizacao: "" });
  async function addApp(e: React.FormEvent) {
    e.preventDefault();
    if (!a.nome.trim()) return toast.error("Informe o nome do aplicativo");
    const { error } = await supabase.from("setor_aplicativos").insert({
      setor_id: id,
      nome: a.nome.trim().slice(0, 100),
      versao: a.versao.trim().slice(0, 50) || null,
      fornecedor: a.fornecedor.trim().slice(0, 100) || null,
      ultima_atualizacao: a.ultima_atualizacao || null,
    });
    if (error) return toast.error(error.message);
    setA({ nome: "", versao: "", fornecedor: "", ultima_atualizacao: "" });
    atualizar();
  }
  async function marcarAtualizado(appId: string) {
    const hoje = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("setor_aplicativos").update({ ultima_atualizacao: hoje }).eq("id", appId);
    if (error) return toast.error(error.message);
    atualizar();
  }

  async function remover(tabela: "setor_usuarios" | "setor_aplicativos", rid: string) {
    if (!confirm("Remover este registro?")) return;
    const { error } = await supabase.from(tabela).delete().eq("id", rid);
    if (error) return toast.error(error.message);
    atualizar();
  }

  const [obs, setObs] = useState(setor.observacoes ?? "");
  const th = "px-2 py-1.5 text-left font-mono text-[10px] uppercase text-muted-ink";
  const td = "px-2 py-1.5";
  const x = (fn: () => void) => (
    <button onClick={fn} className="text-[11px] text-muted-ink hover:text-crit">×</button>
  );

  return (
    <>
      <Link to="/setores" className="font-mono text-[11px] text-muted-ink hover:text-ink">← setores</Link>
      <Titulo titulo={setor.nome} sub={`${equips.length} equipamentos · ${usuarios.length} usuários · ${apps.length} aplicativos`} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Secao titulo="Equipamentos do setor">
          {equips.length === 0 ? <Vazio texto="Nenhum equipamento neste setor." /> : (
            <div className="grid gap-4 sm:grid-cols-2 text-[12.5px]">
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase text-muted-ink">Por tipo</p>
                <ul className="divide-y divide-line">
                  {porTipo.map(([t, n]) => <li key={t} className="flex justify-between py-1"><span>{t}</span><b>{n}</b></li>)}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase text-muted-ink">Por modelo</p>
                <ul className="divide-y divide-line">
                  {porModelo.map(([t, n]) => <li key={t} className="flex justify-between gap-2 py-1"><span>{t}</span><b>{n}</b></li>)}
                </ul>
              </div>
            </div>
          )}
        </Secao>

        <Secao titulo="Recursos do setor">
          <div className="space-y-3 text-[12.5px]">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={setor.usa_scanner} onChange={(e) => salvarSetor({ usa_scanner: e.target.checked })} />
              Usa escâner de mesa {scanners.length > 0 && <span className="text-muted-ink">({scanners.length} cadastrado(s))</span>}
            </label>
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase text-muted-ink">Notebooks com segunda tela</p>
              {notebooks.length === 0 ? <span className="text-muted-ink">Nenhum notebook no setor.</span> : (
                <p><b>{notebooks.filter((n) => n.segunda_tela).length}</b> de {notebooks.length} notebooks
                  {notebooks.filter((n) => n.segunda_tela).length > 0 && (
                    <span className="text-muted-ink"> — {notebooks.filter((n) => n.segunda_tela).map((n) => n.patrimonio).join(", ")}</span>
                  )}
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-ink">Marque "Usa segunda tela" no cadastro de cada notebook.</p>
            </div>
            <Campo label="Observações do setor">
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} maxLength={1000} onBlur={() => obs !== (setor.observacoes ?? "") && salvarSetor({ observacoes: obs.trim() || null })} />
            </Campo>
          </div>
        </Secao>

        <Secao titulo={`Usuários do setor (${usuarios.length})`}>
          <form onSubmit={addUsuario} className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]">
            <Input placeholder="Nome" value={u.nome} onChange={(e) => setU({ ...u, nome: e.target.value })} maxLength={100} />
            <Input placeholder="E-mail" type="email" value={u.email} onChange={(e) => setU({ ...u, email: e.target.value })} maxLength={255} />
            <Input placeholder="Celular corporativo" value={u.celular} onChange={(e) => setU({ ...u, celular: e.target.value })} maxLength={30} />
            <Button type="submit">Adicionar</Button>
          </form>
          {usuarios.length === 0 ? <Vazio texto="Nenhum usuário cadastrado." /> : (
            <table className="w-full text-[12.5px]">
              <thead><tr><th className={th}>Nome</th><th className={th}>E-mail</th><th className={th}>Celular</th><th /></tr></thead>
              <tbody className="divide-y divide-line">
                {usuarios.map((x2) => (
                  <tr key={x2.id}><td className={td}>{x2.nome}</td><td className={td}>{x2.email ?? "—"}</td><td className={td}>{x2.celular ?? "—"}</td><td className={td}>{x(() => remover("setor_usuarios", x2.id))}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>

        <Secao titulo={`Impressoras (${impressoras.length})`}>
          {impressoras.length === 0 ? <Vazio texto="Nenhuma impressora. Cadastre um equipamento do tipo Impressora neste setor." /> : (
            <table className="w-full text-[12.5px]">
              <thead><tr><th className={th}>Patrimônio</th><th className={th}>Marca / Modelo</th><th className={th}>Conexão</th><th className={th}>IP</th></tr></thead>
              <tbody className="divide-y divide-line">
                {impressoras.map((e) => (
                  <tr key={e.id}>
                    <td className={td}><Link to="/equipamentos/$id" params={{ id: e.id }} className="font-mono hover:text-brand">{e.patrimonio}</Link></td>
                    <td className={td}>{[e.marca, e.modelo].filter(Boolean).join(" ") || "—"}</td>
                    <td className={td}>{e.conexao ? <Pill texto={e.conexao} /> : "—"}</td>
                    <td className={`${td} font-mono`}>{e.endereco_ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>

        <Secao titulo={`Celulares (${celulares.length})`}>
          {celulares.length === 0 ? <Vazio texto="Nenhum celular. Cadastre um equipamento do tipo Celular neste setor." /> : (
            <table className="w-full text-[12.5px]">
              <thead><tr><th className={th}>Patrimônio</th><th className={th}>Marca / Modelo</th><th className={th}>Responsável</th></tr></thead>
              <tbody className="divide-y divide-line">
                {celulares.map((e) => (
                  <tr key={e.id}>
                    <td className={td}><Link to="/equipamentos/$id" params={{ id: e.id }} className="font-mono hover:text-brand">{e.patrimonio}</Link></td>
                    <td className={td}>{[e.marca, e.modelo].filter(Boolean).join(" ") || "—"}</td>
                    <td className={td}>{e.usuario_responsavel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>

        <Secao titulo={`Aplicativos utilizados (${apps.length})`}>
          <form onSubmit={addApp} className="mb-3 grid gap-2 sm:grid-cols-2">
            <Input placeholder="Aplicativo (ex: Office 365)" value={a.nome} onChange={(e) => setA({ ...a, nome: e.target.value })} maxLength={100} />
            <Input placeholder="Versão" value={a.versao} onChange={(e) => setA({ ...a, versao: e.target.value })} maxLength={50} />
            <Input placeholder="Fornecedor" value={a.fornecedor} onChange={(e) => setA({ ...a, fornecedor: e.target.value })} maxLength={100} />
            <div className="flex gap-2">
              <Input type="date" title="Última atualização" value={a.ultima_atualizacao} onChange={(e) => setA({ ...a, ultima_atualizacao: e.target.value })} />
              <Button type="submit">Adicionar</Button>
            </div>
          </form>
          {apps.length === 0 ? <Vazio texto="Nenhum aplicativo cadastrado." /> : (
            <table className="w-full text-[12.5px]">
              <thead><tr><th className={th}>Aplicativo</th><th className={th}>Versão</th><th className={th}>Fornecedor</th><th className={th}>Última atualiz.</th><th /></tr></thead>
              <tbody className="divide-y divide-line">
                {apps.map((ap) => {
                  const dias = ap.ultima_atualizacao ? (Date.now() - new Date(`${ap.ultima_atualizacao}T12:00:00`).getTime()) / 86400000 : Infinity;
                  return (
                    <tr key={ap.id}>
                      <td className={td}>{ap.nome}</td>
                      <td className={td}>{ap.versao ?? "—"}</td>
                      <td className={td}>{ap.fornecedor ?? "—"}</td>
                      <td className={`${td} ${dias > 90 ? "text-crit" : ""}`}>
                        {fmtData(ap.ultima_atualizacao)}
                        <button onClick={() => marcarAtualizado(ap.id)} className="ml-2 text-[11px] text-brand hover:underline">atualizado hoje</button>
                      </td>
                      <td className={td}>{x(() => remover("setor_aplicativos", ap.id))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-[11px] text-muted-ink">Datas em vermelho: sem atualização há mais de 90 dias.</p>
        </Secao>
      </div>
    </>
  );
}
