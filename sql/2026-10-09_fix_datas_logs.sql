-- =====================================================================
-- Correcao de datas invalidas em jsp_logs (2026-10-09)
-- Backup previo: jsp_bkp_pre_datas_20261009_jsp_logs
--
-- Casos corrigidos:
--   1) MATERIAL E INSTALACAO DE ESQUADRIA (MARCO)  data 2023-03-30 -> 2026-03-30
--   2) IMPRESSAO DE PROJETO DA LAJE                data 2006-05-10 -> 2026-05-10
--
-- Observacao: os 81 lancamentos PAGO com data/vencimento nulos vieram de uma
-- importacao em lote (created_at 2026-03-31) e NAO foram alterados, pois nao
-- ha como inferir a data real. O dashboard sinaliza esses lancamentos.
-- =====================================================================

update jsp_logs
   set data = '2026-03-30', vencimento = '2026-03-30'
 where uid = '31568aff-6480-4b61-8a1e-477d47e59ce1';

update jsp_logs
   set data = '2026-05-10', vencimento = '2026-05-10'
 where uid = 'c34821c3-ac72-4698-9aac-db056d2c9fa3';
