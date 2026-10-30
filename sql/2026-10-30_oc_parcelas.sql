-- 2026-10-30 - Parcelamento de Contas a Pagar originadas de Ordem de Compra (O.C.)
-- Escopo: apenas tabelas/funcoes com prefixo jsp_ ou rv_.
--
-- Modelo: a O.C. continua sendo as linhas de jsp_logs (tipo = 'compra'), sem
-- duplicar valores em compras/estoque/competencia. O parcelamento e um
-- cronograma em jsp_oc_parcelas usado apenas pelo Financeiro (Contas a Pagar).
-- Cada parcela paga gera um movimento de caixa (origem 'baixa_oc_parcela').
-- A O.C. so vira PAGO quando todas as parcelas estiverem pagas; estornar
-- qualquer parcela reabre a O.C.
--
-- Executar em transacao. Cria backup logico de jsp_logs/jsp_movimentacoes.

begin;

-- =====================================================================
-- 0) BACKUP LOGICO
-- =====================================================================
create schema if not exists jsp_bkp_20261030;

do $$
declare t text;
begin
  foreach t in array array['jsp_logs','jsp_movimentacoes']
  loop
    execute format('create table if not exists jsp_bkp_20261030.%I as table public.%I', t, t);
  end loop;
end $$;

-- =====================================================================
-- 1) TABELA DE PARCELAS DA O.C.
-- =====================================================================
create table if not exists public.jsp_oc_parcelas (
  id uuid primary key default gen_random_uuid(),
  oc_id text not null,
  numero integer not null,
  total_parcelas integer not null,
  vencimento date not null,
  valor numeric(14,2) not null,
  status text not null default 'PENDENTE',
  conta_id uuid,
  mov_id uuid,
  pago_em timestamp with time zone,
  observacao text,
  created_at timestamp with time zone not null default now(),
  created_by text,
  constraint jsp_oc_parcelas_status_chk check (status in ('PENDENTE','PAGO','CANCELADA')),
  constraint jsp_oc_parcelas_valor_chk check (valor > 0),
  constraint jsp_oc_parcelas_numero_chk check (numero >= 1 and numero <= total_parcelas),
  constraint jsp_oc_parcelas_total_chk check (total_parcelas >= 2 and total_parcelas <= 60),
  constraint jsp_oc_parcelas_oc_num_unq unique (oc_id, numero),
  constraint jsp_oc_parcelas_conta_fkey foreign key (conta_id) references public.jsp_contas(id) on delete restrict,
  constraint jsp_oc_parcelas_mov_fkey foreign key (mov_id) references public.jsp_movimentacoes(id) on delete set null
);

create index if not exists jsp_oc_parcelas_oc_idx on public.jsp_oc_parcelas(oc_id);
create index if not exists jsp_oc_parcelas_status_idx on public.jsp_oc_parcelas(status);
create index if not exists jsp_oc_parcelas_mov_idx on public.jsp_oc_parcelas(mov_id) where mov_id is not null;

alter table public.jsp_oc_parcelas enable row level security;

drop policy if exists jsp_oc_parcelas_sel_auth on public.jsp_oc_parcelas;
create policy jsp_oc_parcelas_sel_auth on public.jsp_oc_parcelas
  for select to authenticated using (public.jsp_pode_ler());

drop policy if exists jsp_oc_parcelas_ins_auth on public.jsp_oc_parcelas;
create policy jsp_oc_parcelas_ins_auth on public.jsp_oc_parcelas
  for insert to authenticated with check (public.jsp_pode_operar());

drop policy if exists jsp_oc_parcelas_upd_auth on public.jsp_oc_parcelas;
create policy jsp_oc_parcelas_upd_auth on public.jsp_oc_parcelas
  for update to authenticated using (public.jsp_pode_operar())
  with check (public.jsp_pode_operar());

drop policy if exists jsp_oc_parcelas_del_auth on public.jsp_oc_parcelas;
create policy jsp_oc_parcelas_del_auth on public.jsp_oc_parcelas
  for delete to authenticated using (public.jsp_pode_operar());

revoke all on table public.jsp_oc_parcelas from public, anon;
grant select, insert, update, delete on table public.jsp_oc_parcelas to authenticated;
grant all on table public.jsp_oc_parcelas to service_role;

comment on table public.jsp_oc_parcelas is 'Cronograma de parcelas das O.C. (Contas a Pagar). Nao substitui as linhas de jsp_logs da compra.';

-- =====================================================================
-- 2) PARCELAR O.C.
-- =====================================================================
create or replace function public.rv_oc_parcelar(
  p_oc_id text,
  p_parcelas jsonb,
  p_obs text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id text := btrim(coalesce(p_oc_id, ''));
  v_total numeric;
  v_pend numeric;
  v_obra int;
  v_cartao boolean;
  v_fatura boolean;
  v_n int;
  v_i int := 0;
  v_item jsonb;
  v_valor numeric;
  v_venc date;
  v_soma numeric := 0;
  v_obs text := nullif(btrim(coalesce(p_obs, '')), '');
  v_ids jsonb := '[]'::jsonb;
  v_new_id uuid;
  v_max int;
begin
  if not public.jsp_pode_operar() then
    raise exception 'Sem permissao para operar.';
  end if;
  if v_id = '' then
    raise exception 'O.C. invalida.';
  end if;

  select coalesce(sum(valor_total), 0),
         coalesce(sum(valor_total) filter (where status_financeiro = 'PENDENTE'), 0),
         max(obra_id),
         coalesce(bool_or(eh_cartao), false),
         coalesce(bool_or(fatura_id is not null), false)
    into v_total, v_pend, v_obra, v_cartao, v_fatura
    from public.jsp_logs
   where id::text = v_id and tipo = 'compra' and status_financeiro <> 'CANCELADO';

  if v_total is null or v_total <= 0 then
    raise exception 'O.C. nao encontrada ou cancelada.';
  end if;
  if v_pend <> v_total then
    raise exception 'Apenas O.C. totalmente pendentes podem ser parceladas.';
  end if;
  if v_cartao then
    raise exception 'O.C. no cartao de credito deve ser parcelada na fatura.';
  end if;
  if v_fatura then
    raise exception 'Esta O.C. ja esta vinculada a uma fatura.';
  end if;

  if exists (
    select 1 from public.jsp_logs
     where id::text = v_id and tipo = 'compra'
       and upper(coalesce(forma_pagamento, '')) like '%CART%'
  ) then
    raise exception 'O.C. com forma de pagamento cartao deve ser parcelada na fatura.';
  end if;

  if exists (
    select 1 from public.jsp_oc_parcelas
     where oc_id = v_id and status <> 'CANCELADA'
  ) then
    raise exception 'Esta O.C. ja esta parcelada.';
  end if;

  if exists (
    select 1 from public.jsp_movimentacoes
     where oc_id = v_id and estornada = false
       and origem in ('baixa_oc', 'baixa_oc_parcela')
  ) then
    raise exception 'O.C. ja possui baixa financeira. Estorne antes de parcelar.';
  end if;

  if p_parcelas is null or jsonb_typeof(p_parcelas) <> 'array' then
    raise exception 'Parcelas invalidas.';
  end if;

  v_n := jsonb_array_length(p_parcelas);
  if v_n < 2 then
    raise exception 'Informe ao menos 2 parcelas.';
  end if;
  if v_n > 60 then
    raise exception 'O limite e de 60 parcelas.';
  end if;

  for v_item in select value from jsonb_array_elements(p_parcelas) loop
    v_i := v_i + 1;
    begin
      v_valor := round((v_item ->> 'valor')::numeric, 2);
    exception when others then
      raise exception 'Valor invalido na parcela %.', v_i;
    end;
    begin
      v_venc := (v_item ->> 'vencimento')::date;
    exception when others then
      raise exception 'Vencimento invalido na parcela %.', v_i;
    end;
    if v_valor is null or v_valor <= 0 then
      raise exception 'Valor invalido na parcela %.', v_i;
    end if;
    if v_venc is null then
      raise exception 'Vencimento invalido na parcela %.', v_i;
    end if;
    v_soma := v_soma + v_valor;
  end loop;

  if abs(v_soma - v_total) > 0.01 then
    raise exception 'A soma das parcelas (R$ %) difere do total da O.C. (R$ %).',
      to_char(v_soma, 'FM999999990D00'),
      to_char(v_total, 'FM999999990D00');
  end if;

  perform pg_advisory_xact_lock(hashtext('jsp_oc_parcelas:' || v_id));
  select coalesce(max(numero), 0) into v_max
    from public.jsp_oc_parcelas where oc_id = v_id;

  v_i := 0;
  for v_item in select value from jsonb_array_elements(p_parcelas) loop
    v_i := v_i + 1;
    v_valor := round((v_item ->> 'valor')::numeric, 2);
    v_venc := (v_item ->> 'vencimento')::date;

    insert into public.jsp_oc_parcelas(
      oc_id, numero, total_parcelas, vencimento, valor, status, observacao, created_by
    ) values (
      v_id, v_max + v_i, v_n, v_venc, v_valor, 'PENDENTE', v_obs,
      coalesce(auth.jwt() ->> 'email', '')
    ) returning id into v_new_id;

    v_ids := v_ids || to_jsonb(v_new_id);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'oc_id', v_id,
    'parcelas', v_n,
    'total', v_total,
    'ids', v_ids
  );
