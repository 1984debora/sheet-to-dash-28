import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const analisarRiscosSetor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { setorId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.setorId)) throw new Error("Setor inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const [s, apps, locs] = await Promise.all([
      sb.from("setores").select("nome, usa_scanner, observacoes").eq("id", data.setorId).single(),
      sb.from("setor_aplicativos").select("nome, versao, fornecedor, ultima_atualizacao").eq("setor_id", data.setorId),
      sb.from("localizacoes").select("id").eq("setor_id", data.setorId),
    ]);
    if (s.error) throw new Error(s.error.message);
    const ids = (locs.data ?? []).map((l) => l.id);
    const eq = ids.length
      ? await sb
          .from("equipamentos")
          .select("patrimonio, tipo, marca, modelo, status, data_compra, garantia_ate, processador, ram_capacidade, armazenamento_tipo, armazenamento_capacidade, sistema_operacional, conexao, endereco_ip")
          .in("localizacao_id", ids)
      : { data: [] };
    const manut = await sb.from("manutencoes").select("data, tipo, descricao, status, equipamentos!inner(patrimonio, localizacao_id)").in("equipamentos.localizacao_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).limit(50);

    const contexto = {
      hoje: new Date().toISOString().slice(0, 10),
      setor: s.data,
      equipamentos: eq.data ?? [],
      aplicativos: apps.data ?? [],
      manutencoes_recentes: manut.data ?? [],
    };

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Chave de IA não configurada");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "Você é um analista de infraestrutura e segurança de TI. Com base no inventário do setor, identifique riscos (garantias vencidas, hardware defasado, sistemas operacionais sem suporte, aplicativos desatualizados há mais de 90 dias, impressoras em rede sem controle, falhas recorrentes etc.) e gere recomendações priorizadas de manutenção e segurança. Responda em português do Brasil, texto simples sem markdown pesado, neste formato:\n\nRESUMO: (2-3 frases)\n\nPRIORIDADE ALTA\n- risco — recomendação (cite patrimônios/apps)\n\nPRIORIDADE MÉDIA\n- ...\n\nPRIORIDADE BAIXA\n- ...\n\nSe faltarem dados, diga quais informações cadastrar para melhorar a análise.",
        input: [{ role: "user", content: JSON.stringify(contexto) }],
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      console.error("AI gateway", res.status, t);
      if (res.status === 429) throw new Error("Muitas solicitações à IA. Tente novamente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
      throw new Error(`Falha na análise de IA (${res.status}).`);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let texto = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const linha = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!linha.startsWith("data:")) continue;
        const payload = linha.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") texto += ev.delta ?? "";
          if (ev.type === "response.failed" || ev.type === "error") throw new Error("A IA não conseguiu concluir a análise.");
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("A IA")) throw e;
        }
      }
    }
    if (!texto.trim()) throw new Error("A IA não retornou recomendações.");
    return { texto };
  });
