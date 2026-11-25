# Edu+ para criadores de conteúdo

Plataforma em que influenciadores transformam o próprio conteúdo em trilhas de microaulas gamificadas (estilo Duolingo), com a ajuda do **Edu** (IA), e vendem por assinatura aos seguidores. Parceria 70/30: 70% de cada venda para o criador, 30% para o Edu+.

Este repositório nasceu de uma cópia podada do monorepo `POC-FAETEC` (commit `f2fefcb`). Não há código de escola, turma ou professor aqui, e esses conceitos não devem voltar.

## Glossário

| Termo          | O que é                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **criador**    | Influenciador que usa o painel (`apps/painel`). Papel `criador` no banco.                                                               |
| **aluno**      | Quem estuda no app (`apps/app`). Na interface chamamos de **fã** ou **assinante**; no código e no banco, `aluno`.                       |
| **produto**    | O que o criador vende: um conjunto de trilhas, com página pública em `/c/<@handle>`.                                                    |
| **assinatura** | Vínculo aluno ↔ produto. Libera as trilhas publicadas. Hoje toda entrada é `cortesia`; pagamentos (Asaas, split 70/30) vêm depois.      |
| **trilha**     | Sequência de módulos e aulas, criada no estúdio em seis etapas: materiais, visão geral, ementa, cards de conhecimento, aulas, publicar. |
| **Edu**        | A IA: agente do estúdio, feedback das perguntas abertas e tutor do aluno.                                                               |

## Estrutura

```
apps/painel     painel do criador (estúdio, vendas, divulgar)   criador.edumais.app.br
apps/app        app do aluno (página pública /c/@, aulas, Edu)   aprenda.edumais.app.br
apps/site       landing de criadores                             edumais.app.br
packages/core    regras puras: conteúdo, validação, gamificação, aula, criador, vendas
packages/ai      agente do estúdio, revisor, feedback, tutor (Anthropic + Voyage)
packages/db      acesso ao Supabase (só servidor) + testes de integração em packages/db/test
packages/estudio estúdio da trilha (componentes e rotas do agente)
packages/aula-ui player das aulas e painel do Edu
packages/ui      design system (tokens, componentes, termos)
packages/testing fábricas, limpeza e ambiente dos testes de integração
packages/config  tsconfig base
e2e/             testes de ponta a ponta (Playwright), um projeto por app
supabase/        config.toml e migrations (a base é 20261123120000_base.sql)
```

## Comandos

```bash
pnpm install
pnpm dev                # todos os apps
pnpm verificar          # o mesmo que o CI: biome, tipos, testes com cobertura mínima
pnpm test               # testes unitários e de componentes
pnpm test:cobertura     # idem, com relatório em coverage/ e limites por pacote
pnpm lint:corrigir      # formata e aplica correções seguras do Biome

# Banco local (Docker): sobe o Supabase com as migrations aplicadas
pnpm db:iniciar
pnpm db:resetar         # recria o banco local do zero
pnpm db:tipos           # gera os tipos do banco local e confere com database.types.ts
pnpm test:int           # testes de integração do @edu/db (só aceitam Supabase local)
pnpm test:int:cobertura # idem, com cobertura mínima de 75% em packages/db/src
pnpm build && pnpm e2e  # Playwright (e2e/) contra o build dos apps e o Supabase local (Mailpit para e-mail)
```

O CI roda tudo isso em três jobs: **Qualidade** (Biome, tipos, unitários), **Integração** (Supabase local, lint do schema, tipos e testes do banco) e **Build e E2E** (build dos apps e Playwright).

Variáveis de ambiente: um único `.env.local` na raiz (modelo em `.env.example`); os apps carregam esse arquivo no `next.config.ts`.

## Regras do projeto

- **Banco só no servidor**, com a chave secreta. Nada de chave de serviço no navegador.
- **Migrations só aditivas** depois da migration base. Mudou o schema, atualize `packages/db/src/database.types.ts` (escrito à mão, com uniões literais) e rode `pnpm db:tipos`: o CI falha se divergir do banco.
- **Mudança que quebra o código no ar vai em duas migrations** (expandir → contrair): a primeira só acrescenta e afrouxa, para o código antigo continuar funcionando e o novo poder ser validado com ela aplicada; a segunda (remoções, `not null`) é aplicada logo depois do deploy. Exemplo: `20261125120000_produtos_e_assinatura_do_criador.sql` e o `_contrato` de 20261126.
- **Toda função nova do `@edu/db`** ganha teste de integração (`packages/db/test/*.int.test.ts`, com as fábricas de `@edu/testing`); toda regra pura nova ganha teste unitário. Regra de negócio que não precisa do banco (agregações, limites) vai para o `@edu/core`.
- **A IA nunca é chamada nos testes**: use `definirClienteAnthropic` com o cliente falso de `packages/ai/src/teste/anthropic-falso.ts`, e `VOYAGE_API_URL` para o Voyage.
- **Cobertura mínima**: 80% de linhas em `core`, `ai` e `ui`; 75% em `db` pelos testes de integração (o CI falha abaixo disso).
- **Contas nascem pelo servidor** (`criarConta`: Auth primeiro, depois `users`); o cadastro público do Supabase Auth fica desligado. Apagar o login no Auth apaga o resto em cascata.
- **Identidade visual**: tokens em `packages/ui/src/styles.css` (roxo `#6c5ce7`, Plus Jakarta Sans), componente `Marca`. Não crie cores ou fontes fora dos tokens.
- **Nomes em português**, como no resto do código. Commits no padrão Conventional Commits (`feat:`, `fix:`, `chore:`…), checados pelo lefthook.
- `style/noNonNullAssertion` está desligado no Biome: o `!` é aceito quando o valor já foi conferido.

## Versões

Next.js 16 e React 19: algumas APIs mudaram (por exemplo, `proxy.ts` no lugar de `middleware.ts`). Confira a documentação em `node_modules/next/dist/docs/` antes de usar uma API nova.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
