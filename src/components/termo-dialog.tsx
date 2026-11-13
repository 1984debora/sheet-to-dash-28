import { useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Json, Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { ehMovel } from "@/components/equipamento-form";
import { AssinaturaPad } from "@/components/assinatura-pad";
import { baixarTermo } from "@/lib/termo-responsabilidade";
import { Campo } from "@/components/inventario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TermoDialog({ equip, setor = "", onClose }: { equip: Tables<"equipamentos">; setor?: string; onClose: () => void }) {
  const [dados, setDados] = useState({ empresa: "Óticas Gassi", usuario: equip.usuario_responsavel ?? "", documento: "", setor, data: new Date().toLocaleDateString("en-CA"), acessorios: ehMovel(equip.tipo) ? "Carregador bivolt, Cabo USB, Capa protetora, Película aplicada" : "", condicoes: "" });
  const [busy, setBusy] = useState(false);
  const [modo, setModo] = useState<"form" | "assinar" | "link">("form");
  const [link, setLink] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const qc = useQueryClient();
  const valido = () => formRef.current?.reportValidity() ?? false;

  async function salvar(extra: { status: string; assinatura?: string; assinado_em?: string }) {
    const { data, error } = await supabase.from("termos").insert({ equipamento_id: equip.id, dados: dados as unknown as Json, ...extra }).select("token").single();
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["termos", equip.id] });
    return data.token;
  }

  async function assinarAgora(png: string) {
    setBusy(true);
    try {
      const em = new Date().toISOString();
      await salvar({ status: "Assinado", assinatura: png, assinado_em: em });
      await baixarTermo(equip, dados, { png, em });
      toast.success("Termo assinado e salvo na ficha do equipamento");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar"); } finally { setBusy(false); }
  }

  async function gerarLink() {
    if (!valido()) return;
    setBusy(true);
    try { const token = await salvar({ status: "Pendente" }); setLink(`${window.location.origin}/assinar/${token}`); setModo("link"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao gerar link"); } finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
    <DialogHeader><DialogTitle>Termo de responsabilidade · {equip.patrimonio}</DialogTitle></DialogHeader>
    {modo === "assinar" && <div className="space-y-2"><p className="text-[13px]">Assinatura de <b>{dados.usuario}</b></p><AssinaturaPad busy={busy} onConfirmar={assinarAgora} rotulo="Confirmar e baixar PDF" /><Button variant="ghost" onClick={() => setModo("form")}>← Voltar</Button></div>}
    {modo === "link" && <div className="space-y-3">
      <p className="text-[13px]">Envie este link para <b>{dados.usuario}</b> assinar pelo celular. O termo fica como <b>Pendente</b> na ficha até a assinatura.</p>
      <Input readOnly value={link} onFocus={e => e.target.select()} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }}>Copiar link</Button>
        <Button asChild><a href={`https://wa.me/?text=${encodeURIComponent(`Olá ${dados.usuario}, assine o termo de responsabilidade do equipamento ${equip.patrimonio}: ${link}`)}`} target="_blank" rel="noreferrer">Enviar no WhatsApp</a></Button>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </div>}
    <form ref={formRef} className={modo === "form" ? "grid gap-3 sm:grid-cols-2" : "hidden"} onSubmit={async e => { e.preventDefault(); setBusy(true); try { await baixarTermo(equip, dados); toast.success("Termo baixado para assinatura"); } catch { toast.error("Não foi possível gerar o termo"); } finally { setBusy(false); } }}>
      {([ ["empresa", "Empresa *"], ["usuario", "Colaborador *"], ["documento", "Documento / matrícula"], ["setor", "Setor / loja"], ["data", "Data de entrega *"] ] as const).map(([key, label]) => <Campo key={key} label={label}><Input type={key === "data" ? "date" : "text"} required={["empresa", "usuario", "data"].includes(key)} maxLength={150} value={dados[key]} onChange={e => setDados({ ...dados, [key]: e.target.value })} /></Campo>)}
      <Campo label="Acessórios"><Input value={dados.acessorios} maxLength={500} onChange={e => setDados({ ...dados, acessorios: e.target.value })} /></Campo>
      <div className="sm:col-span-2"><Campo label="Condições de entrega"><Textarea maxLength={1000} value={dados.condicoes} onChange={e => setDados({ ...dados, condicoes: e.target.value })} /></Campo></div>
      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
        <Button type="submit" variant="outline" disabled={busy}>Baixar PDF para imprimir</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={gerarLink}>Gerar link de assinatura</Button>
        <Button type="button" disabled={busy} onClick={() => valido() && setModo("assinar")}>Assinar agora na tela</Button>
      </div>
    </form>
  </DialogContent></Dialog>;
}
