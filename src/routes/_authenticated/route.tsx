import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { usePapel } from "@/hooks/use-papel";
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
  { to: "/manutencoes", label: "Manutenções" },
  { to: "/setores", label: "Setores e locais" },
  { to: "/admin", label: "Administração" },
] as const;

function Layout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { ehAdmin, papel } = usePapel();

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-paper font-sans text-ink antialiased">
      <header className="sticky top-0 z-20 shadow-md">
        <div className="bg-card">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-5">
            <Link to="/painel" className="flex flex-col items-center leading-none">
              <span className="font-logo text-[26px] font-bold tracking-[0.12em] text-ink">GASSI</span>
              <span className="font-logo text-[7px] tracking-[0.2em] text-muted-ink">O SHOPPING DOS ÓCULOS</span>
            </Link>
            <div className="ml-2 h-8 w-1 -skew-x-12 bg-brand" />
            <div className="text-[18px] font-extrabold italic tracking-tight text-ink">CONTROLE <span className="text-brand">TI</span></div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-[12px] font-medium text-muted-ink md:block">{user.email} · {papel === "admin" ? "Administrador" : papel === "tecnico" ? "Técnico" : "Usuário"}</span>
            </div>
          </div>
        </div>
        <div className="bg-faixa-gassi">
          <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-5 py-2">
            <nav className="flex gap-1.5 overflow-x-auto">
              {NAV.filter((n) => n.to !== "/admin" || ehAdmin).map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="whitespace-nowrap rounded-md border border-primary-foreground/20 px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-wider text-primary-foreground/85 hover:bg-brand-deep"
                  activeProps={{ className: "bg-brand-deep text-primary-foreground shadow-inner" }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <button onClick={sair} className="ml-auto rounded-md border border-primary-foreground/20 bg-brand-deep px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-wider text-primary-foreground">
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
