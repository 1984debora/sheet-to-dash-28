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
import { localizacoesQuery, setoresQuery, rotuloLocal, STATUS_EQUIP } from "@/lib/inventario";

type Equip = Tables<"equipamentos">;

const TIPOS_COMPUTADOR = ["notebook", "desktop", "servidor", "computador", "workstation"];
const RAM_CAP = ["4 GB", "8 GB", "16 GB", "32 GB", "64 GB", "128 GB"];
const RAM_TIPO = ["DDR3", "DDR4", "DDR5", "LPDDR4", "LPDDR5"];
const DISCO_TIPO = ["SSD NVMe", "SSD SATA", "HD Mecânico"];
const DISCO_CAP = ["128 GB", "256 GB", "512 GB", "1 TB", "2 TB", "4 TB"];
const SO = ["Windows 11 Pro", "Windows 11 Home", "Windows 10 Pro", "Windows Server", "Linux Ubuntu", "macOS"];

function ehComputador(tipo: string) {
  const t = tipo.toLowerCase();
  return TIPOS_COMPUTADOR.some((k) => t.includes(k));
}

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
    processador: equip?.processador ?? "",
    ram_capacidade: equip?.ram_capacidade ?? "",
    ram_tipo: equip?.ram_tipo ?? "",
    armazenamento_tipo: equip?.armazenamento_tipo ?? "",
    armazenamento_capacidade: equip?.armazenamento_capacidade ?? "",
    sistema_operacional: equip?.sistema_operacional ?? "",
    conexao: equip?.conexao ?? "",
    endereco_ip: equip?.endereco_ip ?? "",
  });
  const [segundaTela, setSegundaTela] = useState(equip?.segunda_tela ?? false);
  const [salvando, setSalvando] = useState(false);
  const [novoLocal, setNovoLocal] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const hw = ehComputador(f.tipo);
  const imp = /impressora|multifuncional/i.test(f.tipo);
  const note = /notebook/i.test(f.tipo);
  const n = (v: string) => v.trim() || null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.patrimonio.trim() || !f.tipo.trim()) { toast.error("Informe patrimônio e tipo"); return; }
    setSalvando(true);
    const payload = {
      ...f,
      patrimonio: f.patrimonio.trim().slice(0, 50),
      tipo: f.tipo.trim().slice(0, 60),
      numero_serie: n(f.numero_serie),
      marca: n(f.marca),
      modelo: n(f.modelo),
      usuario_responsavel: n(f.usuario_responsavel),
      data_compra: f.data_compra || null,
      garantia_ate: f.garantia_ate || null,
      localizacao_id: f.localizacao_id || null,
      observacoes: n(f.observacoes),
      processador: hw ? n(f.processador) : null,
      ram_capacidade: hw ? n(f.ram_capacidade) : null,
      ram_tipo: hw ? n(f.ram_tipo) : null,
      armazenamento_tipo: hw ? n(f.armazenamento_tipo) : null,
      armazenamento_capacidade: hw ? n(f.armazenamento_capacidade) : null,
      sistema_operacional: hw ? n(f.sistema_operacional) : null,
      conexao: imp ? n(f.conexao) : null,
      endereco_ip: imp ? n(f.endereco_ip) : null,
      segunda_tela: note ? segundaTela : false,
    };
    const { error } = equip
      ? await supabase.from("equipamentos").update(payload).eq("id", equip.id)
      : await supabase.from("equipamentos").insert(payload);
    setSalvando(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "Patrimônio já cadastrado" : error.message); return; }
    toast.success(equip ? "Equipamento atualizado" : "Equipamento cadastrado");
    qc.invalidateQueries();
    onClose();
  }

  const lista = (id: string, ops: string[]) => (
    <datalist id={id}>{ops.map((o) => <option key={o} value={o} />)}</datalist>
  );

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{equip ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
          <Campo label="Patrimônio *"><Input value={f.patrimonio} onChange={set("patrimonio")} maxLength={50} /></Campo>
          <Campo label="Nº de série"><Input value={f.numero_serie} onChange={set("numero_serie")} maxLength={100} /></Campo>
          <Campo label="Tipo * (ex: Notebook, Desktop, Monitor)">
            <Input value={f.tipo} onChange={set("tipo")} maxLength={60} list="tipos-equip" />
            {lista("tipos-equip", ["Notebook", "Desktop", "Servidor", "Monitor", "Impressora", "Celular", "Tablet", "Switch", "Roteador"])}
          </Campo>
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
            <div className="flex gap-2">
              <select className={selectCls} value={f.localizacao_id} onChange={set("localizacao_id")}>
                <option value="">— sem local —</option>
                {locais.map((l) => <option key={l.id} value={l.id}>{rotuloLocal(l)}</option>)}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={() => setNovoLocal(true)}>+ Novo</Button>
            </div>
          </Campo>

          {hw && (
            <fieldset className="grid gap-3 rounded-md border border-border p-3 sm:col-span-2 sm:grid-cols-2">
              <legend className="px-1 font-mono text-[11px] uppercase tracking-wide text-muted-ink">Especificações de hardware</legend>
              <div className="sm:col-span-2">
                <Campo label="Processador"><Input value={f.processador} onChange={set("processador")} maxLength={100} placeholder="ex: Intel Core i5 12ª geração" /></Campo>
              </div>
              <Campo label="Memória RAM · capacidade">
                <Input value={f.ram_capacidade} onChange={set("ram_capacidade")} maxLength={20} list="ram-cap" />
                {lista("ram-cap", RAM_CAP)}
              </Campo>
              <Campo label="Memória RAM · tipo">
                <Input value={f.ram_tipo} onChange={set("ram_tipo")} maxLength={20} list="ram-tipo" />
                {lista("ram-tipo", RAM_TIPO)}
              </Campo>
              <Campo label="Armazenamento · tipo">
                <Input value={f.armazenamento_tipo} onChange={set("armazenamento_tipo")} maxLength={30} list="disco-tipo" />
                {lista("disco-tipo", DISCO_TIPO)}
              </Campo>
              <Campo label="Armazenamento · capacidade">
                <Input value={f.armazenamento_capacidade} onChange={set("armazenamento_capacidade")} maxLength={20} list="disco-cap" />
                {lista("disco-cap", DISCO_CAP)}
              </Campo>
              <div className="sm:col-span-2">
                <Campo label="Sistema operacional">
                  <Input value={f.sistema_operacional} onChange={set("sistema_operacional")} maxLength={60} list="so-lista" />
                  {lista("so-lista", SO)}
                </Campo>
              </div>
            </fieldset>
          )}

          {imp && (
            <fieldset className="grid gap-3 rounded-md border border-border p-3 sm:col-span-2 sm:grid-cols-2">
              <legend className="px-1 font-mono text-[11px] uppercase tracking-wide text-muted-ink">Rede da impressora</legend>
              <Campo label="Conexão">
                <select className={selectCls} value={f.conexao} onChange={set("conexao")}>
                  <option value="">—</option>
                  {["Cabo de rede", "Wi-Fi", "USB"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo label="Endereço IP"><Input value={f.endereco_ip} onChange={set("endereco_ip")} maxLength={45} placeholder="ex: 192.168.1.150" /></Campo>
            </fieldset>
          )}

          {note && (
            <label className="flex items-center gap-2 text-[12.5px] sm:col-span-2">
              <input type="checkbox" checked={segundaTela} onChange={(e) => setSegundaTela(e.target.checked)} />
              Usa segunda tela
            </label>
          )}

          <div className="sm:col-span-2">
            <Campo label="Observações"><Textarea value={f.observacoes} onChange={set("observacoes")} maxLength={1000} /></Campo>
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>Salvar</Button>
          </div>
        </form>
        <NovoLocalDialog
          aberto={novoLocal}
          onClose={() => setNovoLocal(false)}
          onCriado={(id) => setF((p) => ({ ...p, localizacao_id: id }))}
        />
      </DialogContent>
    </Dialog>
  );
}

function NovoLocalDialog({ aberto, onClose, onCriado }: { aberto: boolean; onClose: () => void; onCriado: (id: string) => void }) {
  const qc = useQueryClient();
  const { data: setores = [] } = useQuery(setoresQuery);
  const [setorId, setSetorId] = useState("");
  const [novoSetor, setNovoSetor] = useState("");
  const [sala, setSala] = useState("Sala principal");
  const [salvando, setSalvando] = useState(false);

  async function criar() {
    if (!setorId && !novoSetor.trim()) { toast.error("Escolha ou digite um setor"); return; }
    if (!sala.trim()) { toast.error("Informe a sala/ambiente"); return; }
    setSalvando(true);
    let sid = setorId;
    if (!sid) {
      const { data, error } = await supabase.from("setores").insert({ nome: novoSetor.trim().slice(0, 80) }).select("id").single();
      if (error || !data) { setSalvando(false); toast.error(error?.message ?? "Erro ao criar setor"); return; }
      sid = data.id;
    }
    const { data: loc, error } = await supabase.from("localizacoes").insert({ setor_id: sid, nome: sala.trim().slice(0, 80) }).select("id").single();
    setSalvando(false);
    if (error || !loc) { toast.error(error?.message ?? "Erro ao criar local"); return; }
    await qc.invalidateQueries({ queryKey: ["localizacoes"] });
    await qc.invalidateQueries({ queryKey: ["setores"] });
    onCriado(loc.id);
    toast.success("Local cadastrado e selecionado");
    setSetorId(""); setNovoSetor(""); setSala("Sala principal");
    onClose();
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Novo setor / local</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Campo label="Setor existente">
            <select className={selectCls} value={setorId} onChange={(e) => setSetorId(e.target.value)}>
              <option value="">— criar novo setor —</option>
              {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </Campo>
          {!setorId && (
            <Campo label="Nome do novo setor"><Input value={novoSetor} onChange={(e) => setNovoSetor(e.target.value)} maxLength={80} placeholder="ex: Jurídico" /></Campo>
          )}
          <Campo label="Sala / ambiente"><Input value={sala} onChange={(e) => setSala(e.target.value)} maxLength={80} /></Campo>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={criar} disabled={salvando}>Cadastrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
