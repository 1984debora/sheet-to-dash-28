import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { souAdmin, listarEquipe, redefinirSenha, definirAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Administração — Inventário TI" },
    { name: "description", content: "Gerencie senhas e permissões da equipe de TI." },
    { property: "og:title", content: "Administração — Inventário TI" },
    { property: "og:description", content: "Gerencie senhas e permissões da equipe de TI." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const fnSou = useServerFn(souAdmin);
  const fnLista = useServerFn(listarEquipe);
  const fnSenha = useServerFn(redefinirSenha);
  const fnAdmin = useServerFn(definirAdmin);
  const sou = useQuery({ queryKey: ["sou-admin"], queryFn: () => fnSou() });
  const equipe = useQuery({ queryKey: ["equipe"], queryFn: () => fnLista(), enabled: !!sou.data?.admin });
  const [alvo, setAlvo] = useState<{ id: string; email: string } | null>(null);
  const [senha, setSenha] = useState("");

  const mSenha = useMutation({
    mutationFn: () => fnSenha({ data: { userId: alvo!.id, senha } }),
    onSuccess: () => { toast.success(`Senha de ${alvo!.email} alterada`); setAlvo(null); setSenha(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mAdmin = useMutation({
    mutationFn: (v: { userId: string; admin: boolean }) => fnAdmin({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipe"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (sou.isLoading) return <p className="text-sm text-muted-ink">Carregando…</p>;
  if (!sou.data?.admin) return <p className="text-sm text-muted-ink">Esta página é restrita a administradores.</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Administração</h1>
        <p className="text-[13px] text-muted-ink">Redefina senhas e defina quem é administrador.</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-[13px]">
          <thead className="bg-ink/5 text-left text-muted-ink">
            <tr><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">Último acesso</th><th className="px-3 py-2">Administrador</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {(equipe.data ?? []).map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 text-muted-ink">{u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleString("pt-BR") : "—"}</td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={u.admin} disabled={mAdmin.isPending}
                    onChange={(e) => mAdmin.mutate({ userId: u.id, admin: e.target.checked })} />
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => { setAlvo({ id: u.id, email: u.email }); setSenha(""); }}
                    className="rounded-md border border-line px-2.5 py-1 font-medium hover:bg-ink/5">Redefinir senha</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {equipe.isLoading && <p className="p-3 text-sm text-muted-ink">Carregando equipe…</p>}
      </div>
      {alvo && (
        <form onSubmit={(e) => { e.preventDefault(); mSenha.mutate(); }} className="max-w-md space-y-3 rounded-lg border border-line p-4">
          <p className="text-[13px]">Nova senha para <b>{alvo.email}</b></p>
          <input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={8} required
            placeholder="Mínimo 8 caracteres" className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-[13px]" />
          <div className="flex gap-2">
            <button disabled={mSenha.isPending} className="rounded-md bg-ink px-3 py-1.5 text-[13px] font-medium text-paper">
              {mSenha.isPending ? "Salvando…" : "Confirmar nova senha"}
            </button>
            <button type="button" onClick={() => setAlvo(null)} className="rounded-md border border-line px-3 py-1.5 text-[13px]">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
