<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Data access uses the browser Supabase client with RLS (authenticated team = full access) via shared queryOptions in src/lib/inventario.ts; keeps one source for query keys.
- User usage history (historico_usuarios) is maintained by DB triggers on equipamentos.usuario_responsavel; never write it from the app.
- Sector access credentials use owner-scoped RLS and authenticated server functions with AES-GCM encryption under a server-only key; never include credentials in reports, AI input, or list queries.
- The TI sector embeds the same stock view as the global stock page; status remains the single source for availability and stock creation defaults to stock status.
- Responsibility terms are generated client-side as downloadable PDFs with editable issuer and recipient details, not electronic signatures or persisted agreements.
- Admin role table + /admin page (password reset, admin toggle) via server functions using has_role; never check admin client-side.
