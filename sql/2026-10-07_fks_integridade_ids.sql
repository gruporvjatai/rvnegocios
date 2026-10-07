-- ============================================================
-- 2026-10-07 — Integridade por ID: FKs ausentes em tabelas jsp_*
-- Autor: Grupo RV
-- Backups: jsp_bkp_pre_ids_20261007_<tabela> (15 tabelas)
--
-- Contexto: várias colunas *_id não tinham FK, permitindo órfãos.
-- Aplicado via Supabase Management API. Idempotente (DO/IF NOT EXISTS).
--
-- Observações:
--  * jsp_vales.colaborador_id e jsp_ponto.equipe_id foram criadas
--    como NOT VALID porque ainda há 1 órfão em cada (registros de
--    teste). Após a limpeza, rodar:
--      alter table public.jsp_vales  validate constraint jsp_vales_colaborador_id_fkey;
--      alter table public.jsp_ponto  validate constraint jsp_ponto_equipe_id_fkey;
--  * Colunas obra_id text (jsp_ponto, jsp_ponto_diario, jsp_ponto_mensal,
--    jsp_medicoes_empreita, jsp_producao_terc, jsp_equipe.obra_atual_id,
--    jsp_terceirizados.obra_atual_id) NÃO receberam FK por incompatibilidade
--    de tipo (text vs integer). Normalizar tipo antes de criar FK.
-- ============================================================

do $$ begin
 if not exists (select 1 from pg_constraint where conname='jsp_logs_fornecedor_id_fkey') then
  alter table public.jsp_logs add constraint jsp_logs_fornecedor_id_fkey foreign key (fornecedor_id) references public.jsp_fornecedores(id) on delete set null; end if;
 if not exists (select 1 from pg_constraint where conname='jsp_logs_obra_id_fkey') then
  alter table public.jsp_logs add constraint jsp_logs_obra_id_fkey foreign key (obra_id) references public.jsp_obras(id) on delete set null; end if;
 if not exists (select 1 from pg_constraint where conname='jsp_logs_conta_id_fkey') then
  alter table public.jsp_logs add constraint jsp_logs_conta_id_fkey foreign key (conta_id) references public.jsp_contas(id) on delete set null; end if;
 if not exists (select 1 from pg_constraint where conname='jsp_logs_fatura_id_fkey') then
  alter table public.jsp_logs add constraint jsp_logs_fatura_id_fkey foreign key (fatura_id) references public.jsp_faturas(id) on delete set null; end if;
 if not exists (select 1 from pg_constraint where conname='jsp_vale_abatimentos_colaborador_id_fkey') then
  alter table public.jsp_vale_abatimentos add constraint jsp_vale_abatimentos_colaborador_id_fkey foreign key (colaborador_id) references public.jsp_equipe(id); end if;
 if not exists (select 1 from pg_constraint where conname='jsp_movimentacoes_obra_id_fkey') then
  alter table public.jsp_movimentacoes add constraint jsp_movimentacoes_obra_id_fkey foreign key (obra_id) references public.jsp_obras(id) on delete set null; end if;
 if not exists (select 1 from pg_constraint where conname='jsp_movimentacoes_log_uid_fkey') then
  alter table public.jsp_movimentacoes add constraint jsp_movimentacoes_log_uid_fkey foreign key (log_uid) references public.jsp_logs(uid) on delete set null; end if;
 if not exists (select 1 from pg_constraint where conname='jsp_medicoes_empreita_equipe_id_fkey') then
  alter table public.jsp_medicoes_empreita add constraint jsp_medicoes_empreita_equipe_id_fkey foreign key (equipe_id) references public.jsp_equipe(id); end if;
 if not exists (select 1 from pg_constraint where conname='jsp_vales_colaborador_id_fkey') then
  alter table public.jsp_vales add constraint jsp_vales_colaborador_id_fkey foreign key (colaborador_id) references public.jsp_equipe(id) not valid; end if;
 if not exists (select 1 from pg_constraint where conname='jsp_ponto_equipe_id_fkey') then
  alter table public.jsp_ponto add constraint jsp_ponto_equipe_id_fkey foreign key (equipe_id) references public.jsp_equipe(id) not valid; end if;
end $$;

-- ============================================================
-- Limpeza dos órfãos/duplicados (executada em 2026-10-07)
-- ============================================================
-- Registros de teste e duplicados sem nenhuma referência:
delete from public.jsp_vale_abatimentos where vale_id='27a1e259-f88b-4a66-a19f-a96f7ed40fd0';
delete from public.jsp_vales              where id='27a1e259-f88b-4a66-a19f-a96f7ed40fd0';
delete from public.jsp_ponto              where id='d6a21055-15b3-4444-b9b5-86169da79a0e';
delete from public.jsp_produtos           where id=390; -- 'DICO LIXA G120' duplicado do 389
delete from public.jsp_equipe where id in (
  'c19ff9a5-8431-499b-959b-eb613f39507e', -- FERNANDO (inativo, dup do ativo a9b1ea0d)
  '13f762da-99c0-4a43-abf2-8f645f1ba221', -- FRANCIS  (inativo, dup do ativo 54694356)
  '4ab3434b-ae59-4751-85e3-7edb41798e22'  -- ANTONIO  (inativo, dup do ativo 184ffe34)
);

-- Após a limpeza, validar as FKs criadas como NOT VALID:
alter table public.jsp_vales validate constraint jsp_vales_colaborador_id_fkey;
alter table public.jsp_ponto validate constraint jsp_ponto_equipe_id_fkey;
