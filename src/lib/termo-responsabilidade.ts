import type { Tables } from "@/integrations/supabase/types";

export type DadosTermo = { empresa: string; usuario: string; documento: string; setor: string; data: string; acessorios: string; condicoes: string };
export async function baixarTermo(equip: Tables<"equipamentos">, dados: DadosTermo) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const mob = /celular|smartphone|tablet|iphone|ipad/i.test(equip.tipo);
  doc.setFontSize(16); doc.text(mob ? "TERMO DE RESPONSABILIDADE - DISPOSITIVO MÓVEL" : "TERMO DE RESPONSABILIDADE", 105, 20, { align: "center" });
  doc.setFontSize(11); doc.text(doc.splitTextToSize(dados.empresa, 175), 18, 30);
  const specs = mob
    ? [["IMEI / Nº de série", equip.numero_serie || "—"], ["Memória RAM", equip.ram_capacidade || "—"], ["Armazenamento", equip.armazenamento_capacidade || "—"]]
    : [["Número de série", equip.numero_serie || "—"], ["Processador", equip.processador || "—"],
      ["Memória", [equip.ram_capacidade, equip.ram_tipo].filter(Boolean).join(" ") || "—"],
      ["Armazenamento", [equip.armazenamento_capacidade, equip.armazenamento_tipo].filter(Boolean).join(" ") || "—"]];
  autoTable(doc, { startY: 40, theme: "grid", styles: { fontSize: 10 }, body: [
    ["Colaborador", dados.usuario], ["Documento / matrícula", dados.documento || "—"],
    ["Setor / loja", dados.setor || "—"], ["Data de entrega", dados.data.split("-").reverse().join("/")],
    ["Patrimônio", equip.patrimonio], ["Equipamento", [equip.tipo, equip.marca, equip.modelo].filter(Boolean).join(" · ")],
    ...specs,
    ["Acessórios", dados.acessorios || "—"], ["Condições de entrega", dados.condicoes || "—"],
  ] });
  const tableDoc = doc as typeof doc & { lastAutoTable?: { finalY: number } };
  let y = (tableDoc.lastAutoTable?.finalY ?? 150) + 12;
  const clauses = mob
    ? "Declaro que recebi o dispositivo móvel e os acessórios acima identificados. Comprometo-me a zelar pela conservação, utilizá-lo apenas para fins profissionais conforme as políticas da empresa, manter senha de bloqueio ativa e não remover aplicativos de segurança ou gerenciamento (MDM). Em caso de perda ou roubo, comunicarei imediatamente a TI para bloqueio do IMEI e da linha. Comprometo-me a devolver o aparelho e todos os acessórios quando solicitado ou ao encerrar o vínculo com a empresa."
    : "Declaro que recebi o equipamento e os acessórios acima identificados. Comprometo-me a zelar pela conservação, utilizar conforme as políticas da empresa, proteger os dados e comunicar à TI qualquer defeito, perda ou incidente de segurança. Comprometo-me também a devolver o equipamento quando solicitado ou ao encerrar o vínculo com a empresa.";
  const lines = doc.splitTextToSize(clauses, 174);
  if (y + lines.length * 5 + 45 > 275) { doc.addPage(); y = 20; }
  doc.text(lines, 18, y); y += lines.length * 5 + 22;
  doc.line(18, y, 96, y); doc.line(114, y, 192, y);
  doc.text("Assinatura do colaborador", 18, y + 7); doc.text("Responsável da TI", 114, y + 7);
  doc.save(`termo-${equip.patrimonio.replace(/[^a-z0-9-]/gi, "_")}.pdf`);
}
export type DadosTermoDevolucao = {
  empresa: string;
  usuario: string;
  documento: string;
  setor: string;
  data: string;
  motivo: string;
  estadoGeral: string;
  acessoriosDevolvidos: string;
  observacoes: string;
};

export async function baixarTermoDevolucao(equip: Tables<"equipamentos">, dados: DadosTermoDevolucao) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const mob = /celular|smartphone|tablet|iphone|ipad/i.test(equip.tipo);

  doc.setFontSize(16);
  doc.text(
    mob ? "TERMO DE DEVOLUÇÃO - DISPOSITIVO MÓVEL" : "TERMO DE DEVOLUÇÃO DE EQUIPAMENTO",
    105,
    20,
    { align: "center" }
  );

  doc.setFontSize(11);
  doc.text(doc.splitTextToSize(dados.empresa, 175), 18, 30);

  const specs = mob
    ? [
        ["IMEI / Nº de série", equip.numero_serie || "—"],
        ["Memória RAM", equip.ram_capacidade || "—"],
        ["Armazenamento", equip.armazenamento_capacidade || "—"],
      ]
    : [
        ["Número de série", equip.numero_serie || "—"],
        ["Processador", equip.processador || "—"],
        ["Memória", [equip.ram_capacidade, equip.ram_tipo].filter(Boolean).join(" ") || "—"],
        ["Armazenamento", [equip.armazenamento_capacidade, equip.armazenamento_tipo].filter(Boolean).join(" ") || "—"],
      ];

  autoTable(doc, {
    startY: 38,
    theme: "grid",
    styles: { fontSize: 9.5 },
    body: [
      ["Colaborador", dados.usuario],
      ["Documento / matrícula", dados.documento || "—"],
      ["Setor / loja", dados.setor || "—"],
      ["Data da devolução", dados.data.split("-").reverse().join("/")],
      ["Motivo da devolução", dados.motivo],
      ["Patrimônio", equip.patrimonio],
      ["Equipamento", [equip.tipo, equip.marca, equip.modelo].filter(Boolean).join(" · ")],
      ...specs,
      ["Acessórios devolvidos", dados.acessoriosDevolvidos || "Nenhum"],
      ["Estado do equipamento", dados.estadoGeral || "Em bom estado"],
      ["Observações / avarias", dados.observacoes || "Nenhuma avaria constatada"],
    ],
  });

  const tableDoc = doc as typeof doc & { lastAutoTable?: { finalY: number } };
  let y = (tableDoc.lastAutoTable?.finalY ?? 160) + 12;

  const declaracao =
    "Atestamos que o equipamento e os acessórios acima identificados foram devolvidos à equipe de TI na data informada, passando por conferência física e funcional. Com esta entrega e quitação das condições apuradas, encerram-se as responsabilidades de custódia do colaborador sobre o referido bem.";
  const lines = doc.splitTextToSize(declaracao, 174);
  if (y + lines.length * 5 + 45 > 275) {
    doc.addPage();
    y = 20;
  }
  doc.text(lines, 18, y);
  y += lines.length * 5 + 22;

  doc.line(18, y, 96, y);
  doc.line(114, y, 192, y);
  doc.text("Colaborador (devolução)", 18, y + 7);
  doc.text("Responsável TI (recebimento)", 114, y + 7);

  doc.save(`devolucao-${equip.patrimonio.replace(/[^a-z0-9-]/gi, "_")}.pdf`);
}
