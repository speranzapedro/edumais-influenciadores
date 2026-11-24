-- Base do Edu+ (plataforma de criadores de conteúdo).
--
-- Schema enxuto derivado das migrations 0001–0024 do POC-FAETEC (f2fefcb), sem instituições, turmas,
-- cursos, unidades nem o Edu+ Professor. Um projeto Supabase = um produto: não há tenant.
--
-- Modelo:
--   users (criador | aluno | admin) ── criador_perfis (1:1, página pública /c/@handle)
--   produtos (do criador) ── trilhas (do produto) ── etapas/versões do estúdio → aulas/blocos publicados
--   assinaturas (aluno × produto) liberam as trilhas publicadas do produto para o aluno ("fã")
--
-- Segurança: todo acesso passa pelo servidor com a secret key (service_role). RLS ligado em todas as
-- tabelas, sem policies, e sem privilégios para anon/authenticated (nem em funções).

create extension if not exists unaccent with schema extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pg_cron;

-- Português sem acento para a busca do tutor (Edu).
create text search configuration public.pt (copy = pg_catalog.portuguese);
alter text search configuration public.pt
  alter mapping for hword, hword_part, word with extensions.unaccent, portuguese_stem;

-- ─────────────────────────── Contas ───────────────────────────

create type user_role as enum ('admin', 'criador', 'aluno');
create type user_status as enum ('ativo', 'inativo');

-- A conta nasce no Supabase Auth (pelo servidor) e depois ganha a linha aqui.
create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role user_role not null,
  status user_status not null default 'ativo',
  nome text not null,
  email text not null,
  avatar_url text,
  ultimo_acesso_em timestamptz,
  aceite_termos_em timestamptz,
  onboarding_concluido_em timestamptz,
  tour_estudio text[] not null default '{}',
  tutor_aviso_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_formato check (email = lower(email) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);
create unique index users_email_idx on users(email);
create index users_role_idx on users(role, status);

-- Limite de tentativas (login, cadastro, redefinição de senha) por IP ou identificador.
create table tentativas_login (
  id bigint generated always as identity primary key,
  chave text not null,
  sucesso boolean not null,
  created_at timestamptz not null default now()
);
create index tentativas_login_idx on tentativas_login(chave, created_at desc);

-- ─────────────────────────── Criador e produto ───────────────────────────

create table criador_perfis (
  user_id uuid primary key references users(id) on delete cascade,
  handle text not null,
  nome_publico text not null,
  bio text,
  foto_url text,
  redes jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint criador_perfis_handle_formato check (handle ~ '^[a-z0-9._]{3,30}$')
);
create unique index criador_perfis_handle_idx on criador_perfis(handle);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references users(id) on delete cascade,
  nome text not null,
  descricao text,
  preco_centavos integer check (preco_centavos is null or preco_centavos >= 0),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  publicado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Alvo da FK composta das trilhas (a trilha é do produto e do mesmo criador).
  unique (id, criador_id)
);
create index produtos_criador_idx on produtos(criador_id, created_at);

-- cortesia: acesso sem pagamento · pendente: aguardando o 1º pagamento · ativa: paga em dia
-- inadimplente: cobrança atrasada (ainda com acesso) · cancelada/expirada: sem acesso
create type assinatura_status as enum ('cortesia', 'pendente', 'ativa', 'inadimplente', 'cancelada', 'expirada');

create table assinaturas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  aluno_id uuid not null references users(id) on delete cascade,
  status assinatura_status not null default 'cortesia',
  valor_centavos integer not null default 0 check (valor_centavos >= 0),
  -- De onde o fã veio (?origem= no link do criador: instagram, bio, story…).
  origem text,
  iniciada_em timestamptz not null default now(),
  expira_em timestamptz,
  cancelada_em timestamptz,
  -- Gateway de pagamento (ex.: asaas) e o id da assinatura lá.
  provedor text,
  referencia_externa text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (produto_id, aluno_id)
);
create index assinaturas_produto_idx on assinaturas(produto_id, status, iniciada_em desc);
create index assinaturas_aluno_idx on assinaturas(aluno_id, status);
create unique index assinaturas_externa_idx on assinaturas(provedor, referencia_externa) where referencia_externa is not null;

