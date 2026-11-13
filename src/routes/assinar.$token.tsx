import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AssinaturaPad } from "@/components/assinatura-pad";
import type { DadosTermo } from "@/lib/termo-responsabilidade";

export const Route = createFileRoute("/assinar/$token")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Assinar termo de responsabilidade | Óticas Gassi" },
    { name: "description", content: "Confirme o recebimento do equipamento da Óticas Gassi com sua assinatura." },
    { property: "og:title", content: "Assinar termo de responsabilidade | Óticas Gassi" },
    { property: "og:description", content: "Confirme o recebimento do equipamento com sua assinatura." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Assinar,
});

type Termo = { dados: DadosTermo; status: string; assinado_em: string | null; equip: { patrimonio: string; tipo: string; marca: string | null; modelo: string | null; numero_serie: string | null } };

function Assinar() {
  const { token } = Route.useParams();
  const q = useQuery({ queryKey: ["termo-publico", token], queryFn: async () => {
    const { data, error } = await supabase.rpc("termo_publico", { _token: token });
    if (error) throw new Error(error.message);
    return data as unknown as Termo | null;
  }, retry: false });
  const [busy, setBusy] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState("");

  async function assinar(png: string) {
    setBusy(true); setErro("");
    const { data, error } = await supabase.rpc("assinar_termo_publico", { _token: token, _assinatura: png });
    setBusy(false);
    if (error || !data) { setErro("Não foi possível registrar. O termo pode já ter sido assinado."); return; }
    setFeito(true);
  }

  const t = q.data;
  return (
    <div className="min-h-screen bg-paper px-4 py-8 font-sans text-ink">
      <div className="mx-auto max-w-lg rounded-xl bg-card p-5 ring-1 ring-line">
        <div className="mb-4 text-center leading-none">
          <div className="font-logo text-[26px] font-bold tracking-[0.12em]">GASSI</div>
          <div className="font-logo text-[7px] tracking-[0.2em] text-muted-ink">O SHOPPING DOS ÓCULOS</div>
        </div>
        {q.isLoading && <p className="text-sm text-muted-ink">Carregando…</p>}
        {!q.isLoading && !t && <p className="text-sm">Link inválido ou expirado.</p>}
        {t && (feito || t.status === "Assinado") && <p className="text-center text-[15px] font-semibold">Termo assinado com sucesso. Obrigado, {t.dados.usuario}!</p>}
        {t && !feito && t.status !== "Assinado" && <>
          <h1 className="text-[16px] font-bold">Termo de responsabilidade</h1>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
            <dt className="text-muted-ink">Colaborador</dt><dd>{t.dados.usuario}</dd>
            <dt className="text-muted-ink">Patrimônio</dt><dd>{t.equip.patrimonio}</dd>
            <dt className="text-muted-ink">Equipamento</dt><dd>{[t.equip.tipo, t.equip.marca, t.equip.modelo].filter(Boolean).join(" · ")}</dd>
            <dt className="text-muted-ink">Nº de série</dt><dd>{t.equip.numero_serie || "—"}</dd>
            <dt className="text-muted-ink">Acessórios</dt><dd>{t.dados.acessorios || "—"}</dd>
            <dt className="text-muted-ink">Entrega</dt><dd>{t.dados.data.split("-").reverse().join("/")}</dd>
          </dl>
          <p className="mt-4 text-[12.5px] leading-relaxed text-muted-ink">Declaro que recebi o equipamento e os acessórios acima identificados. Comprometo-me a zelar pela conservação, utilizar conforme as políticas da empresa, proteger os dados e comunicar à TI qualquer defeito, perda ou incidente de segurança, e a devolvê-lo quando solicitado ou ao encerrar o vínculo com a empresa.</p>
          <div className="mt-4"><AssinaturaPad busy={busy} onConfirmar={assinar} rotulo="Confirmar recebimento" /></div>
          {erro && <p className="mt-2 text-[12px] text-crit">{erro}</p>}
        </>}
      </div>
    </div>
  );
}
