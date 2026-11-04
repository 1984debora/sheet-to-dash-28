import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | Inventário de TI" },
      { name: "description", content: "Acesso da equipe de TI à plataforma de equipamentos." },
      { property: "og:title", content: "Entrar no Inventário de TI" },
      { property: "og:description", content: "Acesso restrito à equipe de TI." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/painel" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
        setModo("entrar");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setCarregando(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Não foi possível entrar com Google"); return; }
    if (r.redirected) return;
    navigate({ to: "/painel" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 font-sans text-ink">
      <div className="w-full max-w-sm rounded-xl bg-paper p-6 ring-1 ring-line">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-md bg-ink">
            <span className="font-mono text-[11px] font-bold text-paper">TI</span>
          </div>
          <div>
            <div className="text-[14px] font-bold tracking-tight">INVENTÁRIO DE TI</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-ink">
              acesso da equipe
            </div>
          </div>
        </div>
        <form onSubmit={enviar} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={carregando}>
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={google}>
          Continuar com Google
        </Button>
        <button
          type="button"
          onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
          className="mt-4 w-full text-center text-[12px] text-muted-ink hover:text-ink"
        >
          {modo === "entrar" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