-- ─────────────────────────── Trilhas e estúdio ───────────────────────────

create type trilha_status as enum ('rascunho', 'publicada', 'arquivada');

create table trilhas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null,
  criador_id uuid not null,
  titulo text not null,
  descricao text,
  cor text not null default 'violet',
  icone text not null default 'book-open',
  status trilha_status not null default 'rascunho',
  -- Ordem da trilha na página do criador.
  ordem int not null default 0,
  -- Ementa aprovada, copiada na publicação (o app do fã e o tutor leem daqui).
  ementa jsonb,
  publicada_em timestamptz,
  tutor_ativo boolean not null default true,
  -- O que o criador conta ao agente antes de gerar (etapa "Orientação").
  orientacao_objetivo text,
  orientacao_conteudos text,
  orientacao_complementos text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (produto_id, criador_id) references produtos(id, criador_id) on delete cascade
);
create index trilhas_produto_idx on trilhas(produto_id, status, ordem);
create index trilhas_criador_idx on trilhas(criador_id, updated_at desc);

create table materiais (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references trilhas(id) on delete cascade,
  storage_path text not null,
  nome text not null,
  mime text not null,
  tamanho_bytes bigint,
  paginas int,
  status text not null default 'enviado' check (status in ('enviado', 'processando', 'pronto', 'erro')),
  erro text,
  created_at timestamptz not null default now()
);
create index materiais_trilha_idx on materiais(trilha_id);

-- Texto dos materiais por página (busca do agente).
create table material_trechos (
  id bigint generated always as identity primary key,
  material_id uuid not null references materiais(id) on delete cascade,
  trilha_id uuid not null references trilhas(id) on delete cascade,
  pagina int not null,
  texto text not null,
  tsv tsvector generated always as (to_tsvector('portuguese', texto)) stored
);
create index material_trechos_tsv_idx on material_trechos using gin(tsv);
create index material_trechos_trilha_idx on material_trechos(trilha_id, material_id, pagina);

create type etapa as enum ('visao', 'ementa', 'cards', 'aulas');
create type etapa_status as enum ('pendente', 'gerando', 'em_revisao', 'aprovada', 'desatualizada');

create table trilha_etapas (
  trilha_id uuid not null references trilhas(id) on delete cascade,
  etapa etapa not null,
  status etapa_status not null default 'pendente',
  versao_atual int not null default 0,
  versao_aprovada int,
  qualidade jsonb,
  -- Trava da geração (uma execução do agente por etapa).
  gerando_desde timestamptz,
  -- Itens que o criador marcou como revisados: { item_id: assinatura_do_conteudo }.
  revisoes jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (trilha_id, etapa)
);

create table etapa_versoes (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references trilhas(id) on delete cascade,
  etapa etapa not null,
  versao int not null,
  snapshot jsonb not null,
  autor text not null check (autor in ('agente', 'criador')),
  resumo text,
  created_at timestamptz not null default now(),
  unique (trilha_id, etapa, versao)
);

create table agente_mensagens (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references trilhas(id) on delete cascade,
  etapa etapa not null,
  role text not null check (role in ('user', 'assistant')),
  texto text not null default '',
  eventos jsonb not null default '[]',
  foco jsonb,
  versao int,
  created_at timestamptz not null default now()
);
create index agente_mensagens_idx on agente_mensagens(trilha_id, etapa, created_at);

create table agente_execucoes (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid references trilhas(id) on delete cascade,
  etapa etapa,
  tipo text not null check (tipo in ('geracao', 'refinamento', 'eval')),
  status text not null default 'rodando' check (status in ('rodando', 'ok', 'erro')),
  modelo text,
  iteracoes int not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  custo_usd numeric(10, 4) not null default 0,
  duracao_ms int,
  erro text,
  created_at timestamptz not null default now(),
  finalizada_em timestamptz
);
create index agente_execucoes_trilha_idx on agente_execucoes(trilha_id, created_at desc);

-- ─────────────────────────── Conteúdo publicado ───────────────────────────

create table skill_cards (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references trilhas(id) on delete cascade,
  codigo text not null,
  ordem int not null,
  titulo text not null,
  conceito text not null,
  pontos_chave jsonb not null default '[]',
  exemplo text,
  topico_ids text[] not null default '{}',
  fontes jsonb not null default '[]',
  unique (trilha_id, codigo)
);

create table aulas (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references trilhas(id) on delete cascade,
  codigo text not null,
  modulo_id text not null,
  modulo_titulo text,
  ordem int not null,
  titulo text not null,
  objetivo text,
  skill_card_codigos text[] not null default '{}',
  -- Aula que saiu do rascunho numa republicação: some do app, mas o progresso fica.
  arquivada_em timestamptz,
  unique (trilha_id, codigo)
);
create index aulas_ativas_idx on aulas(trilha_id, ordem) where arquivada_em is null;

create table aula_blocos (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references aulas(id) on delete cascade,
  ordem int not null,
  tipo text not null check (tipo in ('texto', 'quiz', 'completar', 'ordenar', 'aberta')),
  conteudo jsonb not null
);
create index aula_blocos_idx on aula_blocos(aula_id, ordem);

-- ─────────────────────────── Progresso e gamificação do fã ───────────────────────────

create table aula_conclusoes (
  user_id uuid not null references users(id) on delete cascade,
  aula_id uuid not null references aulas(id) on delete cascade,
  acertos int not null default 0,
  total int not null default 0,
  concluida_em timestamptz not null default now(),
  primary key (user_id, aula_id)
);
create index aula_conclusoes_aula_idx on aula_conclusoes(aula_id);

create table trilha_conclusoes (
  user_id uuid not null references users(id) on delete cascade,
  trilha_id uuid not null references trilhas(id) on delete cascade,
  concluida_em timestamptz not null default now(),
  primary key (user_id, trilha_id)
);

create table dias_ativos (
  user_id uuid not null references users(id) on delete cascade,
  dia date not null,
  primary key (user_id, dia)
);

create table xp_eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  fonte text not null check (fonte in ('aula', 'trilha', 'streak', 'streak_bonus')),
  ref_key text not null,
  pontos int not null,
  descricao text,
  criado_em timestamptz not null default now(),
  unique (user_id, fonte, ref_key)
);
create index xp_eventos_user_idx on xp_eventos(user_id, criado_em);

create table conquistas_usuario (
  user_id uuid not null references users(id) on delete cascade,
  conquista_key text not null,
  desbloqueada_em timestamptz not null default now(),
  primary key (user_id, conquista_key)
);

-- Respostas dos desafios corrigíveis (quiz, completar, ordenar), corrigidas no servidor.
create table respostas_quiz (
  id bigint generated always as identity primary key,
  user_id uuid not null references users(id) on delete cascade,
  aula_id uuid not null references aulas(id) on delete cascade,
  bloco_id uuid not null,
  bloco_ordem int not null,
  pergunta text not null,
  tipo text not null default 'quiz' check (tipo in ('quiz', 'completar', 'ordenar')),
  -- Só no quiz; nos outros desafios a resposta fica em `resposta`.
  opcao int,
  resposta jsonb,
  correta boolean not null,
  modo text not null default 'aula' check (modo in ('aula', 'revisao')),
  tentativa uuid not null,
  respondida_em timestamptz not null default now()
);
create index respostas_quiz_user_idx on respostas_quiz(user_id, aula_id, respondida_em desc);
create index respostas_quiz_aula_idx on respostas_quiz(aula_id, bloco_ordem);
create unique index respostas_quiz_tentativa_idx on respostas_quiz(tentativa, bloco_id);

-- Pergunta aberta: resposta do fã e o feedback da IA.
create table respostas_abertas (
  id bigint generated always as identity primary key,
  user_id uuid not null references users(id) on delete cascade,
  aula_id uuid not null references aulas(id) on delete cascade,
  bloco_id uuid not null,
  bloco_ordem int not null,
  pergunta text not null,
  tentativa uuid not null,
  modo text not null default 'aula' check (modo in ('aula', 'revisao')),
  resposta text not null,
  feedback text not null,
  classificacao text check (classificacao in ('adequada', 'parcial', 'inadequada')),
  criterios jsonb,
  modelo text not null,
  tokens_entrada int not null default 0,
  tokens_saida int not null default 0,
  tokens_cache int not null default 0,
  custo_usd numeric(10, 6) not null default 0,
  duracao_ms int,
  criada_em timestamptz not null default now()
);
create unique index respostas_abertas_tentativa_idx on respostas_abertas(tentativa, bloco_id);
create index respostas_abertas_user_idx on respostas_abertas(user_id, criada_em desc);
create index respostas_abertas_aula_idx on respostas_abertas(aula_id, bloco_ordem);

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  corpo text,
  link text,
  lida_em timestamptz,
  created_at timestamptz not null default now()
);
create index notificacoes_user_idx on notificacoes(user_id, created_at desc);

create table audit_log (
  id bigint generated always as identity primary key,
  ator_id uuid references users(id) on delete set null,
  acao text not null,
  entidade text not null,
  entidade_id text,
  dados jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_idx on audit_log(created_at desc);

-- ─────────────────────────── Edu (tutor de IA da trilha) ───────────────────────────

create table tutor_indices (
  trilha_id uuid primary key references trilhas(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'indexando', 'pronto', 'erro')),
  mapa text,
  mapa_tokens int,
  modelo_embedding text,
  trechos int not null default 0,
  tokens int not null default 0,
  tokens_embedding int not null default 0,
  erro text,
  indexado_em timestamptz,
  indexando_desde timestamptz,
  solicitado_em timestamptz,
  sugestoes jsonb,
  sugestoes_hash text,
  updated_at timestamptz not null default now()
);

create table tutor_trechos (
  id bigint generated always as identity primary key,
  trilha_id uuid not null references trilhas(id) on delete cascade,
  origem text not null check (origem in ('material', 'aula', 'card')),
  material_id uuid references materiais(id) on delete cascade,
  aula_id uuid references aulas(id) on delete cascade,
  card_id uuid references skill_cards(id) on delete cascade,
  check (num_nonnulls(material_id, aula_id, card_id) = 1),
  pagina_inicio int,
  pagina_fim int,
  avaliativo boolean not null default false,
  secao_hash text not null,
  ordem int not null,
  caminho text not null,
  texto text not null,
  tokens int not null,
  tsv tsvector generated always as (
    setweight(to_tsvector('public.pt', caminho), 'A') || setweight(to_tsvector('public.pt', texto), 'B')
  ) stored,
  embedding extensions.halfvec(1024),
  modelo_embedding text,
  created_at timestamptz not null default now(),
  constraint tutor_trechos_secao_unica unique (trilha_id, secao_hash, ordem)
);
create index tutor_trechos_trilha_idx on tutor_trechos(trilha_id, secao_hash);
create index tutor_trechos_tsv_idx on tutor_trechos using gin(tsv);
create index tutor_trechos_material_idx on tutor_trechos(material_id) where material_id is not null;
create index tutor_trechos_aula_idx on tutor_trechos(aula_id) where aula_id is not null;
create index tutor_trechos_card_idx on tutor_trechos(card_id) where card_id is not null;

