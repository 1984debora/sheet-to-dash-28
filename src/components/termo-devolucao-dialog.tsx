import { useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Json, Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { ehMovel } from "@/components/equipamento-form";
import { AssinaturaPad } from "@/components/assinatura-pad";
import { baixarTermoDevolucao, type DadosTermoDevolucao } from "@/lib/termo-responsabilidade";
import { Campo } from "@/components/inventario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TermoDevolucaoDialog({ equip, setor = "", onClose }: { equip: Tables<"equipamentos">; setor?: string; onClose: () => void }) {
  const [f, setF] = useState<DadosTermoDevolucao>({
    empresa: "Óticas Gassi", usuario: equip.usuario_responsavel ?? "", documento: "", setor,
    data: new Date().toLocaleDateString("en-CA"), motivo: "Desligamento de colaborador",
    estadoGeral: "Em bom estado de conservação e funcionamento",
    acessoriosDevolvidos: ehMovel(equip.tipo) ? "Carregador bivolt, Cabo USB, Capa protetora" : "", observacoes: "",
  });
  const [busy, setBusy] = useState(false);
  const [modo, setModo] = useState<"form" | "assinar" | "link">("form");
  const [link, setLink] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const qc = useQueryClient();
  const valido = () => formRef.current?.reportValidity() ?? false;
  const set = (k: keyof DadosTermoDevolucao) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function salvar(extra: { status: string; assinatura?: string; assinado_em?: string }) {
    const { data, error } = await supabase.from("termos").insert({ equipamento_id: equip.id, tipo: "Devolução", dados: f as unknown as Json, ...extra }).select("token").single();
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["termos", equip.id] });
    return data.token;
  }
  async function assinarAgora(png: string) {
    setBusy(true);
    try {
      const em = new Date().toISOString();
      await salvar({ status: "Assinado", assinatura: png, assinado_em: em });
      await baixarTermoDevolucao(equip, f, { png, em });
      toast.success("Termo de devolução assinado e salvo na ficha");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar"); } finally { setBusy(false); }
  }
  async function gerarLink() {
    if (!valido()) return;
    setBusy(true);
    try { const token = await salvar({ status: "Pendente" }); setLink(`${window.location.origin}/assinar/${token}`); setModo("link"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao gerar link"); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Termo de devolução · {equip.patrimonio}</DialogTitle></DialogHeader>
        {modo === "assinar" && <div className="space-y-2"><p className="text-[13px]">Assinatura de <b>{f.usuario}</b></p><AssinaturaPad busy={busy} onConfirmar={assinarAgora} rotulo="Confirmar e baixar PDF" /><Button variant="ghost" onClick={() => setModo("form")}>← Voltar</Button></div>}
        {modo === "link" && <div className="space-y-3">
          <p className="text-[13px]">Envie este link para <b>{f.usuario}</b> assinar pelo celular. O termo fica como <b>Pendente</b> na ficha até a assinatura.</p>
          <Input readOnly value={link} onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }}>Copiar link</Button>
            <Button asChild><a href={`https://wa.me/?text=${encodeURIComponent(`Olá ${f.usuario}, assine o termo de devolução do equipamento ${equip.patrimonio}: ${link}`)}`} target="_blank" rel="noreferrer">Enviar no WhatsApp</a></Button>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>}
        <form ref={formRef} className={modo === "form" ? "grid gap-3 sm:grid-cols-2" : "hidden"} onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await baixarTermoDevolucao(equip, f); toast.success("Termo de devolução baixado"); } catch { toast.error("Não foi possível gerar o termo"); } finally { setBusy(false); } }}>
          <Campo label="Empresa *"><Input required maxLength={150} value={f.empresa} onChange={set("empresa")} /></Campo>
          <Campo label="Colaborador *"><Input required maxLength={150} value={f.usuario} onChange={set("usuario")} /></Campo>
          <Campo label="Documento / matrícula"><Input maxLength={150} value={f.documento} onChange={set("documento")} /></Campo>
          <Campo label="Setor / loja"><Input maxLength={150} value={f.setor} onChange={set("setor")} /></Campo>
          <Campo label="Data da devolução *"><Input type="date" required value={f.data} onChange={set("data")} /></Campo>
          <Campo label="Motivo *"><Input required maxLength={200} value={f.motivo} onChange={set("motivo")} /></Campo>
          <div className="sm:col-span-2"><Campo label="Acessórios devolvidos"><Input maxLength={500} value={f.acessoriosDevolvidos} onChange={set("acessoriosDevolvidos")} /></Campo></div>
          <div className="sm:col-span-2"><Campo label="Estado do equipamento"><Input maxLength={300} value={f.estadoGeral} onChange={set("estadoGeral")} /></Campo></div>
          <div className="sm:col-span-2"><Campo label="Observações / avarias"><Textarea maxLength={1000} value={f.observacoes} onChange={set("observacoes")} /></Campo></div>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
            <Button type="submit" variant="outline" disabled={busy}>Baixar PDF para imprimir</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={gerarLink}>Gerar link de assinatura</Button>
            <Button type="button" disabled={busy} onClick={() => valido() && setModo("assinar")}>Assinar agora na tela</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
