-- 2026-10-20 - Fechamento dos furos de seguranca e integridade (jsp_* / rv_*)
-- Escopo: apenas tabelas/funcoes com prefixo jsp_ ou rv_.
-- Executar em transacao. Cria backup logico das tabelas afetadas antes das mudancas.

begin;

-- =====================================================================
-- 0) BACKUP LOGICO (dados, sem constraints) em schema separado
-- =====================================================================
create schema if not exists jsp_bkp_20261020;

do $$
declare t text;
begin
  foreach t in array array[
    'jsp_usuarios','jsp_contas','jsp_faturas','jsp_movimentacoes','jsp_logs',
    'jsp_vales','jsp_vale_abatimentos','jsp_ponto_diario','jsp_equipe',
    'jsp_terceirizados','jsp_obras','jsp_fase','jsp_fornecedores','jsp_produtos',
    'jsp_historico_precos','jsp_medicoes_empreita','jsp_producao_terc',
    'jsp_ponto','jsp_ponto_mensal'
  ]
  loop
    execute format('create table if not exists jsp_bkp_20261020.%I as table public.%I', t, t);
  end loop;
end $$;

-- =====================================================================
-- 1) FUNCOES DE PERMISSAO
-- =====================================================================
-- e_superadmin(): sem JWT nao e superadmin (antes anon era superadmin).
create or replace function public.e_superadmin()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select case
    when auth.jwt() is null then false
    else exists (
      select 1 from public.usuarios u
      where lower(u.email) = lower(coalesce(auth.jwt()->>'email',''))
        and u.nivel_acesso = 'superadmin'
        and coalesce(u.ativo, true) = true
    )
  end;
$function$;

-- Leitura: qualquer usuario jsp ativo. Impede que usuarios de outro sistema
-- (mesmo projeto Supabase/Auth) leiam as tabelas jsp_*.
create or replace function public.jsp_pode_ler()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.jsp_usuarios u
    where u.ativo = true
      and lower(u.email) = lower(coalesce(auth.jwt()->>'email',''))
  );
$function$;

-- Registro de campo: admin, comprador, registros ou gerente.
create or replace function public.jsp_pode_registrar()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.jsp_usuarios u
    where u.ativo = true
      and (u.nivel_acesso in ('admin','comprador','registros') or u.pode_gerenciar = true)
      and lower(u.email) = lower(coalesce(auth.jwt()->>'email',''))
  );
$function$;

-- =====================================================================
-- 2) RLS - LEITURA
-- =====================================================================
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename like 'jsp\_%' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'jsp_contas','jsp_faturas','jsp_movimentacoes','jsp_logs','jsp_vales',
    'jsp_vale_abatimentos','jsp_ponto_diario','jsp_equipe','jsp_terceirizados',
    'jsp_obras','jsp_fase','jsp_fornecedores','jsp_produtos','jsp_historico_precos',
    'jsp_medicoes_empreita','jsp_producao_terc','jsp_ponto','jsp_ponto_mensal'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.jsp_pode_ler())',
      t || '_sel_auth', t
    );
  end loop;
end $$;

create policy jsp_usuarios_sel_auth on public.jsp_usuarios
  for select to authenticated
  using (
    public.jsp_is_gerente()
    or lower(trim(coalesce(email,''))) = lower(trim(coalesce(auth.jwt()->>'email','')))
  );

-- =====================================================================
-- 3) RLS - ESCRITA
-- =====================================================================
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename like 'jsp\_%' and cmd in ('INSERT','UPDATE','DELETE')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3.1 Operacao financeira/gestao
do $$
declare t text;
begin
  foreach t in array array['jsp_faturas','jsp_movimentacoes','jsp_fase','jsp_fornecedores','jsp_historico_precos','jsp_produtos','jsp_vales','jsp_vale_abatimentos']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.jsp_pode_operar())', t||'_ins_auth', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.jsp_pode_operar()) with check (public.jsp_pode_operar())', t||'_upd_auth', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.jsp_pode_operar())', t||'_del_auth', t);
  end loop;
end $$;

-- Contas (carteiras) sao geridas apenas por gerente.
create policy jsp_contas_ins_auth on public.jsp_contas for insert to authenticated with check (public.jsp_is_gerente());
create policy jsp_contas_upd_auth on public.jsp_contas for update to authenticated using (public.jsp_is_gerente()) with check (public.jsp_is_gerente());
create policy jsp_contas_del_auth on public.jsp_contas for delete to authenticated using (public.jsp_is_gerente());

-- 3.2 Registro de campo (equipe, ponto, producao, medições, fornecedores de campo)
do $$
declare t text;
begin
  foreach t in array array['jsp_equipe','jsp_medicoes_empreita','jsp_ponto_diario','jsp_producao_terc','jsp_terceirizados']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.jsp_pode_registrar())', t||'_ins_auth', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.jsp_pode_registrar()) with check (public.jsp_pode_registrar())', t||'_upd_auth', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.jsp_pode_registrar())', t||'_del_auth', t);
  end loop;
end $$;

-- 3.3 Obras: criacao/exclusao apenas gerente; edicao por operador.
create policy jsp_obras_ins_auth on public.jsp_obras for insert to authenticated with check (public.jsp_is_gerente());
create policy jsp_obras_upd_auth on public.jsp_obras for update to authenticated using (public.jsp_pode_operar()) with check (public.jsp_pode_operar());
create policy jsp_obras_del_auth on public.jsp_obras for delete to authenticated using (public.jsp_is_gerente());

-- 3.4 Fechamentos e usuarios: gerente.
do $$
declare t text;
begin
  foreach t in array array['jsp_ponto','jsp_ponto_mensal','jsp_usuarios']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.jsp_is_gerente())', t||'_ins_auth', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.jsp_is_gerente()) with check (public.jsp_is_gerente())', t||'_upd_auth', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.jsp_is_gerente())', t||'_del_auth', t);
  end loop;
end $$;

-- 3.5 Lancamentos: operador; registrador apenas O.C. pendente/compra.
create policy jsp_logs_ins_auth on public.jsp_logs
  for insert to authenticated
  with check (public.jsp_pode_operar() or (public.jsp_pode_registrar() and tipo = 'oc_pendente'));

create policy jsp_logs_upd_auth on public.jsp_logs
  for update to authenticated
  using (public.jsp_is_gerente() or (public.jsp_pode_registrar() and tipo in ('oc_pendente','compra')))
  with check (public.jsp_is_gerente() or (public.jsp_pode_registrar() and tipo in ('oc_pendente','compra')));

create policy jsp_logs_del_auth on public.jsp_logs
  for delete to authenticated
  using (public.jsp_is_gerente() or (public.jsp_pode_registrar() and tipo in ('oc_pendente','compra')));

-- =====================================================================
-- 4) EXECUTE DAS FUNCOES
-- =====================================================================
do $$
declare r record;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname like 'rv\_%' or p.proname like 'jsp\_%')
  loop
    if r.proname = 'jsp_buscar_email_por_usuario' then
      execute format('revoke all on function public.%I(%s) from public', r.proname, pg_get_function_identity_arguments(r.oid));
      execute format('grant execute on function public.%I(%s) to anon, authenticated, service_role', r.proname, pg_get_function_identity_arguments(r.oid));
    else
      execute format('revoke all on function public.%I(%s) from public, anon', r.proname, pg_get_function_identity_arguments(r.oid));
      execute format('grant execute on function public.%I(%s) to authenticated, service_role', r.proname, pg_get_function_identity_arguments(r.oid));
    end if;
  end loop;
end $$;

-- =====================================================================
-- 5) INTEGRIDADE DE FKs
-- =====================================================================
-- Excluir conta com historico apagava faturas e movimentos em cascata.
alter table public.jsp_faturas drop constraint if exists jsp_faturas_conta_id_fkey;
alter table public.jsp_faturas add constraint jsp_faturas_conta_id_fkey
  foreign key (conta_id) references public.jsp_contas(id) on delete restrict;

alter table public.jsp_movimentacoes drop constraint if exists jsp_movimentacoes_conta_id_fkey;
alter table public.jsp_movimentacoes add constraint jsp_movimentacoes_conta_id_fkey
  foreign key (conta_id) references public.jsp_contas(id) on delete restrict;

alter table public.jsp_producao_terc drop constraint if exists jsp_producao_terc_terceirizado_id_fkey;
alter table public.jsp_producao_terc add constraint jsp_producao_terc_terceirizado_id_fkey
  foreign key (terceirizado_id) references public.jsp_terceirizados(id) on delete restrict;

-- colaborador_id e polimorfico (jsp_equipe ou jsp_terceirizados): FK para
-- jsp_equipe impedia vales de terceirizados.
alter table public.jsp_vales drop constraint if exists jsp_vales_colaborador_id_fkey;
alter table public.jsp_vale_abatimentos drop constraint if exists jsp_vale_abatimentos_colaborador_id_fkey;

create index if not exists jsp_vales_colaborador_idx on public.jsp_vales(colaborador_id);
create index if not exists jsp_vale_abat_colaborador_idx on public.jsp_vale_abatimentos(colaborador_id);

-- =====================================================================
-- 6) FUNCOES FINANCEIRAS - VALIDACOES
-- =====================================================================
-- Baixa avulsa: nao aceitar cartao de credito como conta pagadora.
create or replace function public.rv_baixar_lancamento(p_uid uuid, p_conta uuid, p_data date default current_date)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  l public.jsp_logs; v_tipo text; v_origem text; v_id uuid; v_obra int; v_conta_tipo text;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into l from public.jsp_logs where uid = p_uid;
  if l.uid is null then raise exception 'Lancamento nao encontrado.'; end if;
  if l.status_financeiro = 'PAGO' then raise exception 'Lancamento ja baixado.'; end if;
  if l.status_financeiro = 'CANCELADO' then raise exception 'Lancamento cancelado.'; end if;
  if l.eh_cartao then raise exception 'Despesa no cartao: a baixa acontece no pagamento da fatura.'; end if;
  if p_conta is null then raise exception 'Selecione a conta.'; end if;

  select obra_id, tipo into v_obra, v_conta_tipo from public.jsp_contas where id = p_conta;
  if v_conta_tipo is null then raise exception 'Conta nao encontrada.'; end if;
  if v_conta_tipo = 'cartao_credito' then raise exception 'Use o pagamento da fatura para o cartao.'; end if;
  if l.obra_id is not null and v_obra is not null and l.obra_id <> v_obra then
    raise exception 'A conta selecionada pertence a outra obra.';
  end if;

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

-- Baixa em lote: validar a obra e o tipo da conta pagadora.
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
  v_total numeric;
  v_obra int;
  v_obra_ref int := null;
  v_conta_obra int;
  v_conta_tipo text;
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

-- Pagamento de fatura: nao aceitar cartao de credito nem conta de outra obra.
create or replace function public.rv_fatura_pagar(p_fatura uuid, p_conta_pagamento uuid, p_data date default current_date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  f public.jsp_faturas;
  v_card public.jsp_contas;
  v_pag public.jsp_contas;
  v_total numeric;
  v_mov uuid;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into f from public.jsp_faturas where id = p_fatura;
  if f.id is null then raise exception 'Fatura nao encontrada.'; end if;
  if f.status = 'PAGA' then raise exception 'Fatura ja paga.'; end if;
  if f.status = 'CANCELADA' then raise exception 'Fatura cancelada.'; end if;

  select * into v_card from public.jsp_contas where id = f.conta_id;
  select * into v_pag from public.jsp_contas where id = p_conta_pagamento;
  if v_pag.id is null then raise exception 'Conta de pagamento nao encontrada.'; end if;
  if v_pag.tipo = 'cartao_credito' then raise exception 'A fatura nao pode ser paga com cartao de credito.'; end if;
  if v_pag.id = f.conta_id then raise exception 'Selecione uma conta diferente do cartao.'; end if;
  if v_card.id is not null and v_pag.obra_id is not null and v_card.obra_id is not null and v_pag.obra_id <> v_card.obra_id then
    raise exception 'A conta de pagamento pertence a outra obra.';
  end if;

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

-- Compra de O.C. no cartao: cria COMPRA_CARTAO por item, atomicamente.
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

-- Baixa de O.C.: nao aceitar cartao de credito como conta pagadora.
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

  select coalesce(sum(valor_total),0), max(obra_id) into v_total, v_obra
    from public.jsp_logs where id = p_id and tipo = 'compra' and status_financeiro = 'PENDENTE';
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
   where id = p_id and tipo = 'compra' and status_financeiro = 'PENDENTE';

  return v_id;
end;
$function$;

-- =====================================================================
-- 7) SENHA EM TEXTO PURO
-- =====================================================================
-- A autenticacao e feita pelo Supabase Auth; o campo legado nao e mais usado.
alter table public.jsp_usuarios drop column if exists senha;

-- O backup contem a copia da senha legada; apaga a coluna para nao manter
-- credenciais em texto puro apos a migracao.
alter table if exists jsp_bkp_20261020.jsp_usuarios drop column if exists senha;

commit;
