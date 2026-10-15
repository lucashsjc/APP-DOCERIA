-- Banco de dados do App da Doceria.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar tudo → Run.

create table clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  telefone text not null default '',
  observacoes text not null default '',
  criado_em timestamptz not null default now()
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  cliente_id uuid not null references clientes on delete restrict,
  data_entrega date not null,
  horario time,
  tipo text not null default 'retirada' check (tipo in ('entrega', 'retirada')),
  endereco text not null default '',
  tema text not null default '',
  itens jsonb not null default '[]',
  taxa_entrega numeric(10, 2) not null default 0,
  observacoes text not null default '',
  foto_path text,
  status text not null default 'orcamento'
    check (status in ('orcamento', 'confirmado', 'em_producao', 'pronto', 'entregue', 'cancelado')),
  criado_em timestamptz not null default now()
);

create index pedidos_data_entrega on pedidos (data_entrega);
create index pedidos_cliente on pedidos (cliente_id);

-- Cada usuária só enxerga e altera os próprios dados.
alter table clientes enable row level security;
alter table pedidos enable row level security;

create policy "dona dos clientes" on clientes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "dona dos pedidos" on pedidos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fotos de referência: bucket privado, uma pasta por usuária.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false);

create policy "dona das fotos" on storage.objects
  for all using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
