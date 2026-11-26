# E-mails de autenticação — Resend SMTP

O Supabase Auth envia os e-mails de redefinição de senha do painel do criador e do app do fã pelo SMTP da Resend. Não há envio pela API Resend nos apps nem e-mails de boas-vindas, trilha nova ou recibos neste escopo.

## Produção

Projeto Supabase: `pwbfmxknkoxthxzaaeup` (`edumais-influenciadores`). O projeto antigo `gixiukcllgvkaigkkrnt` não deve ser alterado.

Antes da ativação, conferir que o domínio `edumais.app.br` está verificado na Resend e que SPF e DKIM estão válidos no DNS. Registrar os valores anteriores das configurações, sem copiar segredos.

Em **Authentication → Emails → SMTP Settings**, habilitar Custom SMTP:

| Campo        | Valor                                                      |
| ------------ | ---------------------------------------------------------- |
| Sender email | `nao-responda@edumais.app.br`                              |
| Sender name  | `Edu+`                                                     |
| Host         | `smtp.resend.com`                                          |
| Port         | `465`                                                      |
| Username     | `resend`                                                   |
| Password     | Chave da API Resend, inserida diretamente pelo responsável |

A chave não deve ser enviada por chat, versionada ou registrada em logs. O exemplo comentado em `supabase/config.toml` é apenas uma referência; não configura o projeto hospedado.

Depois de ativar SMTP, em **Emails → Templates → Reset password**, definir:

- Assunto: `Redefina sua senha do Edu+`.
- Corpo: o conteúdo integral de `supabase/templates/recovery.html`, preservando `{{ .ConfirmationURL }}`.

Em **Authentication → Rate Limits**, definir **Rate limit for sending emails** como **100 e-mails/hora**, sem mudar os demais limites. Esse teto é compartilhado pelo projeto e não aumenta a franquia da Resend. Preservar o intervalo mínimo por usuário; pedidos feitos antes desse intervalo podem não gerar novos envios.

Em **Authentication → URL Configuration**, manter o Site URL como `https://edumais-painel-pedro-speranzas-projects.vercel.app` e somente estes redirects em produção:

- `https://edumais-painel-pedro-speranzas-projects.vercel.app/**`
- `https://edumais-app-pedro-speranzas-projects.vercel.app/**`

Não cadastrar localhost no projeto de produção. Preservar **Allow new users to sign up** desligado, as notificações adicionais desligadas e as demais opções de autenticação. As contas são criadas pelo servidor com `email_confirm: true`, sem envio de confirmação; não é necessário desligar a opção **Confirm email** do Dashboard.

## Desenvolvimento e testes locais

O Supabase local continua com Mailpit e os redirects de `http://localhost:3006/**` e `http://localhost:3007/**` no `config.toml`. Os testes E2E definem esses endereços explicitamente. Não habilitar o bloco SMTP comentado nem adicionar uma chave Resend para os testes locais.

Executar `pnpm verificar`. Com Docker e Supabase local disponíveis, executar `pnpm db:iniciar`, `pnpm build` e `pnpm --filter @edu/e2e exec playwright test --grep "redefinição de senha pelo e-mail"`. Os testes locais de recuperação dos dois apps leem o e-mail no Mailpit; não comprovam entrega pela Resend.

## Validação real

Usar contas dedicadas de criador e fã com endereços distintos sob controle do responsável. Antes de provisionar, conferir se já existem e se têm o papel esperado; não alterar o papel de contas existentes. Contas novas devem ser criadas pelas rotinas de servidor `cadastrarCriador` e `criarConta` (papel `aluno`), com senhas iniciais aleatórias e não registradas. Não executar seeds em produção nem publicar conteúdo para esse teste; a recuperação de senha do fã não exige assinatura.

1. Solicitar recuperação pelo painel. O responsável confere remetente `Edu+ <nao-responda@edumais.app.br>`, assunto, português e SPF/DKIM como `PASS` nos cabeçalhos recebidos.
2. Abrir o link no mesmo navegador que iniciou o pedido (PKCE), conferir o domínio do painel e a página `/redefinir-senha`. O responsável define a nova senha, encerra a sessão e confirma que consegue entrar novamente.
3. Somente depois de concluir o painel, repetir no app do fã e conferir o domínio correspondente. A conta precisa ter o papel certo para o app.
4. Confirmar o evento `Delivered` nos logs da Resend. Não copiar links de recuperação, códigos, tokens, senhas ou cookies para documentos, chat ou relatórios.
5. Conferir o limite do aplicativo: três pedidos por e-mail em uma janela móvel de 60 minutos; o quarto deve retornar o bloqueio. Contabilizar pedidos anteriores e respeitar o intervalo mínimo do Supabase. O contador é compartilhado pelos dois apps para um mesmo e-mail. Não apagar contadores para acelerar o teste.
6. Conferir que um endereço sem conta recebe a mesma resposta genérica, sem disparo real. A mensagem de sucesso do formulário não comprova entrega: `pedirRedefinicao` atualmente não inspeciona o erro retornado por `resetPasswordForEmail`.

Manter as contas dedicadas para testes futuros, sem exclusão automática. Registrar os resultados automatizados e as confirmações manuais separadamente; só considerar a entrega real validada depois da confirmação do responsável e dos logs.

## Falhas, reversão e troca de domínios

Se o e-mail não chegar, conferir os logs de Auth e Resend, o remetente, a chave, a verificação do domínio e as cotas. Evitar novos pedidos repetidos enquanto se investiga. A participação do responsável é necessária para corrigir credenciais.

Para reverter, restaurar os valores anteriores de template, limite e URLs e, se necessário, desligar Custom SMTP. O SMTP padrão do Supabase tem restrições de destinatários e volume; voltar a ele não garante entrega aos usuários.

Na troca futura de domínios, atualizar `NEXT_PUBLIC_PAINEL_URL`, `NEXT_PUBLIC_APP_URL`, Site URL e a lista de redirects. Validar os dois fluxos antes de remover os endereços antigos. O remetente `nao-responda@edumais.app.br` permanece o mesmo.

## Referências

- [Resend: Supabase com SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase: SMTP próprio](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: limites de autenticação](https://supabase.com/docs/guides/auth/rate-limits)
