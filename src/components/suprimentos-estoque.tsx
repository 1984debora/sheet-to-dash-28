import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { suprimentosQuery, suprimentoMovimentosQuery } from "@/lib/inventario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Minus, Package, AlertTriangle, Layers, Pencil, Trash2 } from "lucide-react";

const CATEGORIAS = [
  "Rede",
  "Cabos e Adaptadores",
  "Periféricos",
  "Hardware e Peças",
  "Ferramentas e Insumos",
  "Outros",
];

const CONDICOES = ["Novo", "Usado", "Recondicionado"];

export function SuprimentosEstoque() {
  const queryClient = useQueryClient();
  const { data: suprimentos = [], isLoading } = useQuery(suprimentosQuery);
  const { data: movimentos = [] } = useQuery(suprimentoMovimentosQuery);

  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [apenasAlerta, setApenasAlerta] = useState(false);

  // Modal Novo Suprimento
  const [novoAberto, setNovoAberto] = useState(false);
  const [novo, setNovo] = useState({
    nome: "",
    categoria: "Hardware e Peças",
    condicao: "Novo",
    especificacao: "",
    quantidade: 1,
    minimo: 0,
  });
  const [criandoBusy, setCriandoBusy] = useState(false);

  // Modal Entrada / Saída rápida
  const [movAberto, setMovAberto] = useState<{
    aberto: boolean;
    tipo: "Entrada" | "Saída";
    suprimento: any | null;
  }>({ aberto: false, tipo: "Entrada", suprimento: null });
  const [movQtd, setMovQtd] = useState(1);
  const [movDestino, setMovDestino] = useState("");
  const [movBusy, setMovBusy] = useState(false);

  // Modal Edição
  const [editando, setEditando] = useState<any | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEspec, setEditEspec] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editCondicao, setEditCondicao] = useState("");
  const [editQtd, setEditQtd] = useState(0);
  const [editMinimo, setEditMinimo] = useState(0);
  const [editBusy, setEditBusy] = useState(false);

  const itensFiltrados = suprimentos.filter((item: any) => {
    const matchBusca =
      !busca.trim() ||
      item.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      item.especificacao?.toLowerCase().includes(busca.toLowerCase());
    const matchCat =
      categoriaFiltro === "todas" || item.categoria === categoriaFiltro;
    const matchAlerta = !apenasAlerta || item.quantidade <= item.minimo;
    return matchBusca && matchCat && matchAlerta;
  });

  const totalUnidades = suprimentos.reduce(
    (acc: number, item: any) => acc + (Number(item.quantidade) || 0),
    0
  );
  const emAlerta = suprimentos.filter(
    (item: any) => item.minimo > 0 && item.quantidade <= item.minimo
  ).length;

  async function criarSuprimento(e: React.FormEvent) {
    e.preventDefault();
    if (!novo.nome.trim()) {
      toast.error("Informe o nome do suprimento");
      return;
    }
    setCriandoBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Cria com quantidade 0 se houver movimentação inicial (o trigger cuidará de somar)
      const qtdInicial = Math.max(0, Number(novo.quantidade) || 0);

      const { data, error } = await supabase
        .from("suprimentos")
        .insert({
          nome: novo.nome.trim(),
          categoria: novo.categoria,
          condicao: novo.condicao,
          especificacao: novo.especificacao.trim() || null,
          quantidade: 0,
          minimo: Math.max(0, Number(novo.minimo) || 0),
        })
        .select()
        .single();

      if (error) throw error;

      // O trigger do banco adicionará a quantidade inicial ao saldo
      if (qtdInicial > 0 && data) {
        await supabase.from("suprimento_movimentos").insert({
          suprimento_id: data.id,
          tipo: "Entrada",
          quantidade: qtdInicial,
          destino: "Estoque Inicial",
          registrado_por: session?.user?.id ?? null,
        });
      }

      toast.success("Suprimento cadastrado com sucesso!");
      setNovo({
        nome: "",
        categoria: "Hardware e Peças",
        condicao: "Novo",
        especificacao: "",
        quantidade: 1,
        minimo: 0,
      });
      setNovoAberto(false);
      queryClient.invalidateQueries({ queryKey: ["suprimentos"] });
      queryClient.invalidateQueries({ queryKey: ["suprimento_movimentos"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cadastrar suprimento");
    } finally {
      setCriandoBusy(false);
    }
  }

  function abrirEdicao(item: any) {
    setEditando(item);
    setEditNome(item.nome || "");
    setEditEspec(item.especificacao || "");
    setEditCategoria(item.categoria || "Hardware e Peças");
    setEditCondicao(item.condicao || "Novo");
    setEditQtd(Number(item.quantidade) || 0);
    setEditMinimo(Number(item.minimo) || 0);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!editando || !editNome.trim()) return;
    setEditBusy(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const novaQtd = Math.max(0, Number(editQtd) || 0);
      const qtdAtual = Number(editando.quantidade) || 0;
      const diferenca = novaQtd - qtdAtual;

      // 1. Atualiza dados cadastrais
      const { error: updateError } = await supabase
        .from("suprimentos")
        .update({
          nome: editNome.trim(),
          especificacao: editEspec.trim() || null,
          categoria: editCategoria,
          condicao: editCondicao,
          minimo: Math.max(0, Number(editMinimo) || 0),
        })
        .eq("id", editando.id);

      if (updateError) throw updateError;

      // 2. Se a quantidade mudou, registra a movimentação e o trigger ajusta o saldo
      if (diferenca !== 0) {
        const tipoMov = diferenca > 0 ? "Entrada" : "Saída";
        const qtdMov = Math.abs(diferenca);

        await supabase.from("suprimento_movimentos").insert({
          suprimento_id: editando.id,
          tipo: tipoMov,
          quantidade: qtdMov,
          destino: `Ajuste manual de saldo (${qtdAtual} → ${novaQtd})`,
          registrado_por: session?.user?.id ?? null,
        });
      }

      toast.success("Suprimento atualizado com sucesso!");
      setEditando(null);
      queryClient.invalidateQueries({ queryKey: ["suprimentos"] });
      queryClient.invalidateQueries({ queryKey: ["suprimento_movimentos"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar suprimento");
    } finally {
      setEditBusy(false);
    }
  }

  async function excluirSuprimento(item: any) {
    if (!confirm(`Tem certeza que deseja excluir o item "${item.nome}"?`)) return;

    try {
      await supabase.from("suprimento_movimentos").delete().eq("suprimento_id", item.id);
      const { error } = await supabase.from("suprimentos").delete().eq("id", item.id);
      if (error) throw error;

      toast.success("Suprimento excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["suprimentos"] });
      queryClient.invalidateQueries({ queryKey: ["suprimento_movimentos"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir suprimento");
    }
  }

  async function salvarMovimento(e: React.FormEvent) {
    e.preventDefault();
    const s = movAberto.suprimento;
    if (!s) return;

    const qtd = Number(movQtd);
    if (qtd <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }

    if (movAberto.tipo === "Saída" && qtd > s.quantidade) {
      toast.error(`Saldo insuficiente! Disponível: ${s.quantidade} unidades`);
      return;
    }

    setMovBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Apenas inserimos o movimento: o gatilho trg_movimento_suprimento atualiza o saldo sozinho!
      const { error: movError } = await supabase
        .from("suprimento_movimentos")
        .insert({
          suprimento_id: s.id,
          tipo: movAberto.tipo,
          quantidade: qtd,
          destino:
            movDestino.trim() ||
            (movAberto.tipo === "Entrada" ? "Reposição de estoque" : "Consumo / Aplicação"),
          registrado_por: session?.user?.id ?? null,
        });

      if (movError) throw movError;

      toast.success(
        movAberto.tipo === "Entrada"
          ? `+${qtd} un adicionada(s) com sucesso!`
          : `-${qtd} un retirada(s) com sucesso!`
      );
      setMovAberto({ aberto: false, tipo: "Entrada", suprimento: null });
      setMovQtd(1);
      setMovDestino("");
      queryClient.invalidateQueries({ queryKey: ["suprimentos"] });
      queryClient.invalidateQueries({ queryKey: ["suprimento_movimentos"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar movimento");
    } finally {
      setMovBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Topo com Título e Botão */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Estoque de Suprimentos e Peças</h2>
          <p className="text-xs text-muted-foreground">
            Controle de conectores RJ45, cabos, memórias, periféricos e peças de reposição
          </p>
        </div>
        <Button onClick={() => setNovoAberto(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo suprimento
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Itens Cadastrados</p>
              <p className="text-2xl font-bold">{suprimentos.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total de Unidades</p>
              <p className="text-2xl font-bold">{totalUnidades}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                emAlerta > 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-500/10 text-emerald-500"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Itens em Alerta (Estoque Baixo)</p>
              <p className="text-2xl font-bold">{emAlerta}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por nome ou especificação..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="sm:max-w-xs text-xs"
        />

        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="sm:w-[220px] text-xs">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {CATEGORIAS.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={apenasAlerta ? "destructive" : "outline"}
          size="sm"
          onClick={() => setApenasAlerta(!apenasAlerta)}
          className="text-xs"
        >
          Filtrar estoque baixo
        </Button>
      </div>

      {/* Tabela de Suprimentos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Saldo de Suprimentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Carregando suprimentos...
            </div>
          ) : itensFiltrados.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhum suprimento encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                  <tr>
                    <th className="p-3">ITEM</th>
                    <th className="p-3">CATEGORIA</th>
                    <th className="p-3">CONDIÇÃO</th>
                    <th className="p-3 text-center">SALDO ATUAL</th>
                    <th className="p-3 text-center">MÍNIMO</th>
                    <th className="p-3 text-center">STATUS</th>
                    <th className="p-3 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itensFiltrados.map((item: any) => {
                    const emEstoqueBaixo = item.minimo > 0 && item.quantidade <= item.minimo;
                    return (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="p-3">
                          <p className="font-semibold text-foreground">{item.nome}</p>
                          {item.especificacao && (
                            <p className="text-[11px] text-muted-foreground">
                              {item.especificacao}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">{item.categoria}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {item.condicao}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-bold text-sm">
                          {item.quantidade}
                        </td>
                        <td className="p-3 text-center text-muted-foreground">
                          {item.minimo}
                        </td>
                        <td className="p-3 text-center">
                          {emEstoqueBaixo ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Estoque Baixo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-emerald-600 border-emerald-500/30"
                            >
                              Normal
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] text-emerald-600 hover:text-emerald-700"
                            onClick={() =>
                              setMovAberto({ aberto: true, tipo: "Entrada", suprimento: item })
                            }
                          >
                            <Plus className="h-3 w-3 mr-1" /> Entrada
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                            onClick={() =>
                              setMovAberto({ aberto: true, tipo: "Saída", suprimento: item })
                            }
                          >
                            <Minus className="h-3 w-3 mr-1" /> Saída
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => abrirEdicao(item)}
                          >
                            <Pencil className="h-3 w-3 mr-1" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                            onClick={() => excluirSuprimento(item)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Movimentações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Histórico de Movimentações de Peças
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movimentos.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhuma movimentação registrada até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium sticky top-0">
                  <tr>
                    <th className="p-3">DATA</th>
                    <th className="p-3">TIPO</th>
                    <th className="p-3">SUPRIMENTO</th>
                    <th className="p-3">QUANTIDADE</th>
                    <th className="p-3">DESTINO / MOTIVO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movimentos.map((m: any) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={m.tipo === "Entrada" ? "default" : "secondary"}
                          className={`text-[10px] ${
                            m.tipo === "Entrada"
                              ? "bg-emerald-600 text-white"
                              : "bg-destructive text-destructive-foreground"
                          }`}
                        >
                          {m.tipo}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">
                        {m.suprimentos?.nome || "Item removido"}
                      </td>
                      <td className="p-3 font-semibold">{m.quantidade} un</td>
                      <td className="p-3 text-muted-foreground">{m.destino || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Novo Suprimento */}
      <Dialog open={novoAberto} onOpenChange={setNovoAberto}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Novo Suprimento</DialogTitle>
          </DialogHeader>

          <form onSubmit={criarSuprimento} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Nome do item *</Label>
              <Input
                placeholder="Ex: Conector RJ45 Cat 6, Cabo HDMI 2m..."
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                className="text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select
                  value={novo.categoria}
                  onValueChange={(val) => setNovo({ ...novo, categoria: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Condição</Label>
                <Select
                  value={novo.condicao}
                  onValueChange={(val) => setNovo({ ...novo, condicao: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDICOES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Especificações / Detalhes</Label>
              <Input
                placeholder="Ex: Marca, modelo, velocidade, comprimento..."
                value={novo.especificacao}
                onChange={(e) => setNovo({ ...novo, especificacao: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantidade Inicial</Label>
                <Input
                  type="number"
                  min="0"
                  value={novo.quantidade}
                  onChange={(e) =>
                    setNovo({ ...novo, quantidade: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Estoque Mínimo (Alerta)</Label>
                <Input
                  type="number"
                  min="0"
                  value={novo.minimo}
                  onChange={(e) =>
                    setNovo({ ...novo, minimo: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNovoAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={criandoBusy}>
                {criandoBusy ? "Salvando..." : "Salvar suprimento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Suprimento */}
      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Editar Suprimento</DialogTitle>
          </DialogHeader>

          <form onSubmit={salvarEdicao} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Nome do item *</Label>
              <Input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={editCategoria} onValueChange={setEditCategoria}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Condição</Label>
                <Select value={editCondicao} onValueChange={setEditCondicao}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDICOES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Especificações / Detalhes</Label>
              <Input
                value={editEspec}
                onChange={(e) => setEditEspec(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-primary">
                  Saldo atual em estoque
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={editQtd}
                  onChange={(e) => setEditQtd(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-xs font-bold"
                />
              </div>

              <div>
                <Label className="text-xs">Estoque Mínimo (Alerta)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editMinimo}
                  onChange={(e) =>
                    setEditMinimo(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditando(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={editBusy}>
                {editBusy ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar Entrada / Saída */}
      <Dialog
        open={movAberto.aberto}
        onOpenChange={(open) =>
          !open && setMovAberto({ aberto: false, tipo: "Entrada", suprimento: null })
        }
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {movAberto.tipo === "Entrada" ? "Registrar Entrada" : "Registrar Saída"}
            </DialogTitle>
          </DialogHeader>

          {movAberto.suprimento && (
            <form onSubmit={salvarMovimento} className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                <p className="font-semibold text-xs text-foreground">
                  {movAberto.suprimento.nome}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Saldo atual disponível:{" "}
                  <strong className="text-foreground">
                    {movAberto.suprimento.quantidade} unidades
                  </strong>
                </p>
              </div>

              <div>
                <Label className="text-xs">Quantidade *</Label>
                <Input
                  type="number"
                  min="1"
                  max={movAberto.tipo === "Saída" ? movAberto.suprimento.quantidade : undefined}
                  value={movQtd}
                  onChange={(e) =>
                    setMovQtd(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs">
                  {movAberto.tipo === "Entrada"
                    ? "Motivo / Fornecedor"
                    : "Destino / Setor / Chamado"}
                </Label>
                <Input
                  placeholder={
                    movAberto.tipo === "Entrada"
                      ? "Ex: Reposição, compra nota 123..."
                      : "Ex: Instalado na Loja 05, manutenção notebook..."
                  }
                  value={movDestino}
                  onChange={(e) => setMovDestino(e.target.value)}
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMovAberto({ aberto: false, tipo: "Entrada", suprimento: null })
                  }
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={movBusy}
                  className={
                    movAberto.tipo === "Entrada"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : ""
                  }
                  variant={movAberto.tipo === "Saída" ? "destructive" : "default"}
                >
                  {movBusy
                    ? "Salvando..."
                    : movAberto.tipo === "Entrada"
                    ? "Confirmar entrada"
                    : "Confirmar saída"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
