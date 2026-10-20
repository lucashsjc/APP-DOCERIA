-- Custo de cada produto, para o app calcular o lucro dos pedidos e dos relatórios.
-- Rodar no Supabase: SQL Editor → New query → colar tudo → Run.
-- Pode rodar mais de uma vez.

alter table produtos add column if not exists custo numeric(10,2) not null default 0;
