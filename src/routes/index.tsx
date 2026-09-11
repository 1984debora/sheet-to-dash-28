import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import chamados from "@/data/chamados.json";

type Chamado = {
  chamado: number;
  abertura: string;
  tipo: string;
  solicitante: string;
  responsavel: string;
  andamento: string;
  atualizacao: string;
};

const dados = chamados as Chamado[];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Chamados de TI | Relatório de Suporte" },
      {
        name: "description",
        content:
          "Painel operacional dos chamados de TI: status, tipos, responsáveis, áreas solicitantes e evolução por data.",
      },
      { property: "og:title", content: "Painel de Chamados de TI" },
      {
        property: "og:description",
        content:
          "Acompanhe 169 chamados de suporte por status, tipo, responsável e área solicitante.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const STATUS_COR: Record<string, string> = {
  Finalizado: "bg-ok",
  "Em Andamento": "bg-warn",
  Enviado: "bg-brand",
  "Fila de Espera": "bg-soft",
  "Em Analise": "bg-warn",
  Negado: "bg-crit",
};

function contar(campo: keyof Chamado, lista: Chamado[]) {
  const m = new Map<string, number>();
  for (const c of lista) {
    const k = String(c[campo]);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function parseData(s: string) {
  const [d = 1, m = 1, y = 1970] = s.split("/").map(Number);
  return new Date(y, m - 1, d);
}

function Barras({
  itens,
  cor,
  max: limite = 6,
}: {
  itens: [string, number][];
  cor: string;
  max?: number;
}) {
  const topo = itens.slice(0, limite);
  const maior = topo[0]?.[1] ?? 1;
  return (
    <ul className="mt-4 space-y-3">
      {topo.map(([nome, valor]) => (
        <li key={nome} className="text-[12px] font-medium">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">{nome}</span>
            <span className="font-mono text-muted-ink">{valor}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div
              className={`bar-grow h-full rounded-full ${cor}`}
              style={{ width: `${(valor / maior) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Dashboard() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [resp, setResp] = useState("todos");

  const porStatus = useMemo(() => contar("andamento", dados), []);
  const porTipo = useMemo(() => contar("tipo", dados), []);
  const porResp = useMemo(() => contar("responsavel", dados), []);
  const porArea = useMemo(() => contar("solicitante", dados), []);

  const total = dados.length;
  const finalizados = dados.filter((c) => c.andamento === "Finalizado").length;
  const andamento = dados.filter((c) =>
    ["Em Andamento", "Em Analise", "Enviado"].includes(c.andamento),
  ).length;
  const espera = dados.filter((c) => c.andamento === "Fila de Espera").length;

  const rosca = useMemo(() => {
    let acc = 0;
    const cores: Record<string, string> = {
      Finalizado: "var(--ok)",
      "Em Andamento": "var(--warn)",
      Enviado: "var(--brand)",
      "Fila de Espera": "var(--soft)",
      "Em Analise": "var(--warn)",
      Negado: "var(--crit)",
    };
    const partes = porStatus.map(([nome, valor]) => {
      const ini = (acc / total) * 100;
      acc += valor;
      return `${cores[nome] ?? "var(--soft)"} ${ini}% ${(acc / total) * 100}%`;
    });
    return `conic-gradient(${partes.join(",")})`;
  }, [porStatus, total]);

  const evolucao = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of dados) {
      const d = parseData(c.abertura);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    const ordenado = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return ordenado.slice(-14);
  }, []);
  const maiorDia = Math.max(...evolucao.map((e) => e[1]), 1);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return dados.filter(
      (c) =>
        (status === "todos" || c.andamento === status) &&
        (resp === "todos" || c.responsavel === resp) &&
        (q === "" ||
          String(c.chamado).includes(q) ||
          c.solicitante.toLowerCase().includes(q) ||
          c.tipo.toLowerCase().includes(q)),
    );
  }, [busca, status, resp]);

  return (
    <div className="min-h-screen bg-paper font-sans text-ink antialiased">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded-md bg-ink">
              <span className="font-mono text-[11px] font-bold text-paper">TI</span>
            </div>
            <div className="leading-none">
              <div className="text-[13px] font-bold tracking-tight">RELATÓRIO DE CHAMADOS</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-ink">
                suporte · ti
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden font-mono text-[10px] text-muted-ink sm:block">
              fonte: planilha de chamados
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-5 px-5 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-balance">
              Chamados de TI
            </h1>
            <p className="mt-1 font-mono text-[11px] text-muted-ink">
              {total} registros · exportados da planilha de suporte
            </p>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-soft">
            (a) painel operacional
          </div>
        </div>

        <section className="grid grid-cols-2 gap-px overflow-hidden bg-line ring-1 ring-line md:grid-cols-4">
          <div className="rise bg-paper p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-ink">
                Total de chamados
              </span>
              <span className="font-mono text-[10px] text-soft">01</span>
            </div>
            <div className="mt-3 font-mono text-3xl font-bold tracking-tight">{total}</div>
            <div className="mt-2 font-mono text-[11px] text-muted-ink">
              {porTipo.length} tipos diferentes
            </div>
          </div>
          <div className="rise bg-paper p-4" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-ink">
                Em andamento
              </span>
              <span className="size-2 rounded-full bg-warn" />
            </div>
            <div className="mt-3 font-mono text-3xl font-bold tracking-tight">{andamento}</div>
            <div className="mt-2 font-mono text-[11px] text-muted-ink">
              {Math.round((andamento / total) * 100)}% do total
            </div>
          </div>
          <div className="rise bg-paper p-4" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-ink">
                Finalizados
              </span>
              <span className="size-2 rounded-full bg-ok" />
            </div>
            <div className="mt-3 font-mono text-3xl font-bold tracking-tight">{finalizados}</div>
            <div className="mt-2 font-mono text-[11px] text-muted-ink">
              {Math.round((finalizados / total) * 100)}% do total
            </div>
          </div>
          <div className="rise bg-paper p-4" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-ink">
                Fila de espera
              </span>
              <span className="size-2 rounded-full bg-crit" />
            </div>
            <div className="mt-3 font-mono text-3xl font-bold tracking-tight">{espera}</div>
            <div className="mt-2 font-mono text-[11px] text-muted-ink">aguardando início</div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-soft">
            (b) distribuição
          </div>
          <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] text-muted-ink">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-ok" />
              Finalizado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-warn" />
              Em andamento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-crit" />
              Negado
            </span>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rise rounded-xl bg-paper p-4 ring-1 ring-line">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold tracking-tight">Por status</h2>
              <span className="font-mono text-[10px] text-soft">rosca</span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative grid shrink-0 place-items-center">
                <div className="size-28 rounded-full" style={{ background: rosca }} />
                <div className="absolute inset-5 grid place-items-center rounded-full bg-paper text-center">
                  <div className="leading-none">
                    <div className="font-mono text-lg font-bold">{total}</div>
                    <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-muted-ink">
                      total
                    </div>
                  </div>
                </div>
              </div>
              <ul className="w-full space-y-2 text-[12px] font-medium">
                {porStatus.map(([nome, valor]) => (
                  <li key={nome} className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${STATUS_COR[nome] ?? "bg-soft"}`}
                    />
                    {nome}
                    <span className="ml-auto font-mono text-muted-ink">{valor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rise rounded-xl bg-paper p-4 ring-1 ring-line" style={{ animationDelay: "230ms" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold tracking-tight">Por responsável</h2>
              <span className="font-mono text-[10px] text-soft">barras</span>
            </div>
            <Barras itens={porResp} cor="bg-brand" />
          </div>

          <div className="rise rounded-xl bg-paper p-4 ring-1 ring-line" style={{ animationDelay: "280ms" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold tracking-tight">Por tipo</h2>
              <span className="font-mono text-[10px] text-soft">barras</span>
            </div>
            <Barras itens={porTipo} cor="bg-ink" />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rise rounded-xl bg-paper p-4 ring-1 ring-line" style={{ animationDelay: "320ms" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold tracking-tight">Área solicitante</h2>
              <span className="font-mono text-[10px] text-soft">barras</span>
            </div>
            <Barras itens={porArea} cor="bg-brand" />
          </div>

          <div
            className="rise rounded-xl bg-paper p-4 ring-1 ring-line md:col-span-2"
            style={{ animationDelay: "370ms" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold tracking-tight">Evolução por data</h2>
              <span className="font-mono text-[10px] text-soft">últimos 14 dias com registros</span>
            </div>
            <div className="mt-5 flex h-28 items-end gap-1.5">
              {evolucao.map(([dia, valor]) => (
                <div
                  key={dia}
                  title={`${dia}: ${valor}`}
                  className="bar-grow flex-1 rounded-t-sm bg-brand/70"
                  style={{ height: `${(valor / maiorDia) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              {evolucao.map(([dia]) => (
                <span
                  key={dia}
                  className="flex-1 text-center font-mono text-[9px] text-soft"
                >
                  {dia.slice(8)}/{dia.slice(5, 7)}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rise overflow-hidden rounded-xl bg-paper ring-1 ring-line" style={{ animationDelay: "420ms" }}>
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-soft">
              (d) registros
            </div>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 w-full rounded-md border border-line bg-paper px-3 text-[12px] font-medium placeholder:text-soft sm:w-56"
              placeholder="Buscar por número, área ou tipo…"
            />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-8 rounded-md border border-line bg-paper pl-2.5 pr-7 text-[12px] font-medium"
              >
                <option value="todos">Status: todos</option>
                {porStatus.map(([nome]) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
              <select
                value={resp}
                onChange={(e) => setResp(e.target.value)}
                className="h-8 rounded-md border border-line bg-paper pl-2.5 pr-7 text-[12px] font-medium"
              >
                <option value="todos">Responsável: todos</option>
                {porResp.map(([nome]) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
              <span className="font-mono text-[11px] text-muted-ink">
                exibindo {filtrados.length} de {total}
              </span>
            </div>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead className="sticky top-0 bg-paper">
                <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-soft">
                  <th className="px-4 py-2.5 font-medium">Chamado</th>
                  <th className="px-4 py-2.5 font-medium">Abertura</th>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">Solicitante</th>
                  <th className="px-4 py-2.5 font-medium">Responsável</th>
                  <th className="px-4 py-2.5 font-medium">Últ. atualização</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtrados.map((c) => (
                  <tr key={c.chamado} className="hover:bg-ink/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-muted-ink">#{c.chamado}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-ink">{c.abertura}</td>
                    <td className="px-4 py-2.5 font-medium">{c.tipo}</td>
                    <td className="px-4 py-2.5">{c.solicitante}</td>
                    <td className="px-4 py-2.5">{c.responsavel}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-ink">{c.atualizacao}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold">
                        <span
                          className={`size-1.5 rounded-full ${STATUS_COR[c.andamento] ?? "bg-soft"}`}
                        />
                        {c.andamento}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center font-mono text-[11px] text-muted-ink">
                      Nenhum chamado encontrado com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-soft">
            Central de suporte · TI
          </span>
          <span className="font-mono text-[10px] text-muted-ink">
            fonte: Relatorio_Chamados_1.xlsx
          </span>
        </div>
      </footer>
    </div>
  );
}
