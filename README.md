# Missão Alpha-01

Gerenciador pessoal de estudos: matérias, sessões, cronômetro, metas, anotações, revisões e um espaço compartilhado para duas pessoas.

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres com RLS) · Vercel.

## Status

| Etapa | Escopo                                           | Situação |
| ----- | ------------------------------------------------ | -------- |
| 1     | Autenticação, perfil, preferências, shell do app | Pronta   |
| 2     | Matérias e personalização                        | Pronta   |
| 3     | Registro manual e cronômetro                     | Pronta   |
| 4     | Painel e gráficos                                | Pronta   |
| 5     | Calendário e metas                               | Pronta   |
| 6     | Anotações e diário                               | Pronta   |
| 7     | Revisões                                         | Pronta   |
| 8     | Desempenho                                       | Pronta   |
| 9     | Nossa Jornada                                    | Pronta   |

O banco completo (todas as etapas) está em `supabase/migrations/0001_init.sql`; cada etapa pode acrescentar um arquivo novo (`0002_…`), sempre aplicado em ordem.

## Configurar o Supabase (uma vez)

1. **Banco.** No painel do Supabase, abra _SQL Editor → New query_, cole o conteúdo de cada arquivo de `supabase/migrations/` **em ordem** (`0001_init.sql`, `0002_subjects.sql`, `0003_notes_search.sql`, `0004_reviews_reports_journey.sql`, `0005_avatars.sql`, `0006_study_focus.sql`, `0007_banner.sql`, `0008_pwa_notifications.sql`, `0009_questions.sql`, `0010_discursive.sql`, `0011_library.sql`, `0012_memory.sql`…) e clique em _Run_ para cada um. Eles criam tabelas, índices, políticas RLS, funções e o gatilho que cria o perfil no cadastro. Ao atualizar o app, rode só os arquivos novos.
   - Alternativa com a CLI: `npx supabase link --project-ref <ref>` e `npx supabase db push`.
2. **URLs de autenticação.** Em _Authentication → URL Configuration_:
   - _Site URL_: o endereço de produção (ex.: `https://foco-ai.vercel.app`).
   - _Redirect URLs_: adicione `http://localhost:3000/**` e `https://<seu-domínio>/**`. Para previews da Vercel, `https://*-<sua-conta>.vercel.app/**`.
3. **E-mails em português.** Em _Authentication → Emails → Templates_:
   - _Confirm signup_: assunto `Confirme seu e-mail no Missão Alpha-01`; corpo = `supabase/templates/confirmacao.html`.
   - _Reset password_: assunto `Criar nova senha no Missão Alpha-01`; corpo = `supabase/templates/recuperacao.html`.

   Esses modelos usam `token_hash`, então o link funciona mesmo se aberto em outro navegador ou aparelho.

4. **Senha mínima** (opcional, o app já exige): _Authentication → Providers → Email → Minimum password length_ = 8.

> O SMTP padrão do Supabase envia poucos e-mails por hora. Para uso diário, configure um SMTP próprio (Resend, Postmark etc.) em _Authentication → Emails → SMTP Settings_.

## Rodar localmente

```bash
cp .env.example .env.local   # preencha URL e publishable key do Supabase
npm install
npm run dev
```

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Em _Environment Variables_, defina `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL` (o domínio de produção).
3. Deploy. Depois, ajuste a _Site URL_ do Supabase para esse domínio (passo 2 acima).

O app não usa chave de serviço: toda consulta roda como o usuário logado e o RLS decide o acesso.

## App instalável (PWA) e notificações

O app pode ser instalado no celular e no computador, abre em tela cheia, funciona sem internet nas telas já abertas e envia notificações push.

**Como funciona**

- `src/app/manifest.ts`: nome, ícones (`public/icons`), cores, tela cheia e atalhos. Telas de abertura do iPhone em `public/splash`.
- `src/app/sw.js/route.ts`: service worker gerado a cada build. Guarda os arquivos do app, cópias das telas principais (painel, sessões, matérias, revisões, calendário, metas, desempenho) e a página `/offline`. As cópias são apagadas ao sair da conta ou trocar de conta, e a cada versão nova.
- `src/features/pwa`: registro do service worker, aviso de nova versão, indicador de conexão e fila offline. "Registrar sessão" e "Finalizar cronômetro" feitos sem internet ficam no aparelho (separados por conta) e são enviados ao reconectar; cada item tem um UUID, então reenviar não duplica.
- Notificações: `supabase/migrations/0008_pwa_notifications.sql` cria a central (`notifications`), as preferências, os aparelhos inscritos e as funções. O `pg_cron` roda `run_notifications()` a cada 5 minutos: gera os avisos e chama `POST /api/push/dispatch` (via `pg_net`), que envia o push com VAPID. A chave secreta do Supabase não é usada: a rota usa a chave pública e as funções `push_claim`/`push_report` exigem o segredo de envio.

