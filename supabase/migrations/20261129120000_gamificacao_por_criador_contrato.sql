-- App do fã isolado por criador (white-label, fase 6). Parte 2 de 2: CONTRATO.
--
-- Aplicada no merge (o código novo já usa as tabelas por criador). Completa o que o código antigo gravou
-- entre a parte 1 e o deploy e remove as tabelas globais. Exceção à regra "só aditivas" do AGENTS.md.

-- XP gravado pelo código antigo, sem criador.
update xp_eventos x set criador_id = t.criador_id
from aulas a join trilhas t on t.id = a.trilha_id
where x.fonte = 'aula' and x.criador_id is null and a.id::text = x.ref_key;

update xp_eventos x set criador_id = t.criador_id
from trilhas t
where x.fonte = 'trilha' and x.criador_id is null and t.id::text = x.ref_key;

update xp_eventos x set criador_id = (
  select y.criador_id from xp_eventos y
  where y.user_id = x.user_id and y.criado_em = x.criado_em and y.criador_id is not null
  limit 1
)
where x.criador_id is null and x.fonte in ('streak', 'streak_bonus');

insert into dias_ativos_criador (user_id, criador_id, dia)
select distinct user_id, criador_id, split_part(ref_key, ':', 2)::date
from xp_eventos
where fonte = 'streak' and criador_id is not null and ref_key ~ '^dia:\d{4}-\d{2}-\d{2}$'
on conflict do nothing;

insert into conquistas_criador (user_id, criador_id, conquista_key, desbloqueada_em)
select c.user_id, a.criador_id, c.conquista_key, c.desbloqueada_em
from conquistas_usuario c
join assinaturas a on a.aluno_id = c.user_id
on conflict do nothing;

-- Sobrou sem criador (não dá para saber de quem era): sai.
delete from xp_eventos where criador_id is null;
alter table xp_eventos alter column criador_id set not null;

drop table dias_ativos;
drop table conquistas_usuario;
