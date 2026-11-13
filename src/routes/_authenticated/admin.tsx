import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { souAdmin, listarEquipe, redefinirSenha, definirPapel, criarUsuario, excluirUsuario } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Administração — Inventário TI" },
    { name: "description", content: "Gerencie acessos, senhas e permissões da equipe de TI." },
    { property: "og:title", content: "Administração — Inventário TI" },
    { property: "og:description", content: "Gerencie acessos, senhas e permissões da equipe de TI." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminPage,
});

const PAPEIS = [
  { v: "admin", l: "Administrador", d: "Controle total: cria e exclui usuários e pode excluir itens." },
  { v: "tecnico", l: "Técnico", d: "Inclui e altera equipamentos e usuários, sem excluir." },
  { v: "usuario", l: "Usuário", d: "Somente visualização." },
] as const;
type Papel = (typeof PAPEIS)[number]["v"];
const cls = "rounded-md border border-line bg-transparent px-2 py-1.5 text-[13px]";

function AdminPage() {
  const qc = useQueryClient();
  const fnSou = useServerFn(souAdmin);
  const fnLista = useServerFn(listarEquipe);
  const fnSenha = useServerFn(redefinirSenha);
  const fnPapel = useServerFn(definirPapel);
  const fnCriar = useServerFn(criarUsuario);
  const fnExcluir = useServerFn(excluirUsuario);
  const sou = useQuery({ queryKey: ["sou-admin"], queryFn: () => fnSou() });
  const equipe = useQuery({ queryKey: ["equipe"], queryFn: () => fnLista(), enabled: !!sou.data?.admin });
  const [alvo, setAlvo] = useState<{ id: string; email: string } | null>(null);
  const [senha, setSenha] = useState("");
  const [novo, setNovo] = useState<{ email: string; senha: string; papel: Papel }>({ email: "", senha: "", papel: "tecnico" });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["equipe"] });

  const mSenha = useMutation({
    mutationFn: () => fnSenha({ data: { userId: alvo!.id, senha } }),
    onSuccess: () => { toast.success(`Senha de ${alvo!.email} alterada`); setAlvo(null); setSenha(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mPapel = useMutation({ mutationFn: (v: { userId: string; papel: Papel }) => fnPapel({ data: v }), onSuccess: recarregar, onError: (e: Error) => toast.error(e.message) });
  const mCriar = useMutation({
    mutationFn: () => fnCriar({ data: novo }),
    onSuccess: () => { toast.success(`Acesso criado para ${novo.email}`); setNovo({ email: "", senha: "", papel: "tecnico" }); recarregar(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mExcluir = useMutation({ mutationFn: (userId: string) => fnExcluir({ data: { userId } }), onSuccess: () => { toast.success("Usuário excluído"); recarregar(); }, onError: (e: Error) => toast.error(e.message) });

  if (sou.isLoading) return <p className="text-sm text-muted-ink">Carregando…</p>;
  if (!sou.data?.admin) return <p className="text-sm text-muted-ink">Esta página é restrita a administradores.</p>;
  const lista = equipe.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Administração</h1>
        <p className="text-[13px] text-muted-ink">Crie acessos, defina permissões e redefina senhas da equipe.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mCriar.mutate(); }} className="grid gap-2 rounded-lg border border-line p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
        <p className="text-[13px] font-bold sm:col-span-4">Novo usuário</p>
        <Input type="email" required placeholder="E-mail" maxLength={255} value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
        <Input type="text" required minLength={8} maxLength={72} placeholder="Senha inicial (mín. 8)" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
        <select className={cls} value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value as Papel })}>
          {PAPEIS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
        <Button disabled={mCriar.isPending}>{mCriar.isPending ? "Criando…" : "Criar acesso"}</Button>
      </form>

      {PAPEIS.map((p) => {
        const grupo = lista.filter((u) => u.papel === p.v);
        return (
          <section key={p.v} className="overflow-hidden rounded-lg border border-line">
            <div className="flex items-baseline gap-2 bg-ink/5 px-3 py-2"><h2 className="text-[14px] font-bold">{p.l} ({grupo.length})</h2><span className="text-[12px] text-muted-ink">{p.d}</span></div>
            <table className="w-full text-[13px]">
              <tbody>
                {grupo.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2 text-muted-ink">{u.ultimoAcesso ? `último acesso ${new Date(u.ultimoAcesso).toLocaleString("pt-BR")}` : "nunca acessou"}</td>
                    <td className="px-3 py-2">
                      <select aria-label="Permissão" className={cls} value={u.papel} disabled={mPapel.isPending} onChange={(e) => mPapel.mutate({ userId: u.id, papel: e.target.value as Papel })}>
                        {PAPEIS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </td>
                    <td className="space-x-2 px-3 py-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => { setAlvo({ id: u.id, email: u.email }); setSenha(""); }}>Redefinir senha</Button>
                      <Button size="sm" variant="ghost" disabled={mExcluir.isPending} onClick={() => confirm(`Excluir o acesso de ${u.email}?`) && mExcluir.mutate(u.id)}>Excluir</Button>
                    </td>
                  </tr>
                ))}
                {grupo.length === 0 && <tr><td className="px-3 py-2 text-muted-ink">Ninguém com esta permissão.</td></tr>}
              </tbody>
            </table>
          </section>
        );
      })}
      {equipe.isLoading && <p className="text-sm text-muted-ink">Carregando equipe…</p>}

      {alvo && (
        <form onSubmit={(e) => { e.preventDefault(); mSenha.mutate(); }} className="max-w-md space-y-3 rounded-lg border border-line p-4">
          <p className="text-[13px]">Nova senha para <b>{alvo.email}</b></p>
          <Input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={8} required placeholder="Mínimo 8 caracteres" />
          <div className="flex gap-2">
            <Button disabled={mSenha.isPending}>{mSenha.isPending ? "Salvando…" : "Confirmar nova senha"}</Button>
            <Button type="button" variant="outline" onClick={() => setAlvo(null)}>Cancelar</Button>
          </div>
        </form>
      )}
    </div>
  );
}
