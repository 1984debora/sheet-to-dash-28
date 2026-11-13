import type { Tables } from "@/integrations/supabase/types";

/** Patrimony label sized for the Brother PT-P700 tape: 40 mm wide × 17 mm tall. */
export async function baixarEtiqueta(equip: Pick<Tables<"equipamentos">, "id" | "patrimonio">) {
  const [{ jsPDF }, QR] = await Promise.all([import("jspdf"), import("qrcode")]);
  const url = `${window.location.origin}/equipamentos/${equip.id}`;
  const qr = await QR.toDataURL(url, { margin: 0, errorCorrectionLevel: "M", width: 400 });
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [40, 17] });
  doc.addImage(qr, "PNG", 1.5, 1.5, 14, 14);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("ÓTICAS GASSI", 17.5, 5.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5);
  doc.text("PATRIMÔNIO TI", 17.5, 8);
  doc.setFont("helvetica", "bold");
  let size = 11;
  doc.setFontSize(size);
  while (doc.getTextWidth(equip.patrimonio) > 21.5 && size > 6) doc.setFontSize(--size);
  doc.text(equip.patrimonio, 17.5, 13.5);
  doc.save(`etiqueta-${equip.patrimonio.replace(/[^a-z0-9-]/gi, "_")}.pdf`);
}
