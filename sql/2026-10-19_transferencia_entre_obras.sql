-- =====================================================================
-- TRANSFERENCIA ENTRE CONTAS DE OBRAS DIFERENTES
-- 2026-10-19
-- Permite transferir saldo entre contas de obras diferentes.
-- O restante do sistema nao muda: baixa de receita/despesa, O.C. e
-- pagamento em lote continuam exigindo conta da mesma obra.
-- Somente objetos com prefixo jsp_ / rv_ (escopo do projeto).
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TRANSFERENCIA: sem bloqueio de obra
--    Grava dois movimentos no mesmo grupo (um por conta/obra):
--      TRANSFERENCIA_SAIDA  na origem  (obra da origem)
--      TRANSFERENCIA_ENTRADA no destino (obra do destino)
-- ---------------------------------------------------------------------
create or replace function public.rv_transferir(p_origem uuid, p_destino uuid, p_valor numeric, p_data date default current_date, p_desc text default 'Transferencia entre contas')
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_grupo uuid := gen_random_uuid();
  v_obra_o int;
  v_obra_d int;
  v_desc text;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_origem is null or p_destino is null then raise exception 'Informe origem e destino.'; end if;
  if p_origem = p_destino then raise exception 'Origem e destino iguais.'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'Valor invalido.'; end if;

  select obra_id into v_obra_o from public.jsp_contas where id = p_origem;
  if v_obra_o is null then raise exception 'Conta de origem nao encontrada.'; end if;

  select obra_id into v_obra_d from public.jsp_contas where id = p_destino;
  if v_obra_d is null then raise exception 'Conta de destino nao encontrada.'; end if;

  v_desc := coalesce(nullif(btrim(coalesce(p_desc, '')), ''), 'Transferencia entre contas');

  insert into public.jsp_movimentacoes(conta_id, conta_destino_id, tipo, valor, data, descricao, obra_id, origem, grupo, created_by)
  values (p_origem, p_destino, 'TRANSFERENCIA_SAIDA', p_valor, coalesce(p_data, current_date), v_desc, v_obra_o, 'manual', v_grupo, coalesce(auth.jwt()->>'email',''));

  insert into public.jsp_movimentacoes(conta_id, conta_destino_id, tipo, valor, data, descricao, obra_id, origem, grupo, created_by)
  values (p_destino, p_origem, 'TRANSFERENCIA_ENTRADA', p_valor, coalesce(p_data, current_date), v_desc, v_obra_d, 'manual', v_grupo, coalesce(auth.jwt()->>'email',''));

  return v_grupo;
end;
$function$;

-- ---------------------------------------------------------------------
-- 2. ESTORNO: preserva o obra_id de cada lado
--    (inclusive quando a transferencia cruza obras)
-- ---------------------------------------------------------------------
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
    insert into public.jsp_movimentacoes(conta_id, conta_destino_id, tipo, valor, data, descricao, obra_id, origem, grupo, estorno_de_id, created_by)
    select x.conta_id, x.conta_destino_id,
           case when x.tipo = 'TRANSFERENCIA_SAIDA' then 'TRANSFERENCIA_ENTRADA' else 'TRANSFERENCIA_SAIDA' end,
           x.valor, current_date, 'Estorno: ' || coalesce(x.descricao,''), x.obra_id, 'estorno', x.grupo, x.id,
           coalesce(auth.jwt()->>'email','')
      from public.jsp_movimentacoes x
     where x.grupo = m.grupo and x.estornada = false;
    update public.jsp_movimentacoes set estornada = true where grupo = m.grupo;
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

grant execute on function public.rv_transferir(uuid, uuid, numeric, date, text) to authenticated;
grant execute on function public.rv_mov_estornar(uuid) to authenticated;
