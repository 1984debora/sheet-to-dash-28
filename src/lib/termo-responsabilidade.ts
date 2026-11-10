import type { Tables } from "@/integrations/supabase/types";

export type DadosTermo = { empresa: string; usuario: string; documento: string; setor: string; data: string; acessorios: string; condicoes: string };
export async function baixarTermo(equip: Tables<"equipamentos">, dados: DadosTermo) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(16); doc.text("TERMO DE RESPONSABILIDADE", 105, 20, { align: "center" });
  doc.setFontSize(11); doc.text(doc.splitTextToSize(dados.empresa, 175), 18, 30);
  autoTable(doc, { startY: 40, theme: "grid", styles: { fontSize: 10 }, body: [
    ["Colaborador", dados.usuario], ["Documento / matrícula", dados.documento || "—"],
    ["Setor / loja", dados.setor || "—"], ["Data de entrega", dados.data.split("-").reverse().join("/")],
    ["Patrimônio", equip.patrimonio], ["Equipamento", [equip.tipo, equip.marca, equip.modelo].filter(Boolean).join(" · ")],
    ["Número de série", equip.numero_serie || "—"], ["Processador", equip.processador || "—"],
    ["Memória", [equip.ram_capacidade, equip.ram_tipo].filter(Boolean).join(" ") || "—"],
    ["Armazenamento", [equip.armazenamento_capacidade, equip.armazenamento_tipo].filter(Boolean).join(" ") || "—"],
    ["Acessórios", dados.acessorios || "—"], ["Condições de entrega", dados.condicoes || "—"],
  ] });
  const tableDoc = doc as typeof doc & { lastAutoTable?: { finalY: number } };
  let y = (tableDoc.lastAutoTable?.finalY ?? 150) + 12;
  const clauses = "Declaro que recebi o equipamento e os acessórios acima identificados. Comprometo-me a zelar pela conservação, utilizar conforme as políticas da empresa, proteger os dados e comunicar à TI qualquer defeito, perda ou incidente de segurança. Comprometo-me também a devolver o equipamento quando solicitado ou ao encerrar o vínculo com a empresa.";
  const lines = doc.splitTextToSize(clauses, 174);
  if (y + lines.length * 5 + 45 > 275) { doc.addPage(); y = 20; }
  doc.text(lines, 18, y); y += lines.length * 5 + 22;
  doc.line(18, y, 96, y); doc.line(114, y, 192, y);
  doc.text("Assinatura do colaborador", 18, y + 7); doc.text("Responsável da TI", 114, y + 7);
  doc.save(`termo-${equip.patrimonio.replace(/[^a-z0-9-]/gi, "_")}.pdf`);
}