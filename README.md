# Foco aí

Gerenciador pessoal de estudos: matérias, sessões, cronômetro, metas, anotações, revisões e um espaço compartilhado para duas pessoas.

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres com RLS) · Vercel.

## Status

| Etapa | Escopo | Situação |
| --- | --- | --- |
| 1 | Autenticação, perfil, preferências, shell do app | Pronta |
| 2 | Matérias e personalização | Pronta |
| 3 | Registro manual e cronômetro | Pronta |
| 4 | Painel e gráficos | Pronta |
| 5 | Calendário e metas | Pronta |
| 6 | Anotações e diário | — |
| 7 | Revisões | — |
| 8 | Desempenho | — |
| 9 | Nossa Jornada | — |

O banco completo (todas as etapas) está em `supabase/migrations/0001_init.sql`; cada etapa pode acrescentar um arquivo novo (`0002_…`), sempre aplicado em ordem.

## Configurar o Supabase (uma vez)

1. **Banco.** No painel do Supabase, abra *SQL Editor → New query*, cole o conteúdo de cada arquivo de `supabase/migrations/` **em ordem** (`0001_init.sql`, depois `0002_subjects.sql`…) e clique em *Run* para cada um. Eles criam tabelas, índices, políticas RLS, funções e o gatilho que cria o perfil no cadastro. Ao atualizar o app, rode só os arquivos novos.
   - Alternativa com a CLI: `npx supabase link --project-ref <ref>` e `npx supabase db push`.
2. **URLs de autenticação.** Em *Authentication → URL Configuration*:
   - *Site URL*: o endereço de produção (ex.: `https://foco-ai.vercel.app`).
   - *Redirect URLs*: adicione `http://localhost:3000/**` e `https://<seu-domínio>/**`. Para previews da Vercel, `https://*-<sua-conta>.vercel.app/**`.
3. **E-mails em português.** Em *Authentication → Emails → Templates*:
   - *Confirm signup*: assunto `Confirme seu e-mail no Foco aí`; corpo = `supabase/templates/confirmacao.html`.
   - *Reset password*: assunto `Criar nova senha no Foco aí`; corpo = `supabase/templates/recuperacao.html`.

   Esses modelos usam `token_hash`, então o link funciona mesmo se aberto em outro navegador ou aparelho.
4. **Senha mínima** (opcional, o app já exige): *Authentication → Providers → Email → Minimum password length* = 8.

> O SMTP padrão do Supabase envia poucos e-mails por hora. Para uso diário, configure um SMTP próprio (Resend, Postmark etc.) em *Authentication → Emails → SMTP Settings*.

## Rodar localmente

```bash
cp .env.example .env.local   # preencha URL e publishable key do Supabase
npm install
npm run dev
```

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Em *Environment Variables*, defina `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL` (o domínio de produção).
3. Deploy. Depois, ajuste a *Site URL* do Supabase para esse domínio (passo 2 acima).

O app não usa chave de serviço: toda consulta roda como o usuário logado e o RLS decide o acesso.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm test` | Testes de unidade (Vitest) |
| `npm run db:types` | Regenera `src/lib/supabase/database.types.ts` a partir do projeto Supabase |

`supabase/tests/test_schema.py` verifica o schema e as políticas RLS contra um Postgres local (59 verificações).

## Estrutura

```
src/
  app/(auth)/        entrar, cadastro, recuperar-senha, redefinir-senha
  app/(app)/         telas logadas (painel, configuracoes…)
  app/auth/confirm/  destino dos links de e-mail
  components/ui/     primitivos (Button, Input, Segmented…)
  components/layout/ sidebar, tab bar, menu da conta, página
  features/<módulo>/ actions, schemas e componentes de cada módulo
  lib/               supabase, auth, tempo/fuso, erros
  proxy.ts           renova a sessão e protege rotas
supabase/
  migrations/  templates/  tests/
```
