-- App do fã isolado por criador (white-label, fase 6). Parte 1 de 2: EXPANSÃO.
--
-- XP, ofensiva e conquistas passam a ser contados por criador: quem segue dois criadores tem um placar
-- e uma ofensiva em cada um. Notificações ganham o criador (vazio = aviso geral).
--
-- Só acrescenta: o código no ar continua gravando em dias_ativos e conquistas_usuario e sem criador_id.
-- A parte 2 (20261129120000_gamificacao_por_criador_contrato.sql) completa o que o código antigo gravar
-- até o deploy, aperta as restrições e remove as tabelas globais — aplicada no merge.

-- ─────────────────────────── XP por criador ───────────────────────────

alter table xp_eventos add column criador_id uuid references users(id) on delete cascade;
create index xp_eventos_criador_idx on xp_eventos(user_id, criador_id, criado_em);

-- Aula e trilha: o criador da trilha.
update xp_eventos x set criador_id = t.criador_id
from aulas a join trilhas t on t.id = a.trilha_id
where x.fonte = 'aula' and x.criador_id is null and a.id::text = x.ref_key;

update xp_eventos x set criador_id = t.criador_id
from trilhas t
where x.fonte = 'trilha' and x.criador_id is null and t.id::text = x.ref_key;

-- Ofensiva: nasceu na mesma conclusão de aula (mesmo instante) — fica com o criador daquela aula.
update xp_eventos x set criador_id = (
  select y.criador_id from xp_eventos y
  where y.user_id = x.user_id and y.criado_em = x.criado_em and y.criador_id is not null
  limit 1
)
where x.criador_id is null and x.fonte in ('streak', 'streak_bonus');

-- ─────────────────────────── Dias ativos (ofensiva) por criador ───────────────────────────

create table dias_ativos_criador (
  user_id uuid not null references users(id) on delete cascade,
  criador_id uuid not null references users(id) on delete cascade,
  dia date not null,
  primary key (user_id, criador_id, dia)
);

-- Cada dia novo de estudo gerou um evento de ofensiva ("dia:<data>"): o dia vai para o criador dele.
insert into dias_ativos_criador (user_id, criador_id, dia)
select distinct user_id, criador_id, split_part(ref_key, ':', 2)::date
from xp_eventos
where fonte = 'streak' and criador_id is not null and ref_key ~ '^dia:\d{4}-\d{2}-\d{2}$'
on conflict do nothing;

-- ─────────────────────────── Conquistas por criador ───────────────────────────

create table conquistas_criador (
  user_id uuid not null references users(id) on delete cascade,
  criador_id uuid not null references users(id) on delete cascade,
  conquista_key text not null,
  desbloqueada_em timestamptz not null default now(),
  primary key (user_id, criador_id, conquista_key)
);

-- Até aqui a conquista valia para todos: copia para cada criador que o fã assina.
insert into conquistas_criador (user_id, criador_id, conquista_key, desbloqueada_em)
select c.user_id, a.criador_id, c.conquista_key, c.desbloqueada_em
from conquistas_usuario c
join assinaturas a on a.aluno_id = c.user_id
where a.criador_id is not null
on conflict do nothing;

-- ─────────────────────────── Notificações ───────────────────────────

alter table notificacoes add column criador_id uuid references users(id) on delete cascade;
create index notificacoes_criador_idx on notificacoes(user_id, criador_id, created_at desc);

-- Avisos de trilha nova: o criador da trilha do link.
update notificacoes n set criador_id = t.criador_id
from trilhas t
where n.criador_id is null and n.link ~ '^/trilhas/[0-9a-f-]{36}$' and t.id::text = substring(n.link from 10);

alter table dias_ativos_criador enable row level security;
alter table conquistas_criador enable row level security;
revoke all on all tables in schema public from anon, authenticated;
