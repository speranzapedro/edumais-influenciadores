-- Vários produtos por criador e assinatura do criador (white-label, fase 2). Parte 1 de 2: EXPANSÃO.
--
-- O criador passa a ter vários produtos, cada um com endereço próprio (/@criador/<slug>), logo e cores.
-- O fã assina o CRIADOR: um preço (no perfil do criador) libera todos os produtos publicados dele. A
-- assinatura guarda por qual produto o fã entrou (produto_id), só para o relatório "entrou por".
--
-- Só acrescenta e afrouxa: o código que está no ar continua funcionando com esta migration aplicada
-- (ele ainda grava produtos sem slug e assinaturas sem criador_id). A parte 2
-- (20261126120000_produtos_e_assinatura_do_criador_contrato.sql) completa o que ficar vazio, aperta
-- as restrições e remove o preço do produto — aplicar logo depois do deploy do código novo.

-- ─────────────────────────── Página e preço do criador ───────────────────────────

alter table criador_perfis
  add column preco_centavos integer check (preco_centavos is null or preco_centavos >= 0),
  add column pagina_status text not null default 'rascunho' check (pagina_status in ('rascunho', 'publicada')),
  add column pagina_publicada_em timestamptz;

comment on column criador_perfis.preco_centavos is 'Preço mensal da assinatura do criador (libera todos os produtos publicados).';
comment on column criador_perfis.pagina_status is 'A página /@criador aceita novos fãs só quando publicada (exige um produto publicado).';

-- Até aqui o preço e a publicação eram do produto (um por criador): copia do mais antigo.
update criador_perfis c
set preco_centavos = p.preco_centavos,
    pagina_status = case when p.status = 'publicado' then 'publicada' else 'rascunho' end,
    pagina_publicada_em = p.publicado_em
from (select distinct on (criador_id) * from produtos order by criador_id, created_at) p
where p.criador_id = c.user_id;

-- ─────────────────────────── Produto: endereço, marca e ordem ───────────────────────────

alter table produtos
  add column slug text,
  add column logo_path text,
  add column cor_primaria text not null default '#6c5ce7',
  add column cor_destaque text,
  add column ordem int not null default 0,
  add constraint produtos_slug_formato check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  -- Caminho no bucket de marcas: criadores/<criador>/<arquivo>.<png|jpg|webp> (sem SVG).
  add constraint produtos_logo_path_formato check (
    logo_path is null or logo_path ~ '^criadores/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'
  ),
  add constraint produtos_cor_primaria_hex check (cor_primaria ~ '^#[0-9a-f]{6}$'),
  add constraint produtos_cor_destaque_hex check (cor_destaque is null or cor_destaque ~ '^#[0-9a-f]{6}$');

create unique index produtos_slug_idx on produtos(criador_id, slug);
create index produtos_ordem_idx on produtos(criador_id, ordem, created_at);

-- Slug a partir do nome (sem acento, minúsculas, hífens), desviando dos nomes reservados das rotas do
-- app do fã (mesma lista de SLUGS_RESERVADOS em @edu/core) e desempatando com -2, -3…
with base as (
  select id, criador_id, created_at,
         trim(both '-' from left(regexp_replace(lower(extensions.unaccent(nome)), '[^a-z0-9]+', '-', 'g'), 40)) as s
  from produtos
),
valido as (
  select id, criador_id, created_at,
         case
           when length(s) < 3 or s in (
             'api', 'app', 'assinar', 'aula', 'aulas', 'cadastro', 'conquistas', 'conta', 'entrar', 'icone',
             'login', 'manifest', 'marca', 'notificacoes', 'perfil', 'produtos', 'progresso', 'sair', 'trilha', 'trilhas'
           ) then trim(both '-' from left(s || '-curso', 40))
           else s
         end as s
  from base
),
numerado as (
  select id, s, row_number() over (partition by criador_id, s order by created_at, id) as n,
         row_number() over (partition by criador_id order by created_at, id) - 1 as ordem
  from valido
)
update produtos p
set slug = case
             when length(n.s) < 3 then 'curso-' || left(p.id::text, 8)
             when n.n = 1 then n.s
             else rtrim(left(n.s, 40 - length('-' || n.n)), '-') || '-' || n.n
           end,
    ordem = n.ordem
from numerado n
where n.id = p.id;

-- ─────────────────────────── Assinatura do criador ───────────────────────────

alter table assinaturas add column criador_id uuid references users(id) on delete cascade;

update assinaturas a set criador_id = p.criador_id from produtos p where p.id = a.produto_id;

-- Uma assinatura por fã e criador. Com um produto por criador até aqui, não há duplicadas; se houver,
-- fica a que dá acesso (e a mais recente).
delete from assinaturas a
using (
  select id, row_number() over (
           partition by criador_id, aluno_id
           order by (status in ('cortesia', 'ativa', 'inadimplente')) desc, iniciada_em desc, id
         ) as n
  from assinaturas
  where criador_id is not null
) d
where d.id = a.id and d.n > 1;

create unique index assinaturas_criador_aluno_idx on assinaturas(criador_id, aluno_id);
create index assinaturas_criador_idx on assinaturas(criador_id, status, iniciada_em desc);

-- O produto vira só a porta de entrada: opcional e sobrevive à exclusão do produto.
alter table assinaturas alter column produto_id drop not null;
alter table assinaturas drop constraint assinaturas_produto_id_fkey;
alter table assinaturas
  add constraint assinaturas_produto_id_fkey foreign key (produto_id) references produtos(id) on delete set null;

comment on column assinaturas.produto_id is 'Produto pelo qual o fã entrou (relatório "entrou por"). O acesso é ao criador inteiro.';

-- Tabelas e colunas novas seguem sem acesso para anon/authenticated (RLS ligado, sem policies).
revoke all on all tables in schema public from anon, authenticated;
