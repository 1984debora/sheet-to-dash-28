import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso restrito a administradores");
}

export const souAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { admin: !!data };
  });

export const listarEquipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error("Não foi possível listar a equipe");
    const { data: papeis } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const admins = new Set((papeis ?? []).filter((p) => p.role === "admin").map((p) => p.user_id));
    return data.users.map((u) => ({ id: u.id, email: u.email ?? "", ultimoAcesso: u.last_sign_in_at ?? null, admin: admins.has(u.id) }));
  });

export const redefinirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; senha: string }) => z.object({ userId: z.string().uuid(), senha: z.string().min(8).max(72) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.senha });
    if (error) throw new Error("Não foi possível alterar a senha");
    return { ok: true };
  });

export const definirAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; admin: boolean }) => z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (data.userId === context.userId && !data.admin) throw new Error("Você não pode remover seu próprio acesso de administrador");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = data.admin
      ? await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" })
      : await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    if (r.error) throw new Error("Não foi possível alterar a permissão");
    return { ok: true };
  });
