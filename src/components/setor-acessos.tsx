import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { acessosQuery, fmtData } from "@/lib/inventario";
import { revelarAcesso, salvarAcesso } from "@/lib/setor-acessos.functions";
import { Campo, Vazio } from "@/components/inventario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const empty = { hostname: "", usuario: "", gerente_adm: "", anydesk: "", email: "", senha: "", senha_anydesk: "", senha_email: "" };
export function SetorAcessos({ setorId }: { setorId: string }) {
  const { data: rows = [], isPending, error } = useQuery(acessosQuery(setorId));
  const qc = useQueryClient(); const save = useServerFn(salvarAcesso); const reveal = useServerFn(revelarAcesso);
  const [form, setForm] = useState<(typeof empty & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [secrets, setSecrets] = useState<{ senha: string; senha_anydesk: string; senha_email: string } | null>(null);
  return <section className="mb-5 border-y border-line py-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Acessos do setor / loja</h2><Button variant="outline" onClick={() => setForm({ ...empty })}><Plus className="size-4" />Novo acesso</Button></div>
    <p className="mb-3 text-xs text-muted-ink">Senhas protegidas. Cada responsável acessa somente os cadastros que criou; não entram no PDF nem na análise de IA.</p>
    {error ? <p className="text-crit">Não foi possível carregar os acessos.</p> : isPending ? <Vazio texto="Carregando…" /> : rows.length === 0 ? <Vazio texto="Nenhum acesso cadastrado por você." /> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{["Hostname", "Usuário", "Gerente/Adm", "AnyDesk", "E-mail", "Última alteração", ""].map(t => <th className="p-2" key={t}>{t}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t border-line"><td className="p-2">{r.hostname}</td><td className="p-2">{r.usuario || "—"}</td><td className="p-2">{r.gerente_adm || "—"}</td><td className="p-2">{r.anydesk || "—"}</td><td className="p-2">{r.email || "—"}</td><td className="p-2">{fmtData(r.ultima_alteracao)}</td><td className="p-2"><div className="flex gap-1">
      <Button size="icon" variant="ghost" title="Editar acesso" aria-label="Editar acesso" onClick={() => setForm({ ...empty, id: r.id, hostname: r.hostname, usuario: r.usuario ?? "", gerente_adm: r.gerente_adm ?? "", anydesk: r.anydesk ?? "", email: r.email ?? "" })}><Pencil className="size-4" /></Button>
      <Button size="icon" variant="ghost" title="Consultar senhas" aria-label="Consultar senhas" disabled={busy} onClick={async () => { setBusy(true); try { setSecrets(await reveal({ data: { id: r.id } })); } catch { toast.error("Não foi possível consultar as senhas"); } finally { setBusy(false); } }}><Eye className="size-4" /></Button>
      <Button size="icon" variant="ghost" title="Excluir acesso" aria-label="Excluir acesso" onClick={async () => { if (!confirm("Excluir este acesso?")) return; const { error } = await supabase.from("setor_acessos").delete().eq("id", r.id); if (error) toast.error("Não foi possível excluir"); else qc.invalidateQueries({ queryKey: ["setor_acessos", setorId] }); }}><Trash2 className="size-4" /></Button>
    </div></td></tr>)}</tbody></table></div>}
    {form && <Dialog open onOpenChange={o => !o && setForm(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{form.id ? "Editar acesso" : "Novo acesso da loja"}</DialogTitle></DialogHeader>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await save({ data: { ...form, setorId } }); setForm(null); qc.invalidateQueries({ queryKey: ["setor_acessos", setorId] }); toast.success("Acesso salvo com senhas protegidas"); } catch { toast.error("Não foi possível salvar. Confira os dados e tente novamente."); } finally { setBusy(false); } }}>
        {([["hostname", "Hostname *"], ["usuario", "Usuário"], ["senha", "Senha do usuário"], ["gerente_adm", "Gerente/Adm"], ["anydesk", "AnyDesk"], ["senha_anydesk", "Senha AnyDesk"], ["email", "E-mail"], ["senha_email", "Senha do e-mail"]] as const).map(([key, label]) => <Campo key={key} label={label}><Input required={key === "hostname"} type={key.startsWith("senha") ? "password" : key === "email" ? "email" : "text"} autoComplete="off" maxLength={key.startsWith("senha") ? 500 : 100} placeholder={form.id && key.startsWith("senha") ? "Manter senha atual" : ""} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></Campo>)}
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button disabled={busy} type="submit">Salvar acesso</Button></div>
      </form>
    </DialogContent></Dialog>}
    {secrets && <Dialog open onOpenChange={o => !o && setSecrets(null)}><DialogContent><DialogHeader><DialogTitle>Senhas do acesso</DialogTitle></DialogHeader>{([["senha", "Senha do usuário"], ["senha_anydesk", "Senha AnyDesk"], ["senha_email", "Senha do e-mail"]] as const).map(([key, label]) => <Campo key={key} label={label}><Input type="password" readOnly value={secrets[key]} /></Campo>)}<Button variant="outline" onClick={() => setSecrets(null)}>Fechar</Button></DialogContent></Dialog>}
  </section>;
}