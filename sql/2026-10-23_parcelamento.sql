-- Parcelamento de lancamentos em aberto (Contas a Pagar)
-- Cria titulos parcelados e cancela o lancamento original de forma atomica.

CREATE OR REPLACE FUNCTION public.rv_parcelar_lancamento(
  p_uid text,
  p_parcelas jsonb,
  p_obs text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
  v_orig public.jsp_logs;
  v_n int;
  v_i int := 0;
  v_item jsonb;
  v_valor numeric;
  v_venc date;
  v_soma numeric := 0;
  v_max numeric;
  v_id numeric;
  v_ids jsonb := '[]'::jsonb;
  v_obs_extra text := '';
begin
  if not public.jsp_pode_operar() then
    raise exception 'Sem permissao para operar.';
  end if;

  if p_uid is null or btrim(p_uid) = '' then
    raise exception 'Lancamento invalido.';
  end if;

  begin
    v_uid := p_uid::uuid;
  exception when others then
    raise exception 'Identificador de lancamento invalido.';
  end;

  select * into v_orig
    from public.jsp_logs
   where uid = v_uid
   for update;

  if not found then
    raise exception 'Lancamento nao encontrado.';
  end if;
  if v_orig.tipo <> 'despesa' then
    raise exception 'Apenas despesas podem ser parceladas. Ordens de compra devem ser tratadas no proprio documento.';
  end if;
  if v_orig.status_financeiro <> 'PENDENTE' then
    raise exception 'Apenas lancamentos pendentes podem ser parcelados.';
  end if;
  if coalesce(v_orig.eh_cartao, false) then
    raise exception 'Despesas no cartao devem ser parceladas na fatura.';
  end if;
  if v_orig.ref_tipo is not null then
    raise exception 'Este lancamento esta vinculado a outro processo (%) e nao pode ser parcelado aqui.', v_orig.ref_tipo;
  end if;
  if v_orig.equipe_id is not null then
    raise exception 'Pagamentos de equipe nao podem ser parcelados por esta tela.';
  end if;
  if v_orig.fatura_id is not null then
    raise exception 'Este lancamento ja esta vinculado a uma fatura.';
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

  if abs(v_soma - coalesce(v_orig.valor_total, 0)) > 0.01 then
    raise exception 'A soma das parcelas (R$ %) difere do valor do lancamento (R$ %).',
      to_char(v_soma, 'FM999999990D00'),
      to_char(coalesce(v_orig.valor_total, 0), 'FM999999990D00');
  end if;

  perform pg_advisory_xact_lock(hashtext('jsp_logs_id'));
  select coalesce(max(id), 0) into v_max from public.jsp_logs;

  if nullif(btrim(coalesce(p_obs, '')), '') is null then
    v_obs_extra := '';
  else
    v_obs_extra := ' | ' || upper(btrim(p_obs));
  end if;

  v_i := 0;
  for v_item in select value from jsonb_array_elements(p_parcelas) loop
    v_i := v_i + 1;
    v_valor := round((v_item ->> 'valor')::numeric, 2);
    v_venc := (v_item ->> 'vencimento')::date;
    v_id := v_max + v_i;

    insert into public.jsp_logs (
      id, obra_id, fornecedor_id, tipo, produto_nome, quantidade, valor_total,
      data, vencimento, status_financeiro, forma_pagamento, valor_pago, categoria,
      observacao, fase_obra, produto_id, conta_id, fatura_id, liquidado_em,
      eh_cartao, equipe_id, ref_tipo, ref_uuid, desconto, valor_bruto
    ) values (
      v_id,
      v_orig.obra_id,
      v_orig.fornecedor_id,
      'despesa',
      coalesce(v_orig.produto_nome, 'DESPESA') || ' (' || v_i || '/' || v_n || ')',
      1,
      v_valor,
      coalesce(v_orig.data, now()),
      v_venc::timestamp with time zone,
      'PENDENTE',
      v_orig.forma_pagamento,
      0,
      v_orig.categoria,
      coalesce(v_orig.observacao, '') || ' | PARCELA ' || v_i || '/' || v_n ||
        ' - PARCELAMENTO DE ' || v_uid::text || v_obs_extra,
      v_orig.fase_obra,
      v_orig.produto_id,
      null,
      null,
      null,
      false,
      null,
      null,
      null,
      0,
      null
    );

    v_ids := v_ids || to_jsonb(v_id::text);
  end loop;

  update public.jsp_logs
     set status_financeiro = 'CANCELADO',
         observacao = coalesce(observacao, '') || ' | PARCELADO EM ' || v_n || 'X EM ' ||
                      to_char(current_date, 'DD/MM/YYYY')
   where uid = v_uid;

  if not found then
    raise exception 'Nao foi possivel cancelar o lancamento original.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'parcelas', v_n,
    'ids', v_ids,
    'original', v_uid
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.rv_parcelar_lancamento(text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rv_parcelar_lancamento(text, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rv_parcelar_lancamento(text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rv_parcelar_lancamento(text, jsonb, text) TO service_role;
