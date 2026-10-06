-- =====================================================================
-- CONTAS / CARTEIRAS POR OBRA
-- 2026-10-07
-- Toda conta passa a pertencer a uma unica obra (modelo estrito).
-- Somente objetos com prefixo jsp_ / rv_ (escopo do projeto).
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COLUNA obra_id
-- ---------------------------------------------------------------------
alter table public.jsp_contas add column if not exists obra_id int;

-- ---------------------------------------------------------------------
-- 2. MIGRACAO DOS DADOS (reaproveita os registros atuais; nada e apagado)
--    CORA - VILA LUIZA     -> obra 1
--    CORA - COLMEIA PARK   -> obra 2
--    EMPRESTIMO            -> 2 contas por obra com saldo inicial 0
--                             (o historico do emprestimo e lancado manualmente)
--    CARTAO JOAO HENRIQUE  -> Vila Luiza + Colmeia Park (limite 15000 cada)
-- ---------------------------------------------------------------------
update public.jsp_contas set obra_id = 1
 where nome = 'CORA - VILA LUIZA' and obra_id is null;

update public.jsp_contas set obra_id = 2
 where nome = 'CORA - COLMEIA PARK' and obra_id is null;

update public.jsp_contas
   set obra_id = 1, saldo_inicial = 0, nome = 'EMPRÉSTIMO - VILA LUIZA'
 where nome = 'EMPRÉSTIMO' and obra_id is null;

insert into public.jsp_contas (nome, tipo, saldo_inicial, data_saldo_inicial, cor, ativa, ordem, obra_id)
select 'EMPRÉSTIMO - COLMEIA PARK', 'banco', 0, c.data_saldo_inicial, c.cor, c.ativa, c.ordem, 2
  from public.jsp_contas c
 where c.nome = 'EMPRÉSTIMO - VILA LUIZA'
   and not exists (select 1 from public.jsp_contas x where x.nome = 'EMPRÉSTIMO - COLMEIA PARK');

-- zera o saldo inicial das contas de emprestimo (sem movimentos) para que o
-- historico seja lancado manualmente
update public.jsp_contas c set saldo_inicial = 0
 where c.nome in ('EMPRÉSTIMO - VILA LUIZA', 'EMPRÉSTIMO - COLMEIA PARK')
   and c.saldo_inicial <> 0
   and not exists (select 1 from public.jsp_movimentacoes m where m.conta_id = c.id);

update public.jsp_contas set obra_id = 1, nome = 'CARTÃO JOÃO HENRIQUE - VILA LUIZA'
 where nome = 'CARTÃO JOÃO HENRIQUE' and obra_id is null;

insert into public.jsp_contas (nome, tipo, saldo_inicial, data_saldo_inicial, cor, ativa, ordem, limite, dia_fechamento, dia_vencimento, obra_id)
select 'CARTÃO JOÃO HENRIQUE - COLMEIA PARK', c.tipo, 0, c.data_saldo_inicial, c.cor, c.ativa, c.ordem, c.limite, c.dia_fechamento, c.dia_vencimento, 2
  from public.jsp_contas c
 where c.nome = 'CARTÃO JOÃO HENRIQUE - VILA LUIZA'
   and not exists (select 1 from public.jsp_contas x where x.nome = 'CARTÃO JOÃO HENRIQUE - COLMEIA PARK');

-- fallback de seguranca: qualquer conta remanescente sem obra vai para a 1a obra
update public.jsp_contas set obra_id = (select min(id) from public.jsp_obras)
 where obra_id is null and exists (select 1 from public.jsp_obras);

-- ---------------------------------------------------------------------
-- 3. CONSTRAINTS
-- ---------------------------------------------------------------------
alter table public.jsp_contas alter column obra_id set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'jsp_contas_obra_fk') then
    alter table public.jsp_contas add constraint jsp_contas_obra_fk
      foreign key (obra_id) references public.jsp_obras(id);
  end if;
end $$;

create index if not exists jsp_contas_obra_idx on public.jsp_contas(obra_id);

-- ---------------------------------------------------------------------
-- 4. FUNCOES
-- ---------------------------------------------------------------------

-- 4.1 ajuste manual: grava a obra da conta
create or replace function public.rv_ajuste(p_conta uuid, p_delta numeric, p_data date default current_date, p_desc text default 'Ajuste de saldo')
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid; v_obra int;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'Delta invalido.'; end if;
  select obra_id into v_obra from public.jsp_contas where id = p_conta;
  insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, obra_id, origem, created_by)
  values (p_conta,
          case when p_delta > 0 then 'AJUSTE_ENTRADA' else 'AJUSTE_SAIDA' end,
          abs(p_delta), coalesce(p_data, current_date), p_desc, v_obra, 'ajuste',
          coalesce(auth.jwt()->>'email',''))
  returning id into v_id;
  return v_id;
