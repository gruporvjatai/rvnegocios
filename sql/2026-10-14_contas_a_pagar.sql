-- Contas a Pagar: pagamento multiplo (lote) 2026-10-14
--
-- Regras de dados:
--   * Nada aqui altera o historico das O.C.s nem dos titulos lancados.
--   * A baixa apenas muda status_financeiro -> PAGO (e valor_pago/liquidado_em/conta_id
--     quando aplicavel) e cria movimentacoes. valor_total, valor_bruto, desconto,
--     tipo, itens e datas permanecem intactos.
--   * Cada titulo pago gera 1 movimento (mantem relatorio por obra/fornecedor),
--     todos marcados com o mesmo lote_id para permitir estorno em lote depois.
--   * Um lote so pode conter titulos da mesma obra (obras nulas/"Geral" sao
--     compativeis com qualquer obra); misturar obras levanta excecao.

alter table public.jsp_movimentacoes add column if not exists lote_id uuid;

create index if not exists idx_jsp_logs_fin_pendentes
  on public.jsp_logs (tipo, status_financeiro)
  where status_financeiro = 'PENDENTE';
create index if not exists idx_jsp_logs_fornecedor on public.jsp_logs (fornecedor_id);
create index if not exists idx_jsp_logs_vencimento on public.jsp_logs (vencimento);
create index if not exists idx_jsp_mov_lote on public.jsp_movimentacoes (lote_id);

create or replace function public.rv_baixar_multiplo(
  p_itens jsonb,
  p_conta uuid,
  p_data date default current_date,
  p_obs text default null
) returns jsonb
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
  v_desc text := coalesce(nullif(btrim(p_obs), ''), 'Pagamento em lote');
  v_res jsonb := '[]'::jsonb;
  v_pagos int := 0;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_conta is null then raise exception 'Selecione a conta.'; end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nenhum titulo selecionado.';
  end if;

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

  return jsonb_build_object('lote_id', v_lote, 'pagos', v_pagos, 'itens', v_res);
end;
$function$;

grant execute on function public.rv_baixar_multiplo(jsonb, uuid, date, text) to authenticated;

comment on column public.jsp_movimentacoes.lote_id is 'Agrupa movimentos de um mesmo pagamento multiplo (lote) da tela Contas a Pagar.';

-- Estorno de um lote inteiro: reverte os titulos para PENDENTE e gera movimentos
-- de estorno espelhando cada baixa. Nao altera valor/tipo/itens/datas dos titulos.
create or replace function public.rv_estornar_lote(p_lote uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m public.jsp_movimentacoes;
  v_n int := 0;
begin
  if not public.jsp_pode_operar() then raise exception 'Sem permissao para operar.'; end if;
  if p_lote is null then raise exception 'Lote invalido.'; end if;

  for m in
    select * from public.jsp_movimentacoes
     where lote_id = p_lote and estornada = false
       and origem in ('baixa_oc','baixa_receita','baixa_despesa')
     order by created_at
  loop
    insert into public.jsp_movimentacoes(conta_id, tipo, valor, data, descricao, categoria, obra_id, oc_id, log_uid, origem, estorno_de_id, created_by)
    values (m.conta_id,
            case when m.tipo = 'ENTRADA' then 'SAIDA' else 'ENTRADA' end,
            m.valor, current_date, 'Estorno lote: ' || coalesce(m.descricao,''), m.categoria,
            m.obra_id, m.oc_id, m.log_uid, 'estorno', m.id, coalesce(auth.jwt()->>'email',''));

    update public.jsp_movimentacoes set estornada = true where id = m.id;

    if m.oc_id is not null then
      update public.jsp_logs set status_financeiro = 'PENDENTE', liquidado_em = null
       where id::text = m.oc_id and tipo = 'compra' and status_financeiro = 'PAGO';
    elsif m.log_uid is not null then
      update public.jsp_logs set status_financeiro = 'PENDENTE', valor_pago = null, liquidado_em = null
       where uid = m.log_uid and status_financeiro = 'PAGO';
    end if;

    v_n := v_n + 1;
  end loop;

  return jsonb_build_object('lote_id', p_lote, 'estornados', v_n);
end;
$function$;

grant execute on function public.rv_estornar_lote(uuid) to authenticated;
