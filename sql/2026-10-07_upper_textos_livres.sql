-- Padroniza textos livres (nome/endereco/observacao/descricao/produto/solicitante) em MAIUSCULO.
-- Exclui ids, *_id, enums (tipo/categoria/origem/status), senha/email/login, chave_pix, token_diario, lat/lng.
-- Idempotente. Nao altera tabelas jsp_bkp_pre_contas_*.

-- Backups (nao sobrescreve se ja existir)
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_contas as select * from public.jsp_contas;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_equipe as select * from public.jsp_equipe;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_fase as select * from public.jsp_fase;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_fornecedores as select * from public.jsp_fornecedores;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_historico_precos as select * from public.jsp_historico_precos;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_logs as select * from public.jsp_logs;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_medicoes_empreita as select * from public.jsp_medicoes_empreita;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_movimentacoes as select * from public.jsp_movimentacoes;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_obras as select * from public.jsp_obras;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_ponto_diario as select * from public.jsp_ponto_diario;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_producao_terc as select * from public.jsp_producao_terc;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_produtos as select * from public.jsp_produtos;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_terceirizados as select * from public.jsp_terceirizados;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_usuarios as select * from public.jsp_usuarios;
create table if not exists public.jsp_bkp_pre_upper_20261007_jsp_vales as select * from public.jsp_vales;

-- Dados existentes
update public.jsp_contas set nome = upper(nome) where (nome is not null and nome <> upper(nome));
update public.jsp_equipe set nome = upper(nome), endereco = upper(endereco) where (nome is not null and nome <> upper(nome)) or (endereco is not null and endereco <> upper(endereco));
update public.jsp_fase set nome = upper(nome) where (nome is not null and nome <> upper(nome));
update public.jsp_fornecedores set nome = upper(nome), endereco = upper(endereco) where (nome is not null and nome <> upper(nome)) or (endereco is not null and endereco <> upper(endereco));
update public.jsp_historico_precos set observacao = upper(observacao) where (observacao is not null and observacao <> upper(observacao));
update public.jsp_logs set produto_nome = upper(produto_nome), observacao = upper(observacao) where (produto_nome is not null and produto_nome <> upper(produto_nome)) or (observacao is not null and observacao <> upper(observacao));
update public.jsp_medicoes_empreita set descricao = upper(descricao) where (descricao is not null and descricao <> upper(descricao));
update public.jsp_movimentacoes set descricao = upper(descricao) where (descricao is not null and descricao <> upper(descricao));
update public.jsp_obras set nome = upper(nome), endereco = upper(endereco), solicitante = upper(solicitante) where (nome is not null and nome <> upper(nome)) or (endereco is not null and endereco <> upper(endereco)) or (solicitante is not null and solicitante <> upper(solicitante));
update public.jsp_ponto_diario set observacao = upper(observacao) where (observacao is not null and observacao <> upper(observacao));
update public.jsp_producao_terc set observacao = upper(observacao) where (observacao is not null and observacao <> upper(observacao));
update public.jsp_produtos set nome = upper(nome) where (nome is not null and nome <> upper(nome));
update public.jsp_terceirizados set nome = upper(nome), endereco = upper(endereco) where (nome is not null and nome <> upper(nome)) or (endereco is not null and endereco <> upper(endereco));
update public.jsp_usuarios set nome = upper(nome) where (nome is not null and nome <> upper(nome));
update public.jsp_vales set colaborador_nome = upper(colaborador_nome), observacao = upper(observacao) where (colaborador_nome is not null and colaborador_nome <> upper(colaborador_nome)) or (observacao is not null and observacao <> upper(observacao));

-- Triggers: forca MAIUSCULO em insert/update (whitelist por tabela)
create or replace function public.rv_upper_jsp_contas() returns trigger language plpgsql as $$
begin
  new.nome := upper(new.nome);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_contas on public.jsp_contas;
create trigger trg_upper_jsp_contas before insert or update on public.jsp_contas for each row execute function public.rv_upper_jsp_contas();

create or replace function public.rv_upper_jsp_equipe() returns trigger language plpgsql as $$
begin
  new.nome := upper(new.nome);
  new.endereco := upper(new.endereco);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_equipe on public.jsp_equipe;
create trigger trg_upper_jsp_equipe before insert or update on public.jsp_equipe for each row execute function public.rv_upper_jsp_equipe();

create or replace function public.rv_upper_jsp_fase() returns trigger language plpgsql as $$
begin
  new.nome := upper(new.nome);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_fase on public.jsp_fase;