end;
$function$;

-- 4.2 transferencia: permitida apenas entre contas da mesma obra
create or replace function public.rv_transferir(p_origem uuid, p_destino uuid, p_valor numeric, p_data date default current_date, p_desc text default 'Transferencia entre contas')
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_grupo uuid := gen_random_uuid(); v_obra_o int; v_obra_d int;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_origem is null or p_destino is null then raise exception 'Informe origem e destino.'; end if;
  if p_origem = p_destino then raise exception 'Origem e destino iguais.'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'Valor invalido.'; end if;

  select obra_id into v_obra_o from public.jsp_contas where id = p_origem;
  select obra_id into v_obra_d from public.jsp_contas where id = p_destino;
  if v_obra_o is distinct from v_obra_d then
    raise exception 'Transferencia permitida apenas entre contas da mesma obra.';
  end if;

  insert into public.jsp_movimentacoes(conta_id, conta_destino_id, tipo, valor, data, descricao, obra_id, origem, grupo, created_by)
  values (p_origem, p_destino, 'TRANSFERENCIA_SAIDA', p_valor, coalesce(p_data,current_date), p_desc, v_obra_o, 'manual', v_grupo, coalesce(auth.jwt()->>'email',''));
  insert into public.jsp_movimentacoes(conta_id, conta_destino_id, tipo, valor, data, descricao, obra_id, origem, grupo, created_by)
  values (p_destino, p_origem, 'TRANSFERENCIA_ENTRADA', p_valor, coalesce(p_data,current_date), p_desc, v_obra_d, 'manual', v_grupo, coalesce(auth.jwt()->>'email',''));
  return v_grupo;
end;
$function$;

-- 4.3 compra no cartao: valida que a conta e da mesma obra do lancamento
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
  v_obra int;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into l from public.jsp_logs where uid = p_uid;
  if l.uid is null then raise exception 'Lancamento nao encontrado.'; end if;
  select tipo, obra_id into v_tipo, v_obra from public.jsp_contas where id = p_conta;
  if v_tipo is distinct from 'cartao_credito' then raise exception 'Conta selecionada nao e cartao de credito.'; end if;
  if l.obra_id is not null and v_obra is not null and l.obra_id <> v_obra then
    raise exception 'O cartao selecionado pertence a outra obra.';
  end if;

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

-- 4.4 baixa de receita/despesa: valida obra da conta x obra do lancamento
create or replace function public.rv_baixar_lancamento(p_uid uuid, p_conta uuid, p_data date default current_date)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  l public.jsp_logs; v_tipo text; v_origem text; v_id uuid; v_obra int;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  select * into l from public.jsp_logs where uid = p_uid;
  if l.uid is null then raise exception 'Lancamento nao encontrado.'; end if;
  if l.status_financeiro = 'PAGO' then raise exception 'Lancamento ja baixado.'; end if;
  if l.status_financeiro = 'CANCELADO' then raise exception 'Lancamento cancelado.'; end if;
  if l.eh_cartao then raise exception 'Despesa no cartao: a baixa acontece no pagamento da fatura.'; end if;
  if p_conta is null then raise exception 'Selecione a conta.'; end if;

  select obra_id into v_obra from public.jsp_contas where id = p_conta;
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

-- 4.5 baixa de O.C.: valida obra da conta x obra dos lancamentos
create or replace function public.rv_baixar_oc(p_id text, p_conta uuid, p_data date default current_date)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_total numeric; v_id uuid; v_obra int; v_obra_conta int;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_conta is null then raise exception 'Selecione a conta.'; end if;

  select coalesce(sum(valor_total),0), max(obra_id) into v_total, v_obra
    from public.jsp_logs where id = p_id and tipo = 'compra' and status_financeiro = 'PENDENTE';
  if coalesce(v_total,0) <= 0 then raise exception 'O.C. nao encontrada ou ja baixada.'; end if;

  select obra_id into v_obra_conta from public.jsp_contas where id = p_conta;
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

grant execute on function public.rv_ajuste(uuid, numeric, date, text) to authenticated;
grant execute on function public.rv_transferir(uuid, uuid, numeric, date, text) to authenticated;
grant execute on function public.rv_cartao_compra(uuid, uuid, date) to authenticated;
grant execute on function public.rv_baixar_lancamento(uuid, uuid, date) to authenticated;
grant execute on function public.rv_baixar_oc(text, uuid, date) to authenticated;
