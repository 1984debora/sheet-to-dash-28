import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Finger / mouse signature canvas. Returns a PNG data URL on confirm. */
export function AssinaturaPad({ onConfirmar, rotulo = "Confirmar assinatura", busy }: { onConfirmar: (png: string) => void; rotulo?: string; busy?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [vazio, setVazio] = useState(true);
  useEffect(() => {
    const c = ref.current!; const r = c.getBoundingClientRect();
    c.width = r.width * 2; c.height = r.height * 2;
    const ctx = c.getContext("2d")!; ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
  }, []);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  return (
    <div className="space-y-2">
      <canvas ref={ref} className="h-40 w-full touch-none rounded-md border border-dashed border-line bg-card"
        onPointerDown={e => { desenhando.current = true; ref.current!.setPointerCapture(e.pointerId); const ctx = ref.current!.getContext("2d")!; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); }}
        onPointerMove={e => { if (!desenhando.current) return; const ctx = ref.current!.getContext("2d")!; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); setVazio(false); }}
        onPointerUp={() => { desenhando.current = false; }} />
      <p className="text-[11px] text-muted-ink">Assine com o dedo ou o mouse dentro do quadro.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setVazio(true); }}>Limpar</Button>
        <Button type="button" disabled={vazio || busy} onClick={() => onConfirmar(ref.current!.toDataURL("image/png"))}>{busy ? "Salvando…" : rotulo}</Button>
      </div>
    </div>
  );
}