end;
$function$;

revoke all on function public.rv_oc_parcelar(text, jsonb, text) from public, anon;
grant execute on function public.rv_oc_parcelar(text, jsonb, text) to authenticated, service_role;

-- =====================================================================
-- 3) PAGAR UMA PARCELA
-- =====================================================================
create or replace function public.rv_oc_parcela_pagar(
  p_parcela uuid,
  p_conta uuid,
  p_data date default current_date
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_parc public.jsp_oc_parcelas;
  v_mov uuid;
  v_obra int;
  v_obra_conta int;
  v_tipo_conta text;
  v_categoria text;
  v_restantes int;
begin
  if not public.jsp_pode_operar() then
    raise exception 'Sem permissao para operar.';
  end if;
  if p_parcela is null then
    raise exception 'Parcela invalida.';
  end if;
  if p_conta is null then
    raise exception 'Selecione a conta.';
  end if;

  select * into v_parc from public.jsp_oc_parcelas where id = p_parcela for update;
  if v_parc.id is null then
    raise exception 'Parcela nao encontrada.';
  end if;
  if v_parc.status = 'PAGO' then
    raise exception 'Parcela ja paga.';
  end if;
  if v_parc.status = 'CANCELADA' then
    raise exception 'Parcela cancelada.';
  end if;

  select max(obra_id), max(categoria)
    into v_obra, v_categoria
    from public.jsp_logs
   where id::text = v_parc.oc_id and tipo = 'compra' and status_financeiro <> 'CANCELADO';
  if v_obra is null and not exists (
    select 1 from public.jsp_logs
     where id::text = v_parc.oc_id and tipo = 'compra' and status_financeiro <> 'CANCELADO'
  ) then
    raise exception 'O.C. da parcela nao encontrada ou cancelada.';
  end if;

  select obra_id, tipo into v_obra_conta, v_tipo_conta
    from public.jsp_contas where id = p_conta;
  if v_tipo_conta is null then
    raise exception 'Conta nao encontrada.';
  end if;
  if v_tipo_conta = 'cartao_credito' then
    raise exception 'Use o pagamento da fatura para o cartao.';
  end if;
  if v_obra is not null and v_obra_conta is not null and v_obra <> v_obra_conta then
    raise exception 'A conta selecionada pertence a outra obra.';
  end if;

  insert into public.jsp_movimentacoes(
    conta_id, tipo, valor, data, descricao, categoria, obra_id, oc_id, origem, created_by
  ) values (
    p_conta, 'SAIDA', v_parc.valor, coalesce(p_data, current_date),
    'O.C. #' || v_parc.oc_id || ' parcela ' || v_parc.numero || '/' || v_parc.total_parcelas,
    v_categoria, v_obra, v_parc.oc_id, 'baixa_oc_parcela',
    coalesce(auth.jwt() ->> 'email', '')
  ) returning id into v_mov;

  update public.jsp_oc_parcelas
     set status = 'PAGO', conta_id = p_conta, mov_id = v_mov, pago_em = now()
   where id = p_parcela;

  select count(*) into v_restantes
    from public.jsp_oc_parcelas
   where oc_id = v_parc.oc_id and status = 'PENDENTE';

  if v_restantes = 0 then
    update public.jsp_logs
       set status_financeiro = 'PAGO', valor_pago = valor_total,
           conta_id = p_conta, liquidado_em = now()
     where id::text = v_parc.oc_id and tipo = 'compra'
       and status_financeiro = 'PENDENTE';
  end if;

  return v_mov;
end;
$function$;

revoke all on function public.rv_oc_parcela_pagar(uuid, uuid, date) from public, anon;
grant execute on function public.rv_oc_parcela_pagar(uuid, uuid, date) to authenticated, service_role;

-- =====================================================================
-- 4) ESTORNAR UMA PARCELA PAGA
-- =====================================================================
create or replace function public.rv_oc_parcela_estornar(p_parcela uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_parc public.jsp_oc_parcelas;
  v_mov public.jsp_movimentacoes;
begin
  if not public.jsp_pode_operar() then
    raise exception 'Sem permissao para operar.';
  end if;
  if p_parcela is null then
    raise exception 'Parcela invalida.';
  end if;

  select * into v_parc from public.jsp_oc_parcelas where id = p_parcela for update;
  if v_parc.id is null then
    raise exception 'Parcela nao encontrada.';
  end if;
  if v_parc.status <> 'PAGO' then
    raise exception 'Apenas parcelas pagas podem ser estornadas.';
  end if;

  select * into v_mov from public.jsp_movimentacoes where id = v_parc.mov_id;
  if v_mov.id is null then
    raise exception 'Movimento da parcela nao encontrado.';
  end if;
  if v_mov.estornada then
    raise exception 'Movimento da parcela ja estornado.';
  end if;

  insert into public.jsp_movimentacoes(
    conta_id, tipo, valor, data, descricao, categoria, obra_id, oc_id, origem, estorno_de_id, created_by
  ) values (
    v_mov.conta_id, 'ENTRADA', v_mov.valor, current_date,
    'Estorno O.C. #' || v_parc.oc_id || ' parcela ' || v_parc.numero || '/' || v_parc.total_parcelas,
    v_mov.categoria, v_mov.obra_id, v_parc.oc_id, 'estorno', v_mov.id,
    coalesce(auth.jwt() ->> 'email', '')
  );

  update public.jsp_movimentacoes set estornada = true where id = v_mov.id;

  update public.jsp_oc_parcelas
     set status = 'PENDENTE', conta_id = null, mov_id = null, pago_em = null
   where id = p_parcela;

  update public.jsp_logs
     set status_financeiro = 'PENDENTE', liquidado_em = null
   where id::text = v_parc.oc_id and tipo = 'compra'
     and status_financeiro = 'PAGO';
end;
$function$;

revoke all on function public.rv_oc_parcela_estornar(uuid) from public, anon;
grant execute on function public.rv_oc_parcela_estornar(uuid) to authenticated, service_role;

-- =====================================================================
-- 5) DESFAZER O PARCELAMENTO (somente sem parcelas pagas)
-- =====================================================================
create or replace function public.rv_oc_desparcelar(p_oc_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id text := btrim(coalesce(p_oc_id, ''));
  v_n int := 0;
begin
  if not public.jsp_pode_operar() then
    raise exception 'Sem permissao para operar.';
  end if;
  if v_id = '' then
    raise exception 'O.C. invalida.';
  end if;

  if not exists (
    select 1 from public.jsp_oc_parcelas
     where oc_id = v_id and status <> 'CANCELADA'
  ) then
    raise exception 'Esta O.C. nao esta parcelada.';
  end if;

  if exists (
    select 1 from public.jsp_oc_parcelas
     where oc_id = v_id and status = 'PAGO'
  ) then
    raise exception 'Existem parcelas pagas. Estorne as parcelas antes de desfazer o parcelamento.';
  end if;

  update public.jsp_oc_parcelas
     set status = 'CANCELADA'
   where oc_id = v_id and status = 'PENDENTE';
  get diagnostics v_n = row_count;

  return jsonb_build_object('ok', true, 'oc_id', v_id, 'canceladas', v_n);
end;
$function$;

revoke all on function public.rv_oc_desparcelar(text) from public, anon;
grant execute on function public.rv_oc_desparcelar(text) to authenticated, service_role;

-- =====================================================================
-- 6) AJUSTES NAS FUNCOES EXISTENTES
-- =====================================================================
-- 6.1 Baixa avulsa da O.C.: bloquear quando parcelada.
create or replace function public.rv_baixar_oc(p_id text, p_conta uuid, p_data date default current_date)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_total numeric; v_id uuid; v_obra int; v_obra_conta int; v_tipo_conta text;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_conta is null then raise exception 'Selecione a conta.'; end if;

  if exists (
    select 1 from public.jsp_oc_parcelas
     where oc_id = p_id and status <> 'CANCELADA'
  ) then
    raise exception 'O.C. parcelada: baixe as parcelas individualmente.';
  end if;

  select coalesce(sum(valor_total),0), max(obra_id) into v_total, v_obra
    from public.jsp_logs where id::text = p_id and tipo = 'compra' and status_financeiro = 'PENDENTE';
  if coalesce(v_total,0) <= 0 then raise exception 'O.C. nao encontrada ou ja baixada.'; end if;

  select obra_id, tipo into v_obra_conta, v_tipo_conta from public.jsp_contas where id = p_conta;
  if v_tipo_conta is null then raise exception 'Conta nao encontrada.'; end if;
  if v_tipo_conta = 'cartao_credito' then raise exception 'Use o pagamento da fatura para o cartao.'; end if;
  if v_obra is not null and v_obra_conta is not null and v_obra <> v_obra_conta then
    raise exception 'A conta selecionada pertence a outra obra.';
  end if;

  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, obra_id, oc_id, origem, created_by)
  values (p_conta, 'SAIDA', v_total, coalesce(p_data,current_date), 'Baixa O.C. #' || p_id, v_obra, p_id, 'baixa_oc', coalesce(auth.jwt()->>'email',''))
  returning id into v_id;

  update public.jsp_logs set status_financeiro = 'PAGO', liquidado_em = now()
   where id::text = p_id and tipo = 'compra' and status_financeiro = 'PENDENTE';

  return v_id;
