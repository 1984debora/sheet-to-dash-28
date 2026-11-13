import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Cartao, Pill } from "@/components/inventario";
import { Button } from "@/components/ui/button";
import { baixarTermo, type DadosTermo } from "@/lib/termo-responsabilidade";

export function TermosAssinatura({ equipId }: { equipId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["termos", equipId],
    queryFn: async () => {
      const r = await supabase.from("termos").select("*, equipamentos(*)").eq("equipamento_id", equipId).order("created_at", { ascending: false });
      if (r.error) throw new Error(r.error.message);
      return r.data;
    },
  });
  if (data.length === 0) return null;
  return (
    <Cartao className="mt-6 overflow-x-auto p-4">
      <h2 className="mb-2 text-[14px] font-bold">Termos de responsabilidade</h2>
      <table className="w-full text-[12.5px]">
        <tbody className="divide-y divide-line">
          {data.map((t) => {
            const d = t.dados as unknown as DadosTermo;
            const link = `${typeof window === "undefined" ? "" : window.location.origin}/assinar/${t.token}`;
            return (
              <tr key={t.id}>
                <td className="px-2 py-1.5">{d.usuario}</td>
                <td className="px-2 py-1.5 text-muted-ink">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-2 py-1.5"><Pill texto={t.status} /></td>
                <td className="px-2 py-1.5 text-muted-ink">{t.assinado_em ? `assinado em ${new Date(t.assinado_em).toLocaleString("pt-BR")}` : ""}</td>
                <td className="px-2 py-1.5 text-right">
                  {t.status === "Assinado" && t.assinatura && t.equipamentos
                    ? <Button size="sm" variant="outline" onClick={() => baixarTermo(t.equipamentos!, d, { png: t.assinatura!, em: t.assinado_em! }).catch(() => toast.error("Erro ao gerar PDF"))}>Baixar PDF assinado</Button>
                    : <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }}>Copiar link</Button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Cartao>
  );
}
