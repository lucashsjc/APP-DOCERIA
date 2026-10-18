-- Cardápio inicial do Ateliê Doce Festa (portfólio 2026), com as fotos de cada produto.
-- Rodar no Supabase: SQL Editor → New query → colar tudo → Run.
-- Pode rodar mais de uma vez: cria o que faltar, não duplica produtos e só coloca
-- foto em produto que ainda não tem. As fotos ficam em public/produtos/ do app.
-- No SQL Editor não há usuária logada, então tudo vai para a conta da dona
-- (a única cadastrada em Authentication → Users).

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  preco numeric(10, 2) not null default 0 check (preco >= 0),
  criado_em timestamptz not null default now()
);

alter table produtos add column if not exists foto text;

alter table produtos enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'produtos' and policyname = 'dona dos produtos') then
    create policy "dona dos produtos" on produtos
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

with dona as (select id from auth.users order by created_at limit 1),
novo (nome, preco, foto) as (values
    ('Pirulito de chocolate 2D', 10.80, '/produtos/pirulito-de-chocolate-2d.jpg'),
    ('Mini cupcake 2D', 12.80, '/produtos/mini-cupcake-2d.jpg'),
    ('Pão de mel no canudo 2D', 16.80, '/produtos/pao-de-mel-no-canudo-2d.jpg'),
    ('Popsicle 2D', 16.80, '/produtos/popsicle-2d.jpg'),
    ('Cone trufado 2D', 25.90, '/produtos/cone-trufado-2d.jpg'),
    ('Trufa 2D', 8.50, '/produtos/trufa-2d.jpg'),
    ('Pão de mel 3D', 28.50, '/produtos/pao-de-mel-3d.jpg'),
    ('Trufa dupla 3D', 29.50, '/produtos/trufa-dupla-3d.jpg'),
    ('Cilindro cake 3D', 35.00, '/produtos/cilindro-cake-3d.jpg'),
    ('Mini cupcake 3D', 19.90, '/produtos/mini-cupcake-3d.jpg'),
    ('Trufa meia esfera topo 3D', 25.90, '/produtos/trufa-meia-esfera-topo-3d.jpg'),
    ('Carro palha italiana 3D', 38.50, '/produtos/carro-palha-italiana-3d.jpg'),
    ('Meio cilindro 3D', 35.00, '/produtos/meio-cilindro-3d.jpg'),
    ('Esfera trufada 3D', 34.90, '/produtos/esfera-trufada-3d.jpg'),
    ('Cubo trufado 3D', 18.90, '/produtos/cubo-trufado-3d.jpg'),
    ('Pop cake 3D', 15.50, '/produtos/pop-cake-3d.jpg'),
    ('Torre de trufas (aprox. 35 trufas)', 350.00, '/produtos/torre-de-trufas.jpg'),
    ('Torre de donuts (aprox. 34 mini donuts)', 295.00, '/produtos/torre-de-donuts.jpg'),
    ('Torre de suspiro 30 cm', 165.00, '/produtos/torre-de-suspiro.jpg'),
    ('Torre de suspiro 50 cm', 240.00, '/produtos/torre-de-suspiro.jpg')
),
cadastrados as (
  insert into produtos (user_id, nome, preco, foto)
  select dona.id, novo.nome, novo.preco, novo.foto from dona, novo
  where not exists (select 1 from produtos p where p.user_id = dona.id and lower(p.nome) = lower(novo.nome))
  returning id
)
update produtos p set foto = novo.foto
from novo, dona
where p.user_id = dona.id and lower(p.nome) = lower(novo.nome) and p.foto is null;
