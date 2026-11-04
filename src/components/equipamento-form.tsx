import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, selectCls } from "@/components/inventario";
import { localizacoesQuery, rotuloLocal, STATUS_EQUIP } from "@/lib/inventario";

type Equip = Tables<"equipamentos">;

export function EquipamentoForm({
  aberto,
  onClose,
  equip,
}: {
  aberto: boolean;
  onClose: () => void;
  equip?: Equip;
}) {
  const qc = useQueryClient();
  const { data: locais = [] } = useQuery(localizacoesQuery);
  const [f, setF] = useState({
    patrimonio: equip?.patrimonio ?? "",
    numero_serie: equip?.numero_serie ?? "",
    tipo: equip?.tipo ?? "",
    marca: equip?.marca ?? "",
    modelo: equip?.modelo ?? "",
    usuario_responsavel: equip?.usuario_responsavel ?? "",
    data_compra: equip?.data_compra ?? "",
    garantia_ate: equip?.garantia_ate ?? "",
    status: equip?.status ?? "Em uso",
    localizacao_id: equip?.localizacao_id ?? "",
    observacoes: equip?.observacoes ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.patrimonio.trim() || !f.tipo.trim()) return toast.error("Informe patrimônio e tipo");
    setSalvando(true);
    const payload = {
      ...f,
      patrimonio: f.patrimonio.trim().slice(0, 50),
      tipo: f.tipo.trim().slice(0, 60),
      numero_serie: f.numero_serie.trim() || null,
      marca: f.marca.trim() || null,
      modelo: f.modelo.trim() || null,
      usuario_responsavel: f.usuario_responsavel.trim() || null,
      data_compra: f.data_compra || null,
      garantia_ate: f.garantia_ate || null,
      localizacao_id: f.localizacao_id || null,
      observacoes: f.observacoes.trim() || null,
    };
    const { error } = equip
      ? await supabase.from("equipamentos").update(payload).eq("id", equip.id)
      : await supabase.from("equipamentos").insert(payload);
    setSalvando(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "Patrimônio já cadastrado" : error.message);
    toast.success(equip ? "Equipamento atualizado" : "Equipamento cadastrado");
    qc.invalidateQueries();
    onClose();
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{equip ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
          <Campo label="Patrimônio *"><Input value={f.patrimonio} onChange={set("patrimonio")} maxLength={50} /></Campo>
          <Campo label="Nº de série"><Input value={f.numero_serie} onChange={set("numero_serie")} maxLength={100} /></Campo>
          <Campo label="Tipo * (ex: Notebook, Monitor)"><Input value={f.tipo} onChange={set("tipo")} maxLength={60} /></Campo>
          <Campo label="Marca"><Input value={f.marca} onChange={set("marca")} maxLength={60} /></Campo>
          <Campo label="Modelo"><Input value={f.modelo} onChange={set("modelo")} maxLength={100} /></Campo>
          <Campo label="Usuário responsável"><Input value={f.usuario_responsavel} onChange={set("usuario_responsavel")} maxLength={100} /></Campo>
          <Campo label="Data de compra"><Input type="date" value={f.data_compra} onChange={set("data_compra")} /></Campo>
          <Campo label="Garantia até"><Input type="date" value={f.garantia_ate} onChange={set("garantia_ate")} /></Campo>
          <Campo label="Status">
            <select className={selectCls} value={f.status} onChange={set("status")}>
              {STATUS_EQUIP.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Campo>
          <Campo label="Setor · Localização">
            <select className={selectCls} value={f.localizacao_id} onChange={set("localizacao_id")}>
              <option value="">— sem local —</option>
              {locais.map((l) => <option key={l.id} value={l.id}>{rotuloLocal(l)}</option>)}
            </select>
          </Campo>
          <div className="sm:col-span-2">
            <Campo label="Observações"><Textarea value={f.observacoes} onChange={set("observacoes")} maxLength={1000} /></Campo>
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
