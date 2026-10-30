-- 2026-10-30 - Correcao: permitir parcelar novamente apos desfazer o parcelamento.
-- Escopo: apenas objetos com prefixo jsp_/rv_.
--
-- Problema: rv_oc_parcelar numerava as novas parcelas a partir de max(numero)
-- de TODAS as parcelas (inclusive CANCELADAS). Depois de rv_oc_desparcelar,
-- as canceladas (numero 1..n) faziam o novo cronograma comecar em n+1,
-- violando a constraint numero <= total_parcelas.
--
-- Correcao:
--   * a numeracao reinicia em 1 quando nao ha parcelas ativas;
--   * unicidade passa a valer somente para parcelas nao canceladas;
--   * parcelas canceladas ficam preservadas como historico.

begin;

-- ---------------------------------------------------------------------
-- 1) Ajuste das constraints
-- ---------------------------------------------------------------------
alter table public.jsp_oc_parcelas
  drop constraint if exists jsp_oc_parcelas_numero_chk;

alter table public.jsp_oc_parcelas
  add constraint jsp_oc_parcelas_numero_chk check (numero >= 1);

alter table public.jsp_oc_parcelas
  drop constraint if exists jsp_oc_parcelas_oc_num_unq;

drop index if exists public.jsp_oc_parcelas_oc_num_ativo_unq;
create unique index if not exists jsp_oc_parcelas_oc_num_ativo_unq
  on public.jsp_oc_parcelas(oc_id, numero)
  where status <> 'CANCELADA';

-- ---------------------------------------------------------------------
-- 2) rv_oc_parcelar: numerar apenas sobre parcelas ativas
-- ---------------------------------------------------------------------
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

  -- Numera apenas sobre parcelas ativas: apos desfazer, reinicia em 1.
  select coalesce(max(numero), 0) into v_max
    from public.jsp_oc_parcelas
   where oc_id = v_id and status <> 'CANCELADA';

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

commit;
