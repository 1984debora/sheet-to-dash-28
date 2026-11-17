import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, Cartao, Vazio, selectCls } from "@/components/inventario";
import { Textarea } from "@/components/ui/textarea";
import { usePapel } from "@/hooks/use-papel";


export const contasMoveisQuery = {
  queryKey: ["contas_moveis"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("contas_moveis")
      .select("*, equipamentos(id, patrimonio, tipo, modelo)")
      .order("email");
    if (error) throw error;
    return data;
  },
};

type Conta = Awaited<ReturnType<typeof contasMoveisQuery.queryFn>>[number];

/** Reserva a conta para o aparelho; falha se outra pessoa já pegou. */
export async function vincularConta(contaId: string, equipamentoId: string) {
  const { data, error } = await supabase
    .from("contas_moveis")
    .update({ equipamento_id: equipamentoId, vinculado_em: new Date().toISOString() })
    .eq("id", contaId)
    .is("equipamento_id", null)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

function Dados({ c }: { c: Pick<Conta, "senha" | "email_recuperacao" | "telefone_2fa" | "pin"> }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="grid gap-1 text-[12px]">
      <div>Senha: <span className="font-mono">{c.senha ? (ver ? c.senha : "••••••••") : "—"}</span>
        {c.senha && <button type="button" className="ml-2 underline" onClick={() => setVer(!ver)}>{ver ? "ocultar" : "mostrar"}</button>}
      </div>
      <div>Recuperação: {c.email_recuperacao ?? "—"}</div>
      <div>Telefone 2 etapas: {c.telefone_2fa ?? "—"}</div>
      <div>PIN: <span className="font-mono">{c.pin ? (ver ? c.pin : "••••") : "—"}</span></div>
    </div>
  );
}

