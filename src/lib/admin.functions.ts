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
    return (data ?? []).map((u) => ({ id: u.id, email: u.email ?? "", ultimoAcesso: u.ultimo_acesso ?? null, admin: !!u.admin }));
  });

export const redefinirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; senha: string }) => z.object({ userId: z.string().uuid(), senha: z.string().min(8).max(72) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_redefinir_senha", { _user_id: data.userId, _senha: data.senha });
    if (error) throw new Error(error.message || "Não foi possível alterar a senha");
    return { ok: true };
  });

export const definirAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; admin: boolean }) => z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_definir_admin", { _user_id: data.userId, _admin: data.admin });
    if (error) throw new Error(error.message || "Não foi possível alterar a permissão");
    return { ok: true };
  });
