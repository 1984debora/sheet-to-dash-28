import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const NAV = [
  { to: "/painel", label: "Painel" },
  { to: "/equipamentos", label: "Equipamentos" },
  { to: "/estoque", label: "Estoque" },
  { to: "/movimentacoes", label: "Movimentações" },
  { to: "/manutencoes", label: "Manutenções" },
  { to: "/setores", label: "Setores e locais" },
  { to: "/admin", label: "Administração" },
] as const;

function Layout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-paper font-sans text-ink antialiased">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-5">
          <Link to="/painel" className="flex items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded-md bg-ink">
              <span className="font-mono text-[11px] font-bold text-paper">TI</span>
            </div>
            <div className="hidden text-[13px] font-bold tracking-tight sm:block">INVENTÁRIO</div>
          </Link>
          <nav className="flex gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-muted-ink hover:text-ink"
                activeProps={{ className: "bg-ink/5 text-ink" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-[10px] text-muted-ink md:block">{user.email}</span>
            <button onClick={sair} className="text-[12px] font-medium text-muted-ink hover:text-ink">
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}