/** Bloco dentro do cadastro de celular/tablet: sugere a próxima conta livre. */
export function SugestaoConta({ valor, onChange }: { valor: string; onChange: (id: string) => void }) {
  const { data: contas = [] } = useQuery(contasMoveisQuery);
  const [nova, setNova] = useState(false);
  const livres = contas.filter((c) => !c.equipamento_id);
  const sel = livres.find((c) => c.id === valor);
  return (
    <fieldset className="grid gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 sm:col-span-2">
      <legend className="px-1 font-mono text-[11px] uppercase tracking-wide text-primary">Conta de e-mail do aparelho</legend>
      {livres.length === 0 ? (
        <p className="text-[12.5px] text-muted-ink">Nenhuma conta disponível. Cadastre uma nova.</p>
      ) : !sel ? (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <span>Conta disponível: <b>{livres[0]!.email}</b></span>
          <Button type="button" size="sm" onClick={() => onChange(livres[0]!.id)}>Usar esta conta</Button>
        </div>
      ) : (
        <>
          <div className="text-[12.5px]">Conta escolhida: <b>{sel.email}</b></div>
          <Dados c={sel} />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {livres.length > 0 && (
          <select className={`${selectCls} h-8 w-auto text-[12px]`} value={valor} onChange={(e) => onChange(e.target.value)}>
            <option value="">— não vincular —</option>
            {livres.map((c) => <option key={c.id} value={c.id}>{c.email}</option>)}
          </select>
        )}
        <Button type="button" size="sm" variant="outline" onClick={() => setNova(true)}>+ Cadastrar nova conta</Button>
      </div>
      <ContaDialog aberto={nova} onClose={() => setNova(false)} onCriada={onChange} />
    </fieldset>
  );
}

/** Conta já vinculada ao aparelho (página do equipamento / edição). */
export function ContaDoAparelho({ equipamentoId }: { equipamentoId: string }) {
  const qc = useQueryClient();
  const { ehAdmin } = usePapel(); // Verifica se o usuário atual é Administrador
  const { data: contas = [] } = useQuery(contasMoveisQuery);
  const [modalAberto, setModalAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const c = contas.find((x) => x.equipamento_id === equipamentoId);
  if (!c) return null;

  async function handleDesvincular() {
    if (!motivo.trim()) {
      toast.error("Informe a justificativa da desvinculação");
      return;
    }

    setSalvando(true);
    try {
      const dataHoje = new Date().toLocaleDateString("pt-BR");
      const novaObs = [
        c.observacoes,
        `[${dataHoje} - Desvinculada de ${c.equipamentos?.patrimonio ?? "aparelho"} por Admin: ${motivo.trim()}]`,
      ]
        .filter(Boolean)
        .join("\n");

      // 1. Libera a conta no banco e grava a justificativa nas observações
      const { error: erroConta } = await supabase
        .from("contas_moveis")
        .update({
          equipamento_id: null,
          vinculado_em: null,
          observacoes: novaObs,
        })
        .eq("id", c.id);

      if (erroConta) throw erroConta;

      // 2. Cria um registro no histórico de movimentações do equipamento
      await supabase.from("movimentacoes").insert({
        equipamento_id: equipamentoId,
        data: new Date().toISOString().slice(0, 10),
        motivo: `Desvinculação de conta Google (${c.email}) - Justificativa: ${motivo.trim()}`,
      });

      // 3. Atualiza os dados na tela
      await qc.invalidateQueries({ queryKey: ["contas_moveis"] });
      await qc.invalidateQueries();

      toast.success("Conta desvinculada com sucesso!");
      setModalAberto(false);
      setMotivo("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao desvincular conta");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-md border border-border p-3 sm:col-span-2">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px]">Conta vinculada: <b>{c.email}</b></div>
        {/* Botão visível exclusivamente para perfil Admin */}
        {ehAdmin && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setModalAberto(true)}
          >
            Desvincular conta
          </Button>
        )}
      </div>
      <Dados c={c} />

      {/* Janela de Justificativa */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desvincular Conta Google</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Você está desvinculando <b>{c.email}</b>. A conta voltará a ficar disponível para novos aparelhos.
            </p>
            <div className="grid gap-1">
              <label className="text-xs font-medium">Justificativa / Motivo *</label>
              <Textarea
                placeholder="Ex: Aparelho resetado de fábrica / Troca de colaborador / Manutenção..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={salvando || !motivo.trim()}
                onClick={handleDesvincular}
              >
                {salvando ? "Desvinculando..." : "Confirmar desvinculação"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function ContaDialog({ aberto, onClose, onCriada, conta }: { aberto: boolean; onClose: () => void; onCriada?: (id: string) => void; conta?: Conta }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    email: conta?.email ?? "", senha: conta?.senha ?? "", email_recuperacao: conta?.email_recuperacao ?? "",
    telefone_2fa: conta?.telefone_2fa ?? "", pin: conta?.pin ?? "", observacoes: conta?.observacoes ?? "",
  });
  const [ver, setVer] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function salvar() {
    const email = f.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Informe um e-mail válido"); return; }
    const n = (v: string) => v.trim() || null;
    const payload = { email, senha: n(f.senha), email_recuperacao: n(f.email_recuperacao), telefone_2fa: n(f.telefone_2fa), pin: n(f.pin), observacoes: n(f.observacoes) };
    const res = conta
      ? await supabase.from("contas_moveis").update(payload).eq("id", conta.id).select("id").single()
      : await supabase.from("contas_moveis").insert(payload).select("id").single();
    if (res.error) { toast.error(res.error.message.includes("duplicate") ? "E-mail já cadastrado" : res.error.message); return; }
    await qc.invalidateQueries({ queryKey: ["contas_moveis"] });
    toast.success("Conta salva");
    onCriada?.(res.data.id);
    onClose();
  }
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{conta ? "Editar conta" : "Nova conta de e-mail"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Campo label="E-mail *"><Input value={f.email} onChange={set("email")} maxLength={150} placeholder="loja@gmail.com" /></Campo>
          <Campo label="Senha">
            <div className="flex gap-2">
              <Input type={ver ? "text" : "password"} value={f.senha} onChange={set("senha")} maxLength={100} />
              <Button type="button" variant="outline" size="sm" onClick={() => setVer(!ver)}>{ver ? "Ocultar" : "Mostrar"}</Button>
            </div>
          </Campo>
          <Campo label="E-mail de recuperação"><Input value={f.email_recuperacao} onChange={set("email_recuperacao")} maxLength={150} /></Campo>
          <Campo label="Telefone de verificação (2 etapas)"><Input value={f.telefone_2fa} onChange={set("telefone_2fa")} maxLength={30} /></Campo>
          <Campo label="PIN"><Input value={f.pin} onChange={set("pin")} maxLength={20} /></Campo>
          <Campo label="Observações"><Input value={f.observacoes} onChange={set("observacoes")} maxLength={300} /></Campo>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={salvar}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Painel de consulta dentro de Equipamentos. */
export function ContasMoveisPainel() {
  const qc = useQueryClient();
  const { data: contas = [] } = useQuery(contasMoveisQuery);
  const [filtro, setFiltro] = useState<"todas" | "livres" | "uso">("todas");
  const [nova, setNova] = useState(false);
  const [editar, setEditar] = useState<Conta | null>(null);
  const livres = contas.filter((c) => !c.equipamento_id).length;
  const lista = contas.filter((c) => filtro === "todas" || (filtro === "livres" ? !c.equipamento_id : c.equipamento_id));
  async function liberar(c: Conta) {
    if (!confirm(`Liberar ${c.email} do aparelho?`)) return;
    const { error } = await supabase.from("contas_moveis").update({ equipamento_id: null, vinculado_em: null }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["contas_moveis"] });
    toast.success("Conta liberada");
  }
  return (
    <Cartao className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <span className="font-medium">Contas de e-mail · {livres} livres de {contas.length}</span>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className={`${selectCls} h-8 w-auto text-[12px]`}>
          <option value="todas">Todas</option><option value="livres">Livres</option><option value="uso">Em uso</option>
        </select>
        <Button size="sm" className="ml-auto" onClick={() => setNova(true)}>+ Nova conta</Button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead><tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-soft">
            {["E-mail", "Dados de acesso", "Situação", ""].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-line">
            {lista.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2.5 font-medium">{c.email}</td>
                <td className="px-4 py-2.5"><Dados c={c} /></td>
                <td className="px-4 py-2.5">
                  {c.equipamentos ? (
                    <Link to="/equipamentos/$id" params={{ id: c.equipamentos.id }} className="underline">
                      Em uso · {c.equipamentos.patrimonio} ({c.equipamentos.tipo})
                    </Link>
                  ) : <span className="text-primary">Livre</span>}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => setEditar(c)}>Editar</Button>
                  {c.equipamento_id && <Button size="sm" variant="ghost" onClick={() => liberar(c)}>Liberar</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <Vazio texto="Nenhuma conta cadastrada." />}
      </div>
      {nova && <ContaDialog aberto onClose={() => setNova(false)} />}
      {editar && <ContaDialog aberto conta={editar} onClose={() => setEditar(null)} />}
    </Cartao>
  );
}
