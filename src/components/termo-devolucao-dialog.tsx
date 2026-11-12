import { useState } from "react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { ehMovel } from "@/components/equipamento-form";
import { baixarTermoDevolucao, type DadosTermoDevolucao } from "@/lib/termo-responsabilidade";
import { Campo } from "@/components/inventario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TermoDevolucaoDialog({ equip, setor = "", onClose }: { equip: Tables<"equipamentos">; setor?: string; onClose: () => void }) {
  const [f, setF] = useState<DadosTermoDevolucao>({
    empresa: "Óticas Gassi",
    usuario: equip.usuario_responsavel ?? "",
    documento: "",
    setor,
    data: new Date().toLocaleDateString("en-CA"),
    motivo: "Desligamento de colaborador",
    estadoGeral: "Em bom estado de conservação e funcionamento",
    acessoriosDevolvidos: ehMovel(equip.tipo) ? "Carregador bivolt, Cabo USB, Capa protetora" : "",
    observacoes: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof DadosTermoDevolucao) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await baixarTermoDevolucao(equip, f);
      toast.success("Termo de devolução baixado");
    } catch {
      toast.error("Não foi possível gerar o termo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Termo de devolução · {equip.patrimonio}</DialogTitle></DialogHeader>
        <form onSubmit={gerar} className="grid gap-3 sm:grid-cols-2">
          <Campo label="Empresa *"><Input required maxLength={150} value={f.empresa} onChange={set("empresa")} /></Campo>
          <Campo label="Colaborador *"><Input required maxLength={150} value={f.usuario} onChange={set("usuario")} /></Campo>
          <Campo label="Documento / matrícula"><Input maxLength={150} value={f.documento} onChange={set("documento")} /></Campo>
          <Campo label="Setor / loja"><Input maxLength={150} value={f.setor} onChange={set("setor")} /></Campo>
          <Campo label="Data da devolução *"><Input type="date" required value={f.data} onChange={set("data")} /></Campo>
          <Campo label="Motivo *"><Input required maxLength={200} value={f.motivo} onChange={set("motivo")} /></Campo>
          <div className="sm:col-span-2"><Campo label="Acessórios devolvidos"><Input maxLength={500} value={f.acessoriosDevolvidos} onChange={set("acessoriosDevolvidos")} /></Campo></div>
          <div className="sm:col-span-2"><Campo label="Estado do equipamento"><Input maxLength={300} value={f.estadoGeral} onChange={set("estadoGeral")} /></Campo></div>
          <div className="sm:col-span-2"><Campo label="Observações / avarias"><Textarea maxLength={1000} value={f.observacoes} onChange={set("observacoes")} /></Campo></div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={busy} type="submit">{busy ? "Gerando…" : "Baixar termo de devolução (PDF)"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
