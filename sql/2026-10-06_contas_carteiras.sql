-- =====================================================================
-- CONTAS / CARTEIRAS + CARTAO DE CREDITO / FATURAS
-- 2026-10-06
-- Somente objetos com prefixo jsp_ / rv_ (escopo do projeto).
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CONTAS
-- ---------------------------------------------------------------------
create table if not exists public.jsp_contas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'caixa',              -- caixa | banco | cartao_credito
  saldo_inicial numeric(14,2) not null default 0,
  data_saldo_inicial date not null default current_date,
  cor text default '#0f172a',
  ativa boolean not null default true,
  ordem int not null default 0,
  limite numeric(14,2),                            -- cartao
  dia_fechamento int,                              -- cartao 1..28
  dia_vencimento int,                              -- cartao 1..28
  conta_pagamento_padrao uuid,
  created_at timestamptz not null default now(),
  constraint jsp_contas_tipo_chk check (tipo in ('caixa','banco','cartao_credito'))
);

-- ---------------------------------------------------------------------
-- 2. FATURAS (cartao)
-- ---------------------------------------------------------------------
create table if not exists public.jsp_faturas (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.jsp_contas(id) on delete cascade,
  competencia text not null,                       -- YYYY-MM
  data_fechamento date not null,
  data_vencimento date not null,
  valor_total numeric(14,2) not null default 0,
  status text not null default 'ABERTA',           -- ABERTA | FECHADA | PAGA | CANCELADA
  conta_pagamento_id uuid references public.jsp_contas(id) on delete set null,
  pago_em date,
  mov_pagamento_id uuid,
  created_at timestamptz not null default now(),
  constraint jsp_faturas_status_chk check (status in ('ABERTA','FECHADA','PAGA','CANCELADA')),
  constraint jsp_faturas_unq unique (conta_id, competencia)
);

-- ---------------------------------------------------------------------
-- 3. MOVIMENTACOES (ledger)
-- ---------------------------------------------------------------------
create table if not exists public.jsp_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.jsp_contas(id) on delete cascade,
  conta_destino_id uuid references public.jsp_contas(id) on delete set null,
  tipo text not null,                              -- ENTRADA | SAIDA | TRANSFERENCIA_SAIDA | TRANSFERENCIA_ENTRADA | COMPRA_CARTAO | PAGAMENTO_FATURA | AJUSTE_ENTRADA | AJUSTE_SAIDA
  valor numeric(14,2) not null default 0,
  data date not null default current_date,
  descricao text,
  categoria text,
  obra_id int,
  log_uid uuid,
  oc_id text,
  fatura_id uuid references public.jsp_faturas(id) on delete set null,
  grupo uuid,
  origem text not null default 'manual',           -- manual | baixa_receita | baixa_despesa | baixa_oc | compra_cartao | fechamento_fatura | pagamento_fatura | ajuste | estorno
  estornada boolean not null default false,
  estorno_de_id uuid references public.jsp_movimentacoes(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by text,
  constraint jsp_mov_tipo_chk check (tipo in (
    'ENTRADA','SAIDA','TRANSFERENCIA_SAIDA','TRANSFERENCIA_ENTRADA',
    'COMPRA_CARTAO','PAGAMENTO_FATURA','AJUSTE_ENTRADA','AJUSTE_SAIDA'
  ))
);

create index if not exists jsp_mov_conta_idx    on public.jsp_movimentacoes(conta_id, data);
create index if not exists jsp_mov_log_idx      on public.jsp_movimentacoes(log_uid) where log_uid is not null;
create index if not exists jsp_mov_fatura_idx   on public.jsp_movimentacoes(fatura_id) where fatura_id is not null;
create index if not exists jsp_mov_grupo_idx    on public.jsp_movimentacoes(grupo) where grupo is not null;
create unique index if not exists jsp_mov_baixa_unq
  on public.jsp_movimentacoes(log_uid, tipo)
  where log_uid is not null and estornada = false and origem in ('baixa_receita','baixa_despesa');

