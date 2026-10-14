-- Desconto geral (em reais) por Ordem de Compra (2026-10-14)
--
-- Regras de dados:
--   * valor_total passa a armazenar o valor LIQUIDO de cada item (ja com o
--     desconto aplicado). Assim todos os totais financeiros existentes
--     (Financeiro, Dashboard, Relatorios) refletem o desconto automaticamente.
--   * valor_bruto guarda o valor do item SEM desconto (quantidade * preco).
--     E usado no historico de precos, na impressao/PDF e ao reeditar a O.C.
--   * desconto guarda o desconto total (em reais) da O.C. O mesmo valor fica
--     repetido nas linhas da O.C.; ele nunca deve ser somado (apenas lido).

alter table public.jsp_logs add column if not exists desconto numeric not null default 0;
alter table public.jsp_logs add column if not exists valor_bruto numeric;

-- Backfill: O.C.s antigas nao tinham desconto, entao bruto = liquido.
update public.jsp_logs
   set valor_bruto = valor_total
 where valor_bruto is null
   and tipo in ('oc_pendente', 'compra');

comment on column public.jsp_logs.desconto is 'Desconto geral em reais aplicado a O.C. (mesmo valor repetido nas linhas da O.C.; nao somar).';
comment on column public.jsp_logs.valor_bruto is 'Valor do item sem desconto (quantidade * preco). valor_total guarda o valor liquido.';
