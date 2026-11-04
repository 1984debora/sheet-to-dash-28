import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, Cartao, Pill, Vazio, selectCls } from "@/components/inventario";
import { EquipamentoForm } from "@/components/equipamento-form";
import {
  equipamentoQuery,
  fmtData,
  localizacoesQuery,
  rotuloLocal,
  statusGarantia,
  STATUS_MANUT,
  TIPOS_MANUT,
} from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/equipamentos/$id")({
  head: () => ({ meta: [{ title: "Equipamento | Inventário de TI" }] }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(equipamentoQuery(params.id)),
      context.queryClient.ensureQueryData(localizacoesQuery),
    ]),
  component: Detalhe,
  errorComponent: ({ error }) => <div className="p-6 text-sm">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">Equipamento não encontrado.</div>,
});

function Detalhe() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(equipamentoQuery(id));
  const { equip, movs, mans, hist } = data;
  const [editar, setEditar] = useState(false);
  const [mover, setMover] = useState(false);
  const [manut, setManut] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const g = statusGarantia(equip.garantia_ate);

  async function excluir() {
    if (!confirm(`Excluir o equipamento ${equip.patrimonio} e todo o seu histórico?`)) return;
    const { error } = await supabase.from("equipamentos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
    navigate({ to: "/equipamentos" });
  }

  const info: [string, string][] = [
    ["Tipo", equip.tipo],
    ["Marca / Modelo", [equip.marca, equip.modelo].filter(Boolean).join(" ") || "—"],
    ["Nº de série", equip.numero_serie ?? "—"],
    ["Usuário responsável", equip.usuario_responsavel ?? "—"],
    ["Setor · Local", rotuloLocal(equip.localizacoes)],
    ["Data de compra", fmtData(equip.data_compra)],
    ["Garantia até", `${fmtData(equip.garantia_ate)}${g === "vencida" ? " (vencida)" : g === "vencendo" ? " (vence em breve)" : ""}`],
  ];

  return (
    <>
      <Link to="/equipamentos" className="font-mono text-[11px] text-muted-ink hover:text-ink">← equipamentos</Link>
      <div className="mt-2 mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-[24px] font-extrabold tracking-tight">{equip.patrimonio}</h1>
        <Pill texto={equip.status} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button onClick={() => setMover(true)}>Registrar movimentação</Button>
          <Button variant="outline" onClick={() => setManut(true)}>Registrar manutenção</Button>
          <Button variant="outline" onClick={() => setEditar(true)}>Editar</Button>
          <Button variant="ghost" onClick={excluir}>Excluir</Button>
        </div>
      </div>

      <Cartao className="grid gap-px overflow-hidden bg-line sm:grid-cols-2 lg:grid-cols-4">
        {info.map(([k, v]) => (
          <div key={k} className="bg-paper p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-ink">{k}</div>
            <div className="mt-1.5 text-[13px] font-medium">{v}</div>
          </div>
        ))}
        {equip.observacoes && (
          <div className="bg-paper p-4 sm:col-span-2 lg:col-span-4 text-[12.5px] text-muted-ink">{equip.observacoes}</div>
        )}
      </Cartao>

      <Tabs defaultValue="mov" className="mt-6">
        <TabsList>
          <TabsTrigger value="mov">Movimentações ({movs.length})</TabsTrigger>
          <TabsTrigger value="man">Manutenções ({mans.length})</TabsTrigger>
          <TabsTrigger value="usu">Usuários que já utilizaram ({hist.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="mov">
          <Cartao>
            <Tabela
              cab={["Data", "Origem", "Destino", "Usuário anterior", "Novo usuário", "Motivo"]}
              linhas={movs.map((m) => [fmtData(m.data), rotuloLocal(m.origem), rotuloLocal(m.destino), m.usuario_anterior ?? "—", m.usuario_novo ?? "—", m.motivo ?? "—"])}
              vazio="Nenhuma movimentação registrada."
            />
          </Cartao>
        </TabsContent>
        <TabsContent value="man">
          <Cartao>
            <ManutTabela mans={mans} />
          </Cartao>
        </TabsContent>
        <TabsContent value="usu">
          <Cartao>
            <Tabela
              cab={["Usuário", "Início", "Fim"]}
              linhas={hist.map((h) => [h.usuario, fmtData(h.inicio), h.fim ? fmtData(h.fim) : "atual"])}
              vazio="Nenhum usuário registrado."
            />
          </Cartao>
        </TabsContent>
      </Tabs>

      {editar && <EquipamentoForm aberto equip={equip} onClose={() => setEditar(false)} />}
      {mover && <MovimentacaoDialog equip={equip} onClose={() => setMover(false)} />}
      {manut && <ManutencaoDialog equipId={equip.id} onClose={() => setManut(false)} />}
    </>
  );
}

function Tabela({ cab, linhas, vazio }: { cab: string[]; linhas: string[][]; vazio: string }) {
  if (linhas.length === 0) return <Vazio texto={vazio} />;
  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-soft">
            {cab.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {linhas.map((l, i) => (
            <tr key={i}>{l.map((c, j) => <td key={j} className="px-4 py-2.5">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Man = { id: string; data: string; tipo: string; descricao: string; tecnico: string | null; custo: number | null; status: string };

function ManutTabela({ mans }: { mans: Man[] }) {
  const qc = useQueryClient();
  async function mudar(id: string, status: string) {
    const { error } = await supabase.from("manutencoes").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
  }
  if (mans.length === 0) return <Vazio texto="Nenhuma manutenção registrada." />;
  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-soft">
            {["Data", "Tipo", "Descrição", "Técnico", "Custo", "Status"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {mans.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-2.5 font-mono">{fmtData(m.data)}</td>
              <td className="px-4 py-2.5">{m.tipo}</td>
              <td className="px-4 py-2.5">{m.descricao}</td>
              <td className="px-4 py-2.5">{m.tecnico ?? "—"}</td>
              <td className="px-4 py-2.5 font-mono">{m.custo != null ? Number(m.custo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</td>
              <td className="px-4 py-2.5">
                <select value={m.status} onChange={(e) => mudar(m.id, e.target.value)} className={`${selectCls} h-8 w-auto text-[12px]`}>
                  {STATUS_MANUT.map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function MovimentacaoDialog({
  equip,
  onClose,
}: {
  equip: { id: string; localizacao_id: string | null; usuario_responsavel: string | null };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: locais = [] } = useQuery(localizacoesQuery);
  const [destino, setDestino] = useState(equip.localizacao_id ?? "");
  const [usuario, setUsuario] = useState(equip.usuario_responsavel ?? "");
  const [data, setData] = useState(hoje());
  const [motivo, setMotivo] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const novoUsuario = usuario.trim().slice(0, 100) || null;
    const r1 = await supabase.from("movimentacoes").insert({
      equipamento_id: equip.id,
      origem_localizacao_id: equip.localizacao_id,
      destino_localizacao_id: destino || null,
      usuario_anterior: equip.usuario_responsavel,
      usuario_novo: novoUsuario,
      data,
      motivo: motivo.trim().slice(0, 500) || null,
    });
    if (r1.error) return toast.error(r1.error.message);
    const r2 = await supabase
      .from("equipamentos")
      .update({ localizacao_id: destino || null, usuario_responsavel: novoUsuario })
      .eq("id", equip.id);
    if (r2.error) return toast.error(r2.error.message);
    toast.success("Movimentação registrada");
    qc.invalidateQueries();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar movimentação</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="space-y-3">
          <Campo label="Novo setor · localização">
            <select className={selectCls} value={destino} onChange={(e) => setDestino(e.target.value)}>
              <option value="">— sem local (estoque) —</option>
              {locais.map((l) => <option key={l.id} value={l.id}>{rotuloLocal(l)}</option>)}
            </select>
          </Campo>
          <Campo label="Novo usuário responsável"><Input value={usuario} onChange={(e) => setUsuario(e.target.value)} maxLength={100} /></Campo>
          <Campo label="Data"><Input type="date" required value={data} onChange={(e) => setData(e.target.value)} /></Campo>
          <Campo label="Motivo"><Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} /></Campo>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManutencaoDialog({ equipId, onClose }: { equipId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ data: hoje(), tipo: "Corretiva", descricao: "", tecnico: "", custo: "", status: "Aberta" });
  const [marcar, setMarcar] = useState(true);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.descricao.trim()) return toast.error("Descreva a manutenção");
    const custo = f.custo ? Number(f.custo.replace(",", ".")) : null;
    if (custo != null && (Number.isNaN(custo) || custo < 0)) return toast.error("Custo inválido");
    const { error } = await supabase.from("manutencoes").insert({
      equipamento_id: equipId,
      data: f.data,
      tipo: f.tipo,
      descricao: f.descricao.trim().slice(0, 1000),
      tecnico: f.tecnico.trim().slice(0, 100) || null,
      custo,
      status: f.status,
    });
    if (error) return toast.error(error.message);
    if (marcar && f.status !== "Concluída") {
      await supabase.from("equipamentos").update({ status: "Em manutenção" }).eq("id", equipId);
    }
    toast.success("Manutenção registrada");
    qc.invalidateQueries();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar manutenção</DialogTitle></DialogHeader>
        <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
          <Campo label="Data"><Input type="date" required value={f.data} onChange={set("data")} /></Campo>
          <Campo label="Tipo">
            <select className={selectCls} value={f.tipo} onChange={set("tipo")}>{TIPOS_MANUT.map((t) => <option key={t}>{t}</option>)}</select>
          </Campo>
          <div className="sm:col-span-2"><Campo label="Descrição *"><Textarea value={f.descricao} onChange={set("descricao")} maxLength={1000} /></Campo></div>
          <Campo label="Técnico / empresa"><Input value={f.tecnico} onChange={set("tecnico")} maxLength={100} /></Campo>
          <Campo label="Custo (R$)"><Input inputMode="decimal" value={f.custo} onChange={set("custo")} /></Campo>
          <Campo label="Status">
            <select className={selectCls} value={f.status} onChange={set("status")}>{STATUS_MANUT.map((s) => <option key={s}>{s}</option>)}</select>
          </Campo>
          <label className="flex items-center gap-2 self-end pb-2 text-[12px]">
            <input type="checkbox" checked={marcar} onChange={(e) => setMarcar(e.target.checked)} />
            Marcar equipamento como "Em manutenção"
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
