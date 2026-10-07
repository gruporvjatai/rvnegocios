-- =====================================================================
-- Backfill de jsp_logs.produto_id por nome normalizado (plano A)
-- Data: 2026-10-07
--
-- Caso: itens de O.C./compra (compra / oc_pendente) sem produto_id, cujo
-- nome casa - apos normalizacao (maiusculo, sem acento, espacos colapsados)
-- - com um unico produto do catalogo jsp_produtos.
--
-- Seguranca: cria backup dos registros afetados antes do UPDATE.
-- Nao altera nomes nem cria produtos; apenas vincula o id quando seguro.
-- =====================================================================

-- 1) Backup dos itens orfaos afetados
create table if not exists jsp_bkp_pre_prod_id_20261007_jsp_logs as
select uid, id, tipo, produto_id, produto_nome
from jsp_logs
where tipo in ('compra', 'oc_pendente') and produto_id is null;

-- 2) Backfill casando nome normalizado (maiusculo, sem acento, espaços colapsados)
with norm as (
    select id,
           upper(translate(trim(regexp_replace(nome, '\s+', ' ', 'g')),
             'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
             'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')) as n
    from jsp_produtos
), m as (
    select l.uid, min(p.id) as pid
    from jsp_logs l
    join norm p
      on upper(translate(trim(regexp_replace(l.produto_nome, '\s+', ' ', 'g')),
           'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
           'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')) = p.n
    where l.tipo in ('compra', 'oc_pendente') and l.produto_id is null
    group by l.uid
)
update jsp_logs l
set produto_id = m.pid
from m
where l.uid = m.uid;

-- 3) Conferencia: deve restar 281 orfaos (307 - 26 vinculados)
-- select count(*) from jsp_logs where tipo in ('compra','oc_pendente') and produto_id is null;