end;
$function$;

revoke all on function public.rv_baixar_oc(text, uuid, date) from public, anon;
grant execute on function public.rv_baixar_oc(text, uuid, date) to authenticated, service_role;

-- 6.2 Compra de O.C. no cartao: bloquear quando parcelada.
create or replace function public.rv_cartao_compra_oc(p_id text, p_conta uuid, p_data date default current_date)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tipo text;
  v_obra int;
  v_oc_obra int;
  r record;
  v_qtd int := 0;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_conta is null then raise exception 'Selecione o cartao.'; end if;

  if exists (
    select 1 from public.jsp_oc_parcelas
     where oc_id = p_id and status <> 'CANCELADA'
  ) then
    raise exception 'O.C. parcelada: desfaca o parcelamento antes de lancar no cartao.';
  end if;

  select tipo, obra_id into v_tipo, v_obra from public.jsp_contas where id = p_conta;
  if v_tipo is distinct from 'cartao_credito' then raise exception 'Conta selecionada nao e cartao de credito.'; end if;

  select max(obra_id) into v_oc_obra
    from public.jsp_logs
   where id::text = p_id and tipo in ('oc_pendente','compra') and status_financeiro <> 'CANCELADO';

  if v_oc_obra is null then raise exception 'O.C. nao encontrada.'; end if;
  if v_obra is not null and v_oc_obra is not null and v_obra <> v_oc_obra then
    raise exception 'O cartao selecionado pertence a outra obra.';
  end if;

  update public.jsp_logs
     set tipo = 'compra', forma_pagamento = 'Cartão de Crédito', status_financeiro = 'PENDENTE'
   where id::text = p_id and tipo in ('oc_pendente','compra') and status_financeiro <> 'CANCELADO';

  for r in
    select uid from public.jsp_logs
     where id::text = p_id and tipo = 'compra' and status_financeiro = 'PENDENTE' and eh_cartao is not true
  loop
    perform public.rv_cartao_compra(r.uid, p_conta, p_data);
    v_qtd := v_qtd + 1;
  end loop;

  return v_qtd;
end;
$function$;

revoke all on function public.rv_cartao_compra_oc(text, uuid, date) from public, anon;
grant execute on function public.rv_cartao_compra_oc(text, uuid, date) to authenticated, service_role;

-- 6.3 Baixa em lote: aceita parcelas de O.C. e bloqueia O.C. parcelada.
create or replace function public.rv_baixar_multiplo(p_itens jsonb, p_conta uuid, p_data date default current_date, p_obs text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lote uuid := gen_random_uuid();
  v_item jsonb;
  v_tipo text;
  v_id text;
  v_uid uuid;
  v_mov uuid;
  v_total numeric;
  v_obra int;
  v_obra_ref int := null;
  v_conta_obra int;
  v_conta_tipo text;
  v_status text;
  v_oc text;
  v_desc text := coalesce(nullif(btrim(p_obs), ''), 'Pagamento em lote');
  v_res jsonb := '[]'::jsonb;
  v_pagos int := 0;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_conta is null then raise exception 'Selecione a conta.'; end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nenhum titulo selecionado.';
  end if;

  select obra_id, tipo into v_conta_obra, v_conta_tipo from public.jsp_contas where id = p_conta;
  if v_conta_tipo is null then raise exception 'Conta nao encontrada.'; end if;
  if v_conta_tipo = 'cartao_credito' then raise exception 'Use o pagamento da fatura para o cartao.'; end if;

  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_tipo := coalesce(v_item->>'tipo', '');
    v_id   := v_item->>'id';

    if v_tipo = 'oc' then
      if exists (
        select 1 from public.jsp_oc_parcelas
         where oc_id = v_id and status <> 'CANCELADA'
      ) then
        v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', false, 'erro', 'O.C. parcelada: pague as parcelas');
        continue;
      end if;

      select coalesce(sum(valor_total),0), max(obra_id)
        into v_total, v_obra
        from public.jsp_logs
       where id::text = v_id and tipo = 'compra' and status_financeiro = 'PENDENTE';

      if coalesce(v_total,0) <= 0 then
        v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', false, 'erro', 'O.C. nao encontrada ou ja baixada');
        continue;
      end if;

      if v_obra is not null then
        if v_obra_ref is null then v_obra_ref := v_obra;
        elsif v_obra_ref <> v_obra then raise exception 'Selecione titulos de uma unica obra.'; end if;
      end if;

      insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, obra_id, oc_id, origem, lote_id, created_by)
      values (p_conta, 'SAIDA', v_total, coalesce(p_data, current_date),
              v_desc || ' - O.C. #' || v_id, v_obra, v_id, 'baixa_oc', v_lote,
              coalesce(auth.jwt()->>'email',''));

      update public.jsp_logs
         set status_financeiro = 'PAGO', liquidado_em = now(), conta_id = p_conta
       where id::text = v_id and tipo = 'compra' and status_financeiro = 'PENDENTE';

      v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', true, 'valor', v_total);
      v_pagos := v_pagos + 1;

    elsif v_tipo = 'oc_parcela' then
      begin
        v_uid := v_id::uuid;
      exception when others then
        v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', false, 'erro', 'Identificador invalido');
        continue;
      end;

      select p.valor, p.status, p.oc_id
        into v_total, v_status, v_oc
        from public.jsp_oc_parcelas p
       where p.id = v_uid;

      if v_total is null then
        v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', false, 'erro', 'Parcela nao encontrada');
        continue;
      end if;
      if v_status <> 'PENDENTE' then
        v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', false, 'erro', 'Parcela nao esta pendente');
        continue;
      end if;

      select max(obra_id) into v_obra
        from public.jsp_logs
       where id::text = v_oc and tipo = 'compra';
      if v_obra is not null then
        if v_obra_ref is null then v_obra_ref := v_obra;
        elsif v_obra_ref <> v_obra then raise exception 'Selecione titulos de uma unica obra.'; end if;
      end if;

      begin
        perform public.rv_oc_parcela_pagar(v_uid, p_conta, coalesce(p_data, current_date));
        update public.jsp_movimentacoes mv
           set lote_id = v_lote
          from public.jsp_oc_parcelas p
         where p.id = v_uid and mv.id = p.mov_id;
      exception when others then
        v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', false, 'erro', sqlerrm);
        continue;
      end;

      v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', true, 'valor', v_total);
      v_pagos := v_pagos + 1;

    elsif v_tipo = 'lancamento' then
      begin
        v_uid := v_id::uuid;
      exception when others then
        v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', false, 'erro', 'Identificador invalido');
        continue;
      end;

      select l.valor_total, l.obra_id into v_total, v_obra
        from public.jsp_logs l
       where l.uid = v_uid
         and l.status_financeiro = 'PENDENTE'
         and l.eh_cartao is not true;

      if v_total is null then
        v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', false, 'erro', 'Lancamento nao encontrado, ja baixado ou no cartao');
        continue;
      end if;

      if v_obra is not null then
        if v_obra_ref is null then v_obra_ref := v_obra;
        elsif v_obra_ref <> v_obra then raise exception 'Selecione titulos de uma unica obra.'; end if;
      end if;

      insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, categoria, obra_id, log_uid, origem, lote_id, created_by)
      select p_conta,
             case when l.tipo = 'receita' then 'ENTRADA' else 'SAIDA' end,
             coalesce(l.valor_total,0), coalesce(p_data, current_date),
             l.produto_nome, l.categoria, l.obra_id, v_uid,
             case when l.tipo = 'receita' then 'baixa_receita' else 'baixa_despesa' end,
             v_lote, coalesce(auth.jwt()->>'email','')
        from public.jsp_logs l where l.uid = v_uid;

      update public.jsp_logs
         set status_financeiro = 'PAGO', valor_pago = valor_total, conta_id = p_conta, liquidado_em = now()
       where uid = v_uid and status_financeiro = 'PENDENTE';

      v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', true, 'valor', v_total);
      v_pagos := v_pagos + 1;

    else
      v_res := v_res || jsonb_build_object('tipo', v_tipo, 'id', v_id, 'ok', false, 'erro', 'Tipo desconhecido');
    end if;
  end loop;

  if v_obra_ref is not null and v_conta_obra is not null and v_obra_ref <> v_conta_obra then
    raise exception 'A conta pagadora pertence a outra obra.';
  end if;

  return jsonb_build_object('lote_id', v_lote, 'pagos', v_pagos, 'itens', v_res);
