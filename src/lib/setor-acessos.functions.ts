import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const campos = z.object({
  setorId: z.string().uuid(), id: z.string().uuid().optional(),
  hostname: z.string().trim().min(1).max(100),
  usuario: z.string().trim().max(100), gerente_adm: z.string().trim().max(100),
  anydesk: z.string().trim().max(100), email: z.union([z.literal(""), z.string().email()]),
  senha: z.string().max(500), senha_anydesk: z.string().max(500), senha_email: z.string().max(500),
});

export const salvarAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input: z.infer<typeof campos>) => campos.parse(input))
  .handler(async ({ data, context }) => {
    const secret = process.env["SECTOR_CREDENTIALS_KEY"];
    if (!secret) throw new Error("Proteção de senhas indisponível");
    const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)), "AES-GCM", false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    let passwords = { senha: data.senha, senha_anydesk: data.senha_anydesk, senha_email: data.senha_email };
    if (data.id) {
      const { data: previous, error } = await context.supabase.from("setor_acessos").select("segredos_cifrados").eq("id", data.id).eq("setor_id", data.setorId).single();
      if (error || !previous) throw new Error("Cadastro não encontrado");
      const decryptKey = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)), "AES-GCM", false, ["decrypt"]);
      const bytes = Uint8Array.from(atob(previous.segredos_cifrados), c => c.charCodeAt(0));
      const old = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, decryptKey, bytes.slice(12)))) as typeof passwords;
      passwords = { senha: data.senha || old.senha, senha_anydesk: data.senha_anydesk || old.senha_anydesk, senha_email: data.senha_email || old.senha_email };
    }
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(passwords))));
    const combined = new Uint8Array(iv.length + encrypted.length); combined.set(iv); combined.set(encrypted, iv.length);
    const row = { setor_id: data.setorId, hostname: data.hostname, usuario: data.usuario, gerente_adm: data.gerente_adm, anydesk: data.anydesk, email: data.email, segredos_cifrados: btoa(String.fromCharCode(...combined)), ultima_alteracao: new Date().toISOString() };
    const result = data.id ? await context.supabase.from("setor_acessos").update(row).eq("id", data.id).eq("setor_id", data.setorId) : await context.supabase.from("setor_acessos").insert({ ...row, criado_por: context.userId });
    if (result.error) throw new Error("Não foi possível salvar o acesso");
    return { ok: true };
  });

export const revelarAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("setor_acessos").select("segredos_cifrados").eq("id", data.id).single();
    if (error || !row) throw new Error("Acesso não encontrado");
    const secret = process.env["SECTOR_CREDENTIALS_KEY"];
    if (!secret) throw new Error("Proteção de senhas indisponível");
    const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)), "AES-GCM", false, ["decrypt"]);
    const bytes = Uint8Array.from(atob(row.segredos_cifrados), c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12)))) as { senha: string; senha_anydesk: string; senha_email: string };
  });