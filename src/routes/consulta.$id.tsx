import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  QrCode, 
  MapPin, 
  User, 
  HardDrive, 
  Clock, 
  ShieldCheck, 
  LogIn, 
  ArrowLeft,
  AlertCircle
} from "lucide-react";

export const Route = createFileRoute("/consulta/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Consulta de Patrimônio | Óticas Gassi" },
      { name: "description", content: "Ficha pública de patrimônio e histórico do equipamento." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsultaPublica,
});

type EquipamentoPublico = {
  id: string;
  patrimonio: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  status: string;
  setor_nome: string | null;
  setor_categoria: string | null;
  localizacao_nome: string | null;
  usuario_responsavel: string | null;
  historico: Array<{
    tipo: string;
    descricao: string;
    data: string;
    usuario?: string | null;
  }>;
};

function ConsultaPublica() {
  const { id } = Route.useParams();

  const { data: equip, isLoading, isError } = useQuery({
    queryKey: ["consulta-equipamento", id],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("equipamento_publico", { _id: id });
      if (error) throw new Error(error.message);
      return data as unknown as EquipamentoPublico | null;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Consultando patrimônio...</p>
        </div>
      </div>
    );
  }

  if (isError || !equip) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-lg font-bold">Equipamento não localizado</h1>
            <p className="text-sm text-muted-foreground">
              Não encontramos nenhum equipamento ativo com este identificador.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">
                <LogIn className="w-4 h-4 mr-2" />
                Acessar o sistema
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      {/* Topo Óticas Gassi */}
      <header className="bg-background border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-brand uppercase">Óticas Gassi</p>
              <h1 className="text-sm font-bold text-foreground">Patrimônio de TI</h1>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {equip.patrimonio}
          </Badge>
        </div>
      </header>

      {/* Conteúdo do Equipamento */}
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* Cartão Principal */}
        <Card className="border-t-4 border-t-brand shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Equipamento</p>
                <CardTitle className="text-xl font-bold">{equip.tipo}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[equip.marca, equip.modelo].filter(Boolean).join(" - ") || "Modelo não informado"}
                </p>
              </div>
              <Badge 
                className={
                  equip.status === "Em uso" ? "bg-emerald-600 text-white" :
                  equip.status === "Estoque" ? "bg-blue-600 text-white" :
                  "bg-amber-600 text-white"
                }
              >
                {equip.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            {equip.numero_serie && (
              <div className="p-2.5 rounded-md bg-muted/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Número de Série</span>
                <span className="font-mono font-medium">{equip.numero_serie}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Localização / Setor */}
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <MapPin className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Setor / Loja</p>
                  <p className="text-sm font-semibold truncate">{equip.setor_nome || "Não definido"}</p>
                  {equip.localizacao_nome && (
                    <p className="text-xs text-muted-foreground truncate">{equip.localizacao_nome}</p>
                  )}
                </div>
              </div>

              {/* Responsável */}
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <User className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Responsável Atual</p>
                  <p className="text-sm font-semibold truncate">{equip.usuario_responsavel || "Setor / Sem titular"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linha do Tempo / Histórico */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand" />
              Histórico Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equip.historico && equip.historico.length > 0 ? (
              <div className="space-y-3">
                {equip.historico.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs border-l-2 border-brand/30 pl-3 py-1">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{item.descricao}</p>
                      {item.usuario && (
                        <p className="text-muted-foreground">Responsável: {item.usuario}</p>
                      )}
                    </div>
                    <span className="text-muted-foreground font-mono shrink-0">
                      {new Date(item.data).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">
                Nenhuma movimentação anterior registrada.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Rodapé com acesso para a equipe de TI */}
        <div className="pt-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">É da equipe de TI ou precisa alterar esse registro?</p>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/equipamentos/$id" params={{ id: equip.id }}>
              <LogIn className="w-4 h-4 mr-2" />
              Abrir ficha no painel completo
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
