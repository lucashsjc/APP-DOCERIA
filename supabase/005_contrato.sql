-- Contratos: CPF e endereço do cliente (opcionais) e os dados do contrato de cada pedido.
-- Rodar no Supabase: SQL Editor → New query → colar tudo → Run. Pode rodar mais de uma vez.

alter table clientes add column if not exists cpf text not null default '';
alter table clientes add column if not exists endereco text not null default '';

alter table pedidos add column if not exists contrato jsonb;
