-- Etapa 2: pagamentos dos pedidos.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar tudo → Run.

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  pedido_id uuid not null references pedidos on delete cascade,
  data date not null default current_date,
  valor numeric(10, 2) not null check (valor > 0),
  forma text not null default 'pix' check (forma in ('pix', 'dinheiro', 'cartao')),
  criado_em timestamptz not null default now()
);

create index pagamentos_pedido on pagamentos (pedido_id);
create index pagamentos_data on pagamentos (data);

alter table pagamentos enable row level security;

create policy "dona dos pagamentos" on pagamentos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
