import type { ReactNode } from "react";

export function Titulo({ titulo, sub, acao }: { titulo: string; sub?: string; acao?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-tight">{titulo}</h1>
        {sub && <p className="mt-1 font-mono text-[11px] text-muted-ink">{sub}</p>}
      </div>
      {acao}
    </div>
  );
}

const COR: Record<string, string> = {
  "Em uso": "bg-ok",
  "Em estoque": "bg-brand",
  "Em manutenção": "bg-warn",
  Descartado: "bg-crit",
  Aberta: "bg-crit",
  "Em andamento": "bg-warn",
  Concluída: "bg-ok",
};

export function Pill({ texto }: { texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold">
      <span className={`size-1.5 rounded-full ${COR[texto] ?? "bg-soft"}`} />
      {texto}
    </span>
  );
}

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-muted-ink">{label}</span>
      {children}
    </label>
  );
}

export const selectCls =
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs";

export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-paper ring-1 ring-line ${className}`}>{children}</div>;
}

export function Vazio({ texto }: { texto: string }) {
  return <div className="px-4 py-8 text-center font-mono text-[11px] text-muted-ink">{texto}</div>;
}