create trigger trg_upper_jsp_fase before insert or update on public.jsp_fase for each row execute function public.rv_upper_jsp_fase();

create or replace function public.rv_upper_jsp_fornecedores() returns trigger language plpgsql as $$
begin
  new.nome := upper(new.nome);
  new.endereco := upper(new.endereco);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_fornecedores on public.jsp_fornecedores;
create trigger trg_upper_jsp_fornecedores before insert or update on public.jsp_fornecedores for each row execute function public.rv_upper_jsp_fornecedores();

create or replace function public.rv_upper_jsp_historico_precos() returns trigger language plpgsql as $$
begin
  new.observacao := upper(new.observacao);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_historico_precos on public.jsp_historico_precos;
create trigger trg_upper_jsp_historico_precos before insert or update on public.jsp_historico_precos for each row execute function public.rv_upper_jsp_historico_precos();

create or replace function public.rv_upper_jsp_logs() returns trigger language plpgsql as $$
begin
  new.produto_nome := upper(new.produto_nome);
  new.observacao := upper(new.observacao);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_logs on public.jsp_logs;
create trigger trg_upper_jsp_logs before insert or update on public.jsp_logs for each row execute function public.rv_upper_jsp_logs();

create or replace function public.rv_upper_jsp_medicoes_empreita() returns trigger language plpgsql as $$
begin
  new.descricao := upper(new.descricao);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_medicoes_empreita on public.jsp_medicoes_empreita;
create trigger trg_upper_jsp_medicoes_empreita before insert or update on public.jsp_medicoes_empreita for each row execute function public.rv_upper_jsp_medicoes_empreita();

create or replace function public.rv_upper_jsp_movimentacoes() returns trigger language plpgsql as $$
begin
  new.descricao := upper(new.descricao);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_movimentacoes on public.jsp_movimentacoes;
create trigger trg_upper_jsp_movimentacoes before insert or update on public.jsp_movimentacoes for each row execute function public.rv_upper_jsp_movimentacoes();

create or replace function public.rv_upper_jsp_obras() returns trigger language plpgsql as $$
begin
  new.nome := upper(new.nome);
  new.endereco := upper(new.endereco);
  new.solicitante := upper(new.solicitante);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_obras on public.jsp_obras;
create trigger trg_upper_jsp_obras before insert or update on public.jsp_obras for each row execute function public.rv_upper_jsp_obras();

create or replace function public.rv_upper_jsp_ponto_diario() returns trigger language plpgsql as $$
begin
  new.observacao := upper(new.observacao);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_ponto_diario on public.jsp_ponto_diario;
create trigger trg_upper_jsp_ponto_diario before insert or update on public.jsp_ponto_diario for each row execute function public.rv_upper_jsp_ponto_diario();

create or replace function public.rv_upper_jsp_producao_terc() returns trigger language plpgsql as $$
begin
  new.observacao := upper(new.observacao);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_producao_terc on public.jsp_producao_terc;
create trigger trg_upper_jsp_producao_terc before insert or update on public.jsp_producao_terc for each row execute function public.rv_upper_jsp_producao_terc();

create or replace function public.rv_upper_jsp_produtos() returns trigger language plpgsql as $$
begin
  new.nome := upper(new.nome);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_produtos on public.jsp_produtos;
create trigger trg_upper_jsp_produtos before insert or update on public.jsp_produtos for each row execute function public.rv_upper_jsp_produtos();

create or replace function public.rv_upper_jsp_terceirizados() returns trigger language plpgsql as $$
begin
  new.nome := upper(new.nome);
  new.endereco := upper(new.endereco);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_terceirizados on public.jsp_terceirizados;
create trigger trg_upper_jsp_terceirizados before insert or update on public.jsp_terceirizados for each row execute function public.rv_upper_jsp_terceirizados();

create or replace function public.rv_upper_jsp_usuarios() returns trigger language plpgsql as $$
begin
  new.nome := upper(new.nome);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_usuarios on public.jsp_usuarios;
create trigger trg_upper_jsp_usuarios before insert or update on public.jsp_usuarios for each row execute function public.rv_upper_jsp_usuarios();

create or replace function public.rv_upper_jsp_vales() returns trigger language plpgsql as $$
begin
  new.colaborador_nome := upper(new.colaborador_nome);
  new.observacao := upper(new.observacao);
  return new;
end $$;
drop trigger if exists trg_upper_jsp_vales on public.jsp_vales;
create trigger trg_upper_jsp_vales before insert or update on public.jsp_vales for each row execute function public.rv_upper_jsp_vales();