-- ---------------------------------------------------------------------
-- 4. COLUNAS EM jsp_logs
-- ---------------------------------------------------------------------
alter table public.jsp_logs add column if not exists conta_id uuid;
alter table public.jsp_logs add column if not exists fatura_id uuid;
alter table public.jsp_logs add column if not exists liquidado_em timestamptz;
alter table public.jsp_logs add column if not exists eh_cartao boolean not null default false;

-- ---------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------
alter table public.jsp_contas        enable row level security;
alter table public.jsp_movimentacoes enable row level security;
alter table public.jsp_faturas       enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_contas' and policyname='jsp_contas_sel_auth') then
    create policy jsp_contas_sel_auth on public.jsp_contas for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_contas' and policyname='jsp_contas_ins_auth') then
    create policy jsp_contas_ins_auth on public.jsp_contas for insert to authenticated with check (jsp_is_gerente());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_contas' and policyname='jsp_contas_upd_auth') then
    create policy jsp_contas_upd_auth on public.jsp_contas for update to authenticated using (jsp_is_gerente()) with check (jsp_is_gerente());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_contas' and policyname='jsp_contas_del_auth') then
    create policy jsp_contas_del_auth on public.jsp_contas for delete to authenticated using (jsp_is_gerente());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_movimentacoes' and policyname='jsp_mov_sel_auth') then
    create policy jsp_mov_sel_auth on public.jsp_movimentacoes for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_movimentacoes' and policyname='jsp_mov_ins_auth') then
    create policy jsp_mov_ins_auth on public.jsp_movimentacoes for insert to authenticated with check (jsp_pode_operar());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_movimentacoes' and policyname='jsp_mov_upd_auth') then
    create policy jsp_mov_upd_auth on public.jsp_movimentacoes for update to authenticated using (jsp_pode_operar()) with check (jsp_pode_operar());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_movimentacoes' and policyname='jsp_mov_del_auth') then
    create policy jsp_mov_del_auth on public.jsp_movimentacoes for delete to authenticated using (jsp_pode_operar());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_faturas' and policyname='jsp_faturas_sel_auth') then
    create policy jsp_faturas_sel_auth on public.jsp_faturas for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_faturas' and policyname='jsp_faturas_ins_auth') then
    create policy jsp_faturas_ins_auth on public.jsp_faturas for insert to authenticated with check (jsp_pode_operar());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_faturas' and policyname='jsp_faturas_upd_auth') then
    create policy jsp_faturas_upd_auth on public.jsp_faturas for update to authenticated using (jsp_pode_operar()) with check (jsp_pode_operar());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='jsp_faturas' and policyname='jsp_faturas_del_auth') then
    create policy jsp_faturas_del_auth on public.jsp_faturas for delete to authenticated using (jsp_pode_operar());
  end if;
end $$;

grant select, insert, update, delete on public.jsp_contas        to authenticated;
grant select, insert, update, delete on public.jsp_movimentacoes to authenticated;
grant select, insert, update, delete on public.jsp_faturas       to authenticated;

-- ---------------------------------------------------------------------
-- 6. FUNCOES
-- ---------------------------------------------------------------------

-- 6.1 saldo de uma conta (exclui estornadas)
create or replace function public.rv_conta_saldo(p_conta uuid)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $function$
  select c.saldo_inicial + coalesce(sum(
      case
        when m.tipo in ('ENTRADA','TRANSFERENCIA_ENTRADA','AJUSTE_ENTRADA','PAGAMENTO_FATURA') then m.valor
        when m.tipo in ('SAIDA','TRANSFERENCIA_SAIDA','AJUSTE_SAIDA','COMPRA_CARTAO') then -m.valor
        else 0
      end), 0)
  from public.jsp_contas c
  left join public.jsp_movimentacoes m on m.conta_id = c.id
  where c.id = p_conta
  group by c.id, c.saldo_inicial;
