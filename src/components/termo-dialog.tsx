import { useState } from "react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { baixarTermo } from "@/lib/termo-responsabilidade";
import { Campo } from "@/components/inventario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TermoDialog({ equip, setor = "", onClose }: { equip: Tables<"equipamentos">; setor?: string; onClose: () => void }) {
  const [dados, setDados] = useState({ empresa: "", usuario: equip.usuario_responsavel ?? "", documento: "", setor, data: new Date().toLocaleDateString("en-CA"), acessorios: "", condicoes: "" });
  const [busy, setBusy] = useState(false);
  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
    <DialogHeader><DialogTitle>Termo de responsabilidade · {equip.patrimonio}</DialogTitle></DialogHeader>
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await baixarTermo(equip, dados); toast.success("Termo baixado para assinatura"); } catch { toast.error("Não foi possível gerar o termo"); } finally { setBusy(false); } }}>
      {([ ["empresa", "Empresa *"], ["usuario", "Colaborador *"], ["documento", "Documento / matrícula"], ["setor", "Setor / loja"], ["data", "Data de entrega *"] ] as const).map(([key, label]) => <Campo key={key} label={label}><Input type={key === "data" ? "date" : "text"} required={["empresa", "usuario", "data"].includes(key)} maxLength={150} value={dados[key]} onChange={e => setDados({ ...dados, [key]: e.target.value })} /></Campo>)}
      <Campo label="Acessórios"><Input value={dados.acessorios} maxLength={500} onChange={e => setDados({ ...dados, acessorios: e.target.value })} /></Campo>
      <div className="sm:col-span-2"><Campo label="Condições de entrega"><Textarea maxLength={1000} value={dados.condicoes} onChange={e => setDados({ ...dados, condicoes: e.target.value })} /></Campo></div>
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Fechar</Button><Button disabled={busy} type="submit">{busy ? "Gerando…" : "Baixar termo PDF"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}