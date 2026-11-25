-- Vários produtos por criador e assinatura do criador (white-label, fase 2). Parte 2 de 2: CONTRATO.
--
-- Aplicar logo depois do deploy do código novo (o antigo grava produtos sem slug e lê o preço do
-- produto). Exceção à regra "só aditivas" do AGENTS.md: remove produtos.preco_centavos, que passou
-- para o perfil do criador na parte 1.

-- O que o código antigo gravou entre a parte 1 e o deploy.
update produtos set slug = 'curso-' || left(id::text, 8) where slug is null;
update assinaturas a set criador_id = p.criador_id from produtos p where p.id = a.produto_id and a.criador_id is null;
delete from assinaturas where criador_id is null;

alter table produtos alter column slug set not null;
alter table assinaturas alter column criador_id set not null;

-- O fã assina o criador: a unicidade por produto deixa de existir (fica a de criador × fã).
alter table assinaturas drop constraint assinaturas_produto_id_aluno_id_key;

alter table produtos drop column preco_centavos;