$function$;

-- 6.2 ajuste manual de saldo (delta > 0 entrada, < 0 saida)
create or replace function public.rv_ajuste(p_conta uuid, p_delta numeric, p_data date default current_date, p_desc text default 'Ajuste de saldo')
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'Delta invalido.'; end if;
  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, origem, created_by)
  values (p_conta,
          case when p_delta > 0 then 'AJUSTE_ENTRADA' else 'AJUSTE_SAIDA' end,
          abs(p_delta), coalesce(p_data, current_date), p_desc, 'ajuste',
          coalesce(auth.jwt()->>'email',''))
  returning id into v_id;
  return v_id;
end;
$function$;

-- 6.3 transferencia entre contas
create or replace function public.rv_transferir(p_origem uuid, p_destino uuid, p_valor numeric, p_data date default current_date, p_desc text default 'Transferencia entre contas')
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_grupo uuid := gen_random_uuid();
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_origem is null or p_destino is null then raise exception 'Informe origem e destino.'; end if;
  if p_origem = p_destino then raise exception 'Origem e destino iguais.'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'Valor invalido.'; end if;

  insert into public.jsp_movimentacoes(conta_id, conta_destino_id, tipo, valor, data, descricao, origem, grupo, created_by)
  values (p_origem, p_destino, 'TRANSFERENCIA_SAIDA', p_valor, coalesce(p_data,current_date), p_desc, 'manual', v_grupo, coalesce(auth.jwt()->>'email',''));
  insert into public.jsp_movimentacoes(conta_id, conta_destino_id, tipo, valor, data, descricao, origem, grupo, created_by)
  values (p_destino, p_origem, 'TRANSFERENCIA_ENTRADA', p_valor, coalesce(p_data,current_date), p_desc, 'manual', v_grupo, coalesce(auth.jwt()->>'email',''));
  return v_grupo;
end;
$function$;

-- 6.4 estorno de movimento manual / transferencia
create or replace function public.rv_mov_estornar(p_mov uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare m public.jsp_movimentacoes;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into m from public.jsp_movimentacoes where id = p_mov;
  if m.id is null then raise exception 'Movimento nao encontrado.'; end if;
  if m.estornada then raise exception 'Movimento ja estornado.'; end if;

  if m.origem in ('baixa_receita','baixa_despesa') then raise exception 'Use o estorno de baixa do lancamento.'; end if;
  if m.origem in ('baixa_oc') then raise exception 'Use o estorno da baixa da O.C.'; end if;
  if m.origem in ('pagamento_fatura','fechamento_fatura') then
    raise exception 'Use o estorno do pagamento da fatura.';
  end if;
  if m.origem = 'compra_cartao' then raise exception 'Estorne a compra pelo lancamento da despesa.'; end if;

  if m.tipo in ('TRANSFERENCIA_SAIDA','TRANSFERENCIA_ENTRADA') and m.grupo is not null then
    insert into public.jsp_movimentacoes(conta_id, conta_destino_id, tipo, valor, data, descricao, origem, grupo, estorno_de_id, created_by)
    select x.conta_id, x.conta_destino_id,
           case when x.tipo = 'TRANSFERENCIA_SAIDA' then 'TRANSFERENCIA_ENTRADA' else 'TRANSFERENCIA_SAIDA' end,
           x.valor, current_date, 'Estorno: ' || coalesce(x.descricao,''), 'estorno', x.grupo, x.id,
           coalesce(auth.jwt()->>'email','')
      from public.jsp_movimentacoes x
     where x.grupo = m.grupo and x.estornada = false;
    update public.jsp_movimentacoes set estornada = true where grupo = m.grupo;
  else
    insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, origem, estorno_de_id, created_by)
    values (m.conta_id,
            case when m.tipo in ('ENTRADA','TRANSFERENCIA_ENTRADA','AJUSTE_ENTRADA','PAGAMENTO_FATURA') then 'SAIDA' else 'ENTRADA' end,
            m.valor, current_date, 'Estorno: ' || coalesce(m.descricao,''), 'estorno', m.id,
            coalesce(auth.jwt()->>'email',''));
    update public.jsp_movimentacoes set estornada = true where id = m.id;
  end if;
end;
$function$;

-- 6.5 garante (cria se nao existir) a fatura do ciclo de uma compra
create or replace function public.rv_fatura_garantir(p_conta uuid, p_data date)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_fech int; v_venc int;
  v_base date; v_comp_mes date; v_venc_mes date;
  v_last int; v_fech_data date; v_venc_data date;
  v_comp text; v_id uuid;
begin
  select dia_fechamento, dia_vencimento into v_fech, v_venc from public.jsp_contas where id = p_conta;
  if v_fech is null then v_fech := 1; end if;
  if v_venc is null then v_venc := 10; end if;

  v_base := date_trunc('month', coalesce(p_data, current_date))::date;
  if extract(day from coalesce(p_data, current_date))::int <= v_fech then
    v_comp_mes := v_base;
  else
    v_comp_mes := (v_base + interval '1 month')::date;
  end if;

  v_last := extract(day from (v_comp_mes + interval '1 month - 1 day'))::int;
  v_fech_data := make_date(extract(year from v_comp_mes)::int, extract(month from v_comp_mes)::int, least(v_fech, v_last));

  v_venc_mes := (v_comp_mes + interval '1 month')::date;
  v_last := extract(day from (v_venc_mes + interval '1 month - 1 day'))::int;
  v_venc_data := make_date(extract(year from v_venc_mes)::int, extract(month from v_venc_mes)::int, least(v_venc, v_last));

  v_comp := to_char(v_comp_mes, 'YYYY-MM');

  select id into v_id from public.jsp_faturas where conta_id = p_conta and competencia = v_comp;
  if v_id is null then
    insert into public.jsp_faturas(conta_id, competencia, data_fechamento, data_vencimento, valor_total, status)
    values (p_conta, v_comp, v_fech_data, v_venc_data, 0, 'ABERTA')
    returning id into v_id;
  end if;
  return v_id;
end;
$function$;

-- 6.6 registra compra no cartao de credito
create or replace function public.rv_cartao_compra(p_uid uuid, p_conta uuid, p_data date default null)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  l public.jsp_logs;
  v_fat uuid;
  v_tipo text;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into l from public.jsp_logs where uid = p_uid;
  if l.uid is null then raise exception 'Lancamento nao encontrado.'; end if;
  select tipo into v_tipo from public.jsp_contas where id = p_conta;
  if v_tipo is distinct from 'cartao_credito' then raise exception 'Conta selecionada nao e cartao de credito.'; end if;

  v_fat := public.rv_fatura_garantir(p_conta, coalesce(p_data, l.data::date, current_date));

  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, categoria, obra_id, log_uid, fatura_id, origem, created_by)
  values (p_conta, 'COMPRA_CARTAO', coalesce(l.valor_total,0), coalesce(p_data, l.data::date, current_date),
          l.produto_nome, l.categoria, l.obra_id, p_uid, v_fat, 'compra_cartao', coalesce(auth.jwt()->>'email',''));

  update public.jsp_logs
     set eh_cartao = true, conta_id = p_conta, fatura_id = v_fat, status_financeiro = 'PENDENTE'
   where uid = p_uid;

  update public.jsp_faturas f
     set valor_total = (select coalesce(sum(m.valor),0) from public.jsp_movimentacoes m
                         where m.fatura_id = f.id and m.tipo = 'COMPRA_CARTAO' and m.estornada = false)
   where f.id = v_fat;

  return v_fat;
end;
$function$;

-- 6.7 recalcula total de uma fatura
create or replace function public.rv_fatura_recalcular(p_fatura uuid)
returns numeric
language sql
security definer
set search_path to 'public'
as $function$
  update public.jsp_faturas f
     set valor_total = (select coalesce(sum(m.valor),0) from public.jsp_movimentacoes m
                         where m.fatura_id = f.id and m.tipo = 'COMPRA_CARTAO' and m.estornada = false)
   where f.id = p_fatura
   returning valor_total;
$function$;

-- 6.8 fecha fatura
create or replace function public.rv_fatura_fechar(p_fatura uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  perform public.rv_fatura_recalcular(p_fatura);
  update public.jsp_faturas set status = 'FECHADA' where id = p_fatura and status = 'ABERTA';
end;
$function$;

-- 6.9 paga fatura
create or replace function public.rv_fatura_pagar(p_fatura uuid, p_conta_pagamento uuid, p_data date default current_date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  f public.jsp_faturas;
  v_total numeric;
  v_mov uuid;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into f from public.jsp_faturas where id = p_fatura;
  if f.id is null then raise exception 'Fatura nao encontrada.'; end if;
  if f.status = 'PAGA' then raise exception 'Fatura ja paga.'; end if;
  if f.status = 'CANCELADA' then raise exception 'Fatura cancelada.'; end if;

  v_total := public.rv_fatura_recalcular(p_fatura);
  if coalesce(v_total,0) <= 0 then raise exception 'Fatura sem lancamentos.'; end if;

  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, fatura_id, origem, created_by)
  values (f.conta_id, 'PAGAMENTO_FATURA', v_total, coalesce(p_data,current_date),
          'Pagamento fatura ' || f.competencia, p_fatura, 'fechamento_fatura', coalesce(auth.jwt()->>'email',''))
  returning id into v_mov;

  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, fatura_id, origem, created_by)
  values (p_conta_pagamento, 'SAIDA', v_total, coalesce(p_data,current_date),
          'Pagamento fatura cartao ' || f.competencia, p_fatura, 'pagamento_fatura', coalesce(auth.jwt()->>'email',''));

  update public.jsp_faturas
     set status = 'PAGA', pago_em = coalesce(p_data,current_date), conta_pagamento_id = p_conta_pagamento,
         valor_total = v_total, mov_pagamento_id = v_mov
   where id = p_fatura;

  update public.jsp_logs
     set status_financeiro = 'PAGO', liquidado_em = now()
   where fatura_id = p_fatura and eh_cartao = true and status_financeiro <> 'CANCELADO';
end;
$function$;

-- 6.10 estorna pagamento de fatura
create or replace function public.rv_fatura_estornar_pagamento(p_fatura uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare f public.jsp_faturas;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into f from public.jsp_faturas where id = p_fatura;
  if f.id is null then raise exception 'Fatura nao encontrada.'; end if;
  if f.status <> 'PAGA' then raise exception 'Fatura nao esta paga.'; end if;

  -- lancamentos inversos (cancela o efeito no saldo; nunca apaga)
  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, fatura_id, origem, estorno_de_id, created_by)
  select x.conta_id,
         case when x.tipo = 'PAGAMENTO_FATURA' then 'SAIDA' else 'ENTRADA' end,
         x.valor, current_date, 'Estorno: ' || coalesce(x.descricao,''), p_fatura, 'estorno', x.id,
         coalesce(auth.jwt()->>'email','')
    from public.jsp_movimentacoes x
   where x.fatura_id = p_fatura and x.origem in ('fechamento_fatura','pagamento_fatura') and x.estornada = false;

  update public.jsp_movimentacoes m
     set estornada = true
   where m.fatura_id = p_fatura and m.origem in ('fechamento_fatura','pagamento_fatura') and m.estornada = false;

  update public.jsp_faturas
     set status = 'FECHADA', pago_em = null, mov_pagamento_id = null
   where id = p_fatura;

  update public.jsp_logs
     set status_financeiro = 'PENDENTE', liquidado_em = null
   where fatura_id = p_fatura and eh_cartao = true and status_financeiro <> 'CANCELADO';
end;
$function$;

-- 6.10b estorna (cancela) uma compra no cartao, mantendo o lancamento
create or replace function public.rv_estornar_compra_cartao(p_uid uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare m public.jsp_movimentacoes; f public.jsp_faturas;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into m from public.jsp_movimentacoes
   where log_uid = p_uid and origem = 'compra_cartao' and estornada = false
   order by created_at desc limit 1;
  if m.id is null then raise exception 'Nenhuma compra no cartao encontrada.'; end if;

  if m.fatura_id is not null then
    select * into f from public.jsp_faturas where id = m.fatura_id;
    if f.status = 'PAGA' then raise exception 'Fatura ja paga. Estorne o pagamento da fatura antes.'; end if;
  end if;

  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, fatura_id, origem, log_uid, estorno_de_id, created_by)
  values (m.conta_id, 'ENTRADA', m.valor, current_date, 'Estorno compra cartao', m.fatura_id, 'estorno', p_uid, m.id,
          coalesce(auth.jwt()->>'email',''));
  update public.jsp_movimentacoes set estornada = true where id = m.id;

  update public.jsp_logs set eh_cartao = false, fatura_id = null, status_financeiro = 'PENDENTE', liquidado_em = null
   where uid = p_uid;

  if m.fatura_id is not null then
    perform public.rv_fatura_recalcular(m.fatura_id);
  end if;
end;
$function$;

-- 6.11 baixa de receita/despesa com conta
create or replace function public.rv_baixar_lancamento(p_uid uuid, p_conta uuid, p_data date default current_date)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  l public.jsp_logs; v_tipo text; v_origem text; v_id uuid;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into l from public.jsp_logs where uid = p_uid;
  if l.uid is null then raise exception 'Lancamento nao encontrado.'; end if;
  if l.status_financeiro = 'PAGO' then raise exception 'Lancamento ja baixado.'; end if;
  if l.status_financeiro = 'CANCELADO' then raise exception 'Lancamento cancelado.'; end if;
  if l.eh_cartao then raise exception 'Despesa no cartao: a baixa acontece no pagamento da fatura.'; end if;
  if p_conta is null then raise exception 'Selecione a conta.'; end if;

  if l.tipo = 'receita' then v_tipo := 'ENTRADA'; v_origem := 'baixa_receita';
  elsif l.tipo = 'despesa' then v_tipo := 'SAIDA'; v_origem := 'baixa_despesa';
  else raise exception 'Tipo de lancamento nao suportado.'; end if;

  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, categoria, obra_id, log_uid, origem, created_by)
  values (p_conta, v_tipo, coalesce(l.valor_total,0), coalesce(p_data,current_date),
          l.produto_nome, l.categoria, l.obra_id, p_uid, v_origem, coalesce(auth.jwt()->>'email',''))
  returning id into v_id;

  update public.jsp_logs
     set status_financeiro = 'PAGO', valor_pago = l.valor_total, conta_id = p_conta, liquidado_em = now()
   where uid = p_uid;

  return v_id;
end;
$function$;

-- 6.12 estorna baixa de receita/despesa
create or replace function public.rv_estornar_baixa(p_uid uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare l public.jsp_logs; m public.jsp_movimentacoes;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into l from public.jsp_logs where uid = p_uid;
  if l.uid is null then raise exception 'Lancamento nao encontrado.'; end if;
  if l.eh_cartao then raise exception 'Estorne o pagamento da fatura.'; end if;

  select * into m from public.jsp_movimentacoes
   where log_uid = p_uid and origem in ('baixa_receita','baixa_despesa') and estornada = false
   order by created_at desc limit 1;
  if m.id is null then raise exception 'Nenhuma baixa encontrada para estornar.'; end if;

  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, origem, log_uid, estorno_de_id, created_by)
  values (m.conta_id,
          case when m.tipo = 'ENTRADA' then 'SAIDA' else 'ENTRADA' end,
          m.valor, current_date, 'Estorno: ' || coalesce(m.descricao,''), 'estorno', p_uid, m.id,
          coalesce(auth.jwt()->>'email',''));

  update public.jsp_movimentacoes set estornada = true where id = m.id;
  update public.jsp_logs set status_financeiro = 'PENDENTE', valor_pago = null, liquidado_em = null where uid = p_uid;
