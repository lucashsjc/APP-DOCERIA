-- Cardápio inicial do Ateliê Doce Festa (portfólio 2026).
-- Rodar uma vez no Supabase: SQL Editor → New query → colar tudo → Run.
-- Cria a tabela de produtos se ela ainda não existir e cadastra os produtos
-- na conta da dona. Pode rodar de novo sem duplicar: produtos com o mesmo nome são pulados.

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  preco numeric(10, 2) not null default 0 check (preco >= 0),
  criado_em timestamptz not null default now()
);

alter table produtos enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'produtos' and policyname = 'dona dos produtos') then
    create policy "dona dos produtos" on produtos
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- No SQL Editor não há usuária logada, então os produtos vão para a conta da dona
-- (a única cadastrada em Authentication → Users).
insert into produtos (user_id, nome, preco)
select dona.id, novo.nome, novo.preco
from (select id from auth.users order by created_at limit 1) as dona,
  (values
    -- Doces 2D (decoração plana)
    ('Pirulito de chocolate 2D', 10.80),
    ('Mini cupcake 2D', 12.80),
    ('Pão de mel no canudo 2D', 16.80),
    ('Popsicle 2D', 16.80),
    ('Cone trufado 2D', 25.90),
    ('Trufa 2D', 8.50),
    -- Doces 3D (modelagem em alto relevo)
    ('Pão de mel 3D', 28.50),
    ('Trufa dupla 3D', 29.50),
    ('Cilindro cake 3D', 35.00),
    ('Mini cupcake 3D', 19.90),
    ('Trufa meia esfera topo 3D', 25.90),
    ('Carro palha italiana 3D', 38.50),
    ('Meio cilindro 3D', 35.00),
    ('Esfera trufada 3D', 34.90),
    ('Cubo trufado 3D', 18.90),
    ('Pop cake 3D', 15.50),
    -- Topiarias
    ('Torre de trufas (aprox. 35 trufas)', 350.00),
    ('Torre de donuts (aprox. 34 mini donuts)', 295.00),
    ('Torre de suspiro 30 cm', 165.00),
    ('Torre de suspiro 50 cm', 240.00)
  ) as novo (nome, preco)
where not exists (
  select 1 from produtos p where p.user_id = dona.id and lower(p.nome) = lower(novo.nome)
);