**Configurar (uma vez)**

1. Supabase → SQL Editor: rode `0008_pwa_notifications.sql`. Ele ativa `pg_cron` e `pg_net` e agenda a tarefa `alpha-notificacoes`.
2. Vercel → Settings → Environment Variables (Production): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` e `PUSH_DISPATCH_SECRET`. Depois, faça um novo deploy.
3. Supabase → SQL Editor:
   `select public.configure_push('https://SEU-SITE.vercel.app/api/push/dispatch', 'MESMO_PUSH_DISPATCH_SECRET');`
4. Aviso para todas as contas: `select public.notify_everyone('Título', 'Mensagem', '/painel');`

**Limitações por plataforma**

- iPhone/iPad (iOS 16.4+): push só no app adicionado à Tela de Início, e só depois de tocar em "Ativar". Sem atalhos no ícone. O iOS pode apagar os dados salvos de apps pouco usados.
- Android (Chrome): instalação, atalhos no ícone e push funcionam completos.
- Windows/macOS (Chrome/Edge): instalação pelo ícone na barra de endereço; push funciona com o navegador aberto em segundo plano.
- Firefox desktop: push funciona, mas não instala como app. Safari no Mac: instala pelo menu Arquivo → Adicionar ao Dock.
- Sem internet: iniciar, pausar e descartar o cronômetro precisam de conexão (o servidor garante o tempo); o tempo continua contando de qualquer forma.

## Banco de questões

- `supabase/migrations/0009_questions.sql` cria o catálogo (`questions`, lido pelas duas contas), as respostas (`question_attempts`, o acerto é calculado pelo banco), favoritas e anotações (`question_notes`), erros reportados (`question_reports`), a área escolhida por conta (`question_prefs`) e as funções de filtro, contagem e estatística.
- **Importar lotes:** em _Questões → Ativar importação_, a primeira conta que ativar vira a administradora do banco (só ela importa e resolve relatos). Depois, _Importar questões_ aceita um ou mais `.json` no formato do Alpha-20K (lista de questões ou `{ "questoes": [...] }`). O app confere cada questão antes de enviar; importar o mesmo arquivo de novo não duplica (atualiza pelo `id` só o que mudou).
- **Biblioteca** (`0011_library.sql`): apostilas por concurso → disciplina → capítulo → tópico, com leitor, marcações coloridas, anotações, favoritos, progresso de leitura e busca. Leitura só para a conta administradora e quem está no mesmo espaço da Nossa Jornada. O formato de importação está em [`docs/BIBLIOTECA.md`](docs/BIBLIOTECA.md).
- **Revisão adaptativa** (`0012_memory.sql`): cada tópico concluído na Biblioteca entra nas revisões (primeira no dia seguinte). As datas seguintes são calculadas pelo modelo FSRS (`src/features/memory/fsrs.ts`) a partir do desempenho: autoteste, questões ligadas ao tópico e questões resolvidas fora da revisão. Fila do dia com limite de tempo e prioridade por risco e incidência, reta final antes da prova, níveis de domínio, retenção real × meta e calibração mensal. Páginas: Revisões de hoje (`/revisoes/hoje`) e Desempenho (`/revisoes/desempenho`).
- **Discursivas** (`0010_discursive.sql`): `"tipo": "discursiva"`, sem `alternativas` nem `gabarito`, com o texto em `"resposta_esperada"`. Quem resolve escreve a resposta (opcional), vê a resposta esperada e marca _Acertei_ ou _Errei_; isso conta no desempenho e no filtro _Errei_.
- Até rodar a migração 0009, o painel e o desempenho funcionam normalmente e a página de questões mostra o que falta.

## Scripts

| Comando             | O que faz                                                                  |
| ------------------- | -------------------------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                                                |
| `npm run build`     | Build de produção                                                          |
| `npm run lint`      | ESLint                                                                     |
| `npm run typecheck` | TypeScript sem emitir arquivos                                             |
| `npm test`          | Testes de unidade (Vitest)                                                 |
| `npm run db:types`  | Regenera `src/lib/supabase/database.types.ts` a partir do projeto Supabase |

`supabase/tests/test_schema.py` verifica o schema e as políticas RLS contra um Postgres local (130 verificações).

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