create table tutor_mensagens (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references trilhas(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  aula_id uuid references aulas(id) on delete set null,
  conversa_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  texto text not null,
  trechos jsonb,
  uso jsonb,
  avaliacao text check (avaliacao in ('util', 'nao_ajudou')),
  motivo text,
  avaliada_em timestamptz,
  created_at timestamptz not null default now()
);
create index tutor_mensagens_trilha_idx on tutor_mensagens(trilha_id, created_at);
create index tutor_mensagens_conversa_idx on tutor_mensagens(conversa_id, created_at);
create index tutor_mensagens_user_idx on tutor_mensagens(user_id, created_at);
create index tutor_mensagens_user_trilha_idx on tutor_mensagens(user_id, trilha_id, created_at);

-- ─────────────────────────── Funções ───────────────────────────

/** Busca full-text nos materiais de uma trilha (tool do agente do estúdio). */
create function buscar_trechos(p_trilha uuid, p_consulta text, p_limite int default 6)
returns table (material_id uuid, material_nome text, pagina int, rank real, trecho text)
language sql stable set search_path = public as $$
  with q as (select websearch_to_tsquery('portuguese', p_consulta) as tsq)
  select t.material_id, m.nome, t.pagina,
         ts_rank_cd(t.tsv, q.tsq) as rank,
         ts_headline('portuguese', t.texto, q.tsq,
           'MaxWords=60, MinWords=25, MaxFragments=2, FragmentDelimiter=" … ", StartSel=«, StopSel=»') as trecho
  from material_trechos t
  join materiais m on m.id = t.material_id
  cross join q
  where t.trilha_id = p_trilha and t.tsv @@ q.tsq
  order by rank desc
  limit p_limite;
$$;

/**
 * Busca híbrida do tutor dentro de uma trilha. A parte lexical usa OU entre os termos da pergunta e a
 * semântica usa distância de cosseno; as duas listas são fundidas por Reciprocal Rank Fusion (k = 60).
 * Qualquer uma pode vir vazia (p_embedding nulo = só lexical).
 */
create function tutor_buscar(
  p_trilha uuid,
  p_consulta text,
  p_embedding extensions.halfvec(1024),
  p_limite int default 30,
  p_modo text default 'hibrida'
)
returns table (
  id bigint, origem text, material_id uuid, aula_id uuid, card_id uuid,
  pagina_inicio int, pagina_fim int, avaliativo boolean, caminho text, texto text, tokens int,
  pos_lexica int, pos_semantica int, score float8
)
language sql stable set search_path = public, extensions as $$
  with q as (
    select nullif(string_agg(distinct quote_literal(lexeme), ' | '), '')::tsquery as tsq
    from unnest(to_tsvector('public.pt', coalesce(p_consulta, '')))
  ),
  lex as (
    select t.id, (row_number() over (order by ts_rank_cd(t.tsv, q.tsq, 32) desc, t.id))::int as pos
    from tutor_trechos t, q
    where p_modo in ('hibrida', 'lexica') and t.trilha_id = p_trilha and q.tsq is not null and t.tsv @@ q.tsq
    order by pos
    limit 50
  ),
  sem as (
    select t.id, (row_number() over (order by t.embedding <=> p_embedding, t.id))::int as pos
    from tutor_trechos t
    where p_modo in ('hibrida', 'semantica') and p_embedding is not null
      and t.trilha_id = p_trilha and t.embedding is not null
    order by pos
    limit 50
  ),
  rrf as (
    select coalesce(lex.id, sem.id) as id, lex.pos as pos_lexica, sem.pos as pos_semantica,
           coalesce(1.0 / (60 + lex.pos), 0) + coalesce(1.0 / (60 + sem.pos), 0) as score
    from lex full join sem on sem.id = lex.id
  )
  select t.id, t.origem, t.material_id, t.aula_id, t.card_id, t.pagina_inicio, t.pagina_fim,
         t.avaliativo, t.caminho, t.texto, t.tokens, rrf.pos_lexica, rrf.pos_semantica, rrf.score
  from rrf join tutor_trechos t on t.id = rrf.id
  order by rrf.score desc, t.id
  limit p_limite;
$$;

/** Perguntas feitas pelo fã hoje (todas as trilhas), no dia de calendário do fuso informado. */
create function tutor_perguntas_hoje(p_user uuid, p_tz text)
returns int
language sql stable set search_path = public as $$
  select count(*)::int
  from tutor_mensagens
  where user_id = p_user
    and role = 'user'
    and created_at >= (date_trunc('day', now() at time zone p_tz) at time zone p_tz);
$$;

-- ─────────────────────────── Armazenamento ───────────────────────────

-- Materiais enviados pelo criador (PDF, DOCX…): privados, lidos só pelo servidor.
insert into storage.buckets (id, name, public) values ('materiais', 'materiais', false)
on conflict (id) do nothing;

-- ─────────────────────────── Retenção ───────────────────────────

select cron.schedule(
  'tutor-retencao-12-meses',
  '17 3 * * *',
  $$delete from public.tutor_mensagens where created_at < now() - interval '12 months'$$
);
select cron.schedule(
  'tentativas-retencao-30-dias',
  '27 3 * * *',
  $$delete from public.tentativas_login where created_at < now() - interval '30 days'$$
);

-- ─────────────────────────── Privilégios ───────────────────────────

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