end;
$function$;

revoke all on function public.rv_baixar_multiplo(jsonb, uuid, date, text) from public, anon;
grant execute on function public.rv_baixar_multiplo(jsonb, uuid, date, text) to authenticated, service_role;

-- 6.4 Estorno de lote: reverte tambem parcelas de O.C.
create or replace function public.rv_estornar_lote(p_lote uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m public.jsp_movimentacoes;
  v_n int := 0;
  v_ocs text[] := '{}';
  v_oc text;
  v_tem_pago boolean;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_lote is null then raise exception 'Lote invalido.'; end if;

  for m in
    select * from public.jsp_movimentacoes
     where lote_id = p_lote and estornada = false
       and origem in ('baixa_oc','baixa_oc_parcela','baixa_receita','baixa_despesa')
     order by created_at
  loop
    insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, categoria, obra_id, oc_id, log_uid, origem, estorno_de_id, created_by)
    values (m.conta_id,
            case when m.tipo = 'ENTRADA' then 'SAIDA' else 'ENTRADA' end,
            m.valor, current_date, 'Estorno lote: ' || coalesce(m.descricao,''), m.categoria,
            m.obra_id, m.oc_id, m.log_uid, 'estorno', m.id, coalesce(auth.jwt()->>'email',''));

    update public.jsp_movimentacoes set estornada = true where id = m.id;

    if m.origem = 'baixa_oc_parcela' then
      update public.jsp_oc_parcelas
         set status = 'PENDENTE', conta_id = null, mov_id = null, pago_em = null
       where mov_id = m.id;
      if m.oc_id is not null and not (m.oc_id = any(v_ocs)) then
        v_ocs := v_ocs || m.oc_id;
      end if;
    elsif m.oc_id is not null then
      update public.jsp_logs set status_financeiro = 'PENDENTE', liquidado_em = null
       where id::text = m.oc_id and tipo = 'compra' and status_financeiro = 'PAGO';
    elsif m.log_uid is not null then
      update public.jsp_logs set status_financeiro = 'PENDENTE', valor_pago = null, liquidado_em = null
       where uid = m.log_uid and status_financeiro = 'PAGO';
    end if;

    v_n := v_n + 1;
  end loop;

  foreach v_oc in array v_ocs loop
    select exists (
      select 1 from public.jsp_oc_parcelas
       where oc_id = v_oc and status = 'PAGO'
    ) into v_tem_pago;
    if not v_tem_pago then
      update public.jsp_logs set status_financeiro = 'PENDENTE', liquidado_em = null
       where id::text = v_oc and tipo = 'compra' and status_financeiro = 'PAGO';
    end if;
  end loop;

  return jsonb_build_object('lote_id', p_lote, 'estornados', v_n);