end;
$function$;

-- 6.13 baixa de O.C. consolidada
create or replace function public.rv_baixar_oc(p_id text, p_conta uuid, p_data date default current_date)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_total numeric; v_id uuid; v_obra int;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_conta is null then raise exception 'Selecione a conta.'; end if;

  select coalesce(sum(valor_total),0), max(obra_id) into v_total, v_obra
    from public.jsp_logs where id = p_id and tipo = 'compra' and status_financeiro = 'PENDENTE';
  if coalesce(v_total,0) <= 0 then raise exception 'O.C. nao encontrada ou ja baixada.'; end if;

  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, obra_id, oc_id, origem, created_by)
  values (p_conta, 'SAIDA', v_total, coalesce(p_data,current_date), 'Baixa O.C. #' || p_id, v_obra, p_id, 'baixa_oc', coalesce(auth.jwt()->>'email',''))
  returning id into v_id;

  update public.jsp_logs set status_financeiro = 'PAGO', liquidado_em = now()
   where id = p_id and tipo = 'compra' and status_financeiro = 'PENDENTE';

  return v_id;
end;
$function$;

-- 6.14 estorna baixa de O.C.
create or replace function public.rv_estornar_baixa_oc(p_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare m public.jsp_movimentacoes;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into m from public.jsp_movimentacoes
   where oc_id = p_id and origem = 'baixa_oc' and estornada = false
   order by created_at desc limit 1;
  if m.id is null then raise exception 'Nenhuma baixa de O.C. encontrada.'; end if;

  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, obra_id, oc_id, origem, estorno_de_id, created_by)
  values (m.conta_id, 'ENTRADA', m.valor, current_date, 'Estorno baixa O.C. #' || p_id, m.obra_id, p_id, 'estorno', m.id,
          coalesce(auth.jwt()->>'email',''));

  update public.jsp_movimentacoes set estornada = true where id = m.id;
  update public.jsp_logs set status_financeiro = 'PENDENTE', liquidado_em = null
   where id = p_id and tipo = 'compra' and status_financeiro = 'PAGO';
end;
$function$;

grant execute on function public.rv_conta_saldo(uuid) to authenticated;
grant execute on function public.rv_ajuste(uuid, numeric, date, text) to authenticated;
grant execute on function public.rv_transferir(uuid, uuid, numeric, date, text) to authenticated;
grant execute on function public.rv_mov_estornar(uuid) to authenticated;
grant execute on function public.rv_fatura_garantir(uuid, date) to authenticated;
grant execute on function public.rv_cartao_compra(uuid, uuid, date) to authenticated;
grant execute on function public.rv_fatura_recalcular(uuid) to authenticated;
grant execute on function public.rv_fatura_fechar(uuid) to authenticated;
grant execute on function public.rv_fatura_pagar(uuid, uuid, date) to authenticated;
grant execute on function public.rv_fatura_estornar_pagamento(uuid) to authenticated;
grant execute on function public.rv_estornar_compra_cartao(uuid) to authenticated;
grant execute on function public.rv_baixar_lancamento(uuid, uuid, date) to authenticated;
grant execute on function public.rv_estornar_baixa(uuid) to authenticated;
grant execute on function public.rv_baixar_oc(text, uuid, date) to authenticated;
grant execute on function public.rv_estornar_baixa_oc(text) to authenticated;
