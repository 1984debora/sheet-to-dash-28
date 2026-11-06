type Equip = {
  patrimonio: string; tipo: string; marca: string | null; modelo: string | null;
  usuario_responsavel: string | null; status: string; conexao: string | null; endereco_ip: string | null;
};
type Usuario = { nome: string; email: string | null; celular: string | null };
type App = { nome: string; versao: string | null; fornecedor: string | null; ultima_atualizacao: string | null };

const tem = (t: string, ks: string[]) => ks.some((k) => t.toLowerCase().includes(k));
const mm = (e: Equip) => [e.marca, e.modelo].filter(Boolean).join(" ") || "—";
const d = (s: string | null) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString("pt-BR") : "—");

export async function gerarRelatorioSetor(setor: string, equips: Equip[], usuarios: Usuario[], apps: App[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Relatório do setor: ${setor}`, 14, 18);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 24);
  let y = 30;
  const secao = (titulo: string, head: string[], body: string[][]) => {
    doc.setFontSize(12);
    doc.text(`${titulo} (${body.length})`, 14, y + 4);
    autoTable(doc, {
      startY: y + 7,
      head: [head],
      body: body.length ? body : [[{ content: "Nenhum registro", colSpan: head.length } as unknown as string]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 40, 40] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  };
  secao("Equipamentos", ["Patrimônio", "Tipo", "Marca/Modelo", "Responsável", "Status"],
    equips.map((e) => [e.patrimonio, e.tipo, mm(e), e.usuario_responsavel ?? "—", e.status]));
  secao("Usuários", ["Nome", "E-mail", "Celular"], usuarios.map((u) => [u.nome, u.email ?? "—", u.celular ?? "—"]));
  secao("Impressoras", ["Patrimônio", "Marca/Modelo", "Conexão", "IP"],
    equips.filter((e) => tem(e.tipo, ["impressora", "multifuncional"])).map((e) => [e.patrimonio, mm(e), e.conexao ?? "—", e.endereco_ip ?? "—"]));
  secao("Celulares", ["Patrimônio", "Marca/Modelo", "Responsável"],
    equips.filter((e) => tem(e.tipo, ["celular", "smartphone"])).map((e) => [e.patrimonio, mm(e), e.usuario_responsavel ?? "—"]));
  secao("Aplicativos", ["Aplicativo", "Versão", "Fornecedor", "Última atualização"],
    apps.map((a) => [a.nome, a.versao ?? "—", a.fornecedor ?? "—", d(a.ultima_atualizacao)]));
  const nome = `relatorio-${setor.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  doc.save(nome);
}