end;
$function$;

revoke all on function public.rv_estornar_lote(uuid) from public, anon;
grant execute on function public.rv_estornar_lote(uuid) to authenticated, service_role;

-- 6.5 Estorno generico de movimento: parcelas delegam ao estorno da parcela.
create or replace function public.rv_mov_estornar(p_mov uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m public.jsp_movimentacoes;
  v_parc public.jsp_oc_parcelas;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into m from public.jsp_movimentacoes where id = p_mov;
  if m.id is null then raise exception 'Movimento nao encontrado.'; end if;
  if m.estornada then raise exception 'Movimento ja estornado.'; end if;

  if m.origem = 'baixa_oc_parcela' then
    select * into v_parc from public.jsp_oc_parcelas where mov_id = m.id;
    if v_parc.id is null then raise exception 'Parcela da O.C. nao encontrada.'; end if;
    perform public.rv_oc_parcela_estornar(v_parc.id);
    return;
  end if;

  if m.origem in ('baixa_receita','baixa_despesa') then raise exception 'Use o estorno de baixa do lancamento.'; end if;
  if m.origem in ('baixa_oc') then raise exception 'Use o estorno da baixa da O.C.'; end if;
  if m.origem in ('pagamento_fatura','fechamento_fatura') then
    raise exception 'Use o estorno do pagamento da fatura.';
  end if;
  if m.origem = 'compra_cartao' then raise exception 'Estorne a compra pelo lancamento da despesa.'; end if;

  if m.tipo in ('TRANSFERENCIA_SAIDA','TRANSFERENCIA_ENTRADA') and m.grupo is not null then
    with alvo as (
      update public.jsp_movimentacoes
         set estornada = true
       where grupo = m.grupo
         and estornada = false
      returning id, conta_id, conta_destino_id, tipo, valor, descricao, obra_id, grupo
    )
    insert into public.jsp_movimentacoes(conta_id, conta_destino_id, tipo, valor, data, descricao, obra_id, origem, grupo, estorno_de_id, created_by)
    select a.conta_id, a.conta_destino_id,
           case when a.tipo = 'TRANSFERENCIA_SAIDA' then 'TRANSFERENCIA_ENTRADA' else 'TRANSFERENCIA_SAIDA' end,
           a.valor, current_date, 'Estorno: ' || coalesce(a.descricao,''), a.obra_id, 'estorno', a.grupo, a.id,
           coalesce(auth.jwt()->>'email','')
      from alvo a;
  else
    insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, obra_id, origem, estorno_de_id, created_by)
    values (m.conta_id,
            case when m.tipo in ('ENTRADA','TRANSFERENCIA_ENTRADA','AJUSTE_ENTRADA','PAGAMENTO_FATURA') then 'SAIDA' else 'ENTRADA' end,
            m.valor, current_date, 'Estorno: ' || coalesce(m.descricao,''), m.obra_id, 'estorno', m.id,
            coalesce(auth.jwt()->>'email',''));
    update public.jsp_movimentacoes set estornada = true where id = m.id;
  end if;
end;
$function$;

revoke all on function public.rv_mov_estornar(uuid) from public, anon;
grant execute on function public.rv_mov_estornar(uuid) to authenticated, service_role;

commit;
