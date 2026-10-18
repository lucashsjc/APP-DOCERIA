-- Cardápio: produtos com preço, usados para preencher os itens dos pedidos.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar tudo → Run.

create table produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  preco numeric(10, 2) not null default 0 check (preco >= 0),
  criado_em timestamptz not null default now()
);

alter table produtos enable row level security;

create policy "dona dos produtos" on produtos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
