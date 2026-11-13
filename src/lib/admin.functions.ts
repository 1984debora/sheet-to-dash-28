import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Admin checks happen inside SECURITY DEFINER database functions (has_role), so no service key is needed.

export const souAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { admin: !!data };
  });

export const listarEquipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_listar_equipe");
    if (error) throw new Error(error.message || "Não foi possível listar a equipe");
    return (data ?? []).map((u) => ({ id: u.id, email: u.email ?? "", ultimoAcesso: u.ultimo_acesso ?? null, papel: (u.papel ?? "usuario") as "admin" | "tecnico" | "usuario" }));
  });

export const redefinirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; senha: string }) => z.object({ userId: z.string().uuid(), senha: z.string().min(8).max(72) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_redefinir_senha", { _user_id: data.userId, _senha: data.senha });
    if (error) throw new Error(error.message || "Não foi possível alterar a senha");
    return { ok: true };
  });

const PAPEIS = ["admin", "tecnico", "usuario"] as const;

export const definirPapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; papel: string }) => z.object({ userId: z.string().uuid(), papel: z.enum(PAPEIS) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_definir_papel", { _user_id: data.userId, _papel: data.papel });
    if (error) throw new Error(error.message || "Não foi possível alterar a permissão");
    return { ok: true };
  });

async function exigirAdmin(context: { supabase: { rpc: (f: "has_role", a: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito a administradores");
}

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { email: string; senha: string; papel: string }) => z.object({ email: z.string().trim().email().max(255), senha: z.string().min(8).max(72), papel: z.enum(PAPEIS) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: novo, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.senha, email_confirm: true });
    if (error || !novo.user) throw new Error(error?.message.includes("already") ? "Este e-mail já tem acesso" : "Não foi possível criar o usuário");
    const { error: e2 } = await context.supabase.rpc("admin_definir_papel", { _user_id: novo.user.id, _papel: data.papel });
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir o seu próprio acesso");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Não foi possível excluir o usuário");
    return { ok: true };
  });
