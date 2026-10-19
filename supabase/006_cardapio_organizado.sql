-- Cardápio organizado: categoria, descrição e forma de venda (por cento ou por unidade),
-- mais os brigadeiros e o aplique de pasta americana.
-- Rodar no Supabase: SQL Editor → New query → colar tudo → Run.
-- Pode rodar mais de uma vez: não duplica produtos e não sobrescreve o que ela já editou.

alter table produtos add column if not exists categoria text not null default '';
alter table produtos add column if not exists descricao text not null default '';
alter table produtos add column if not exists unidade text not null default 'un';

-- Produtos que já estavam no cardápio ganham a categoria.
update produtos set categoria = 'Doces 2D' where categoria = '' and lower(nome) in ('pirulito de chocolate 2d', 'mini cupcake 2d', 'pão de mel no canudo 2d', 'popsicle 2d', 'cone trufado 2d', 'trufa 2d');
update produtos set categoria = 'Doces 3D' where categoria = '' and lower(nome) in ('pão de mel 3d', 'trufa dupla 3d', 'cilindro cake 3d', 'mini cupcake 3d', 'trufa meia esfera topo 3d', 'carro palha italiana 3d', 'meio cilindro 3d', 'esfera trufada 3d', 'cubo trufado 3d', 'pop cake 3d');
update produtos set categoria = 'Topiarias' where categoria = '' and lower(nome) in ('torre de trufas (aprox. 35 trufas)', 'torre de donuts (aprox. 34 mini donuts)', 'torre de suspiro 30 cm', 'torre de suspiro 50 cm');
update produtos set descricao = 'Contém aproximadamente 35 trufas, com 1 topo no tema da festa.' where descricao = '' and lower(nome) = 'torre de trufas (aprox. 35 trufas)';
update produtos set descricao = 'Contém aproximadamente 34 mini donuts, personalizada com o tema da festa.' where descricao = '' and lower(nome) = 'torre de donuts (aprox. 34 mini donuts)';

-- Brigadeiros (18g, preço por unidade; o cardápio mostra o cento e o meio cento) e o aplique.
with dona as (select id from auth.users order by created_at limit 1),
novo (nome, categoria, preco, unidade, descricao, foto) as (values
    ('Brigadeiro premium maracujá', 'Brigadeiros premium', 3.50, 'cento', 'Brigadeiro de maracujá, com massa cremosa feita com a própria fruta, finalizado com granulado de chocolate branco nobre Melken.', '/produtos/brigadeiro-premium-maracuja.jpg'),
    ('Brigadeiro premium limão', 'Brigadeiros premium', 3.50, 'cento', 'Brigadeiro de limão, com massa cremosa feita com a própria fruta, finalizado com granulado de chocolate branco nobre Melken.', '/produtos/brigadeiro-premium-limao.jpg'),
    ('Brigadeiro Ninho com Nutella', 'Brigadeiros especiais', 2.50, 'cento', 'Massa cremosa de leite ninho, finalizada com pitanga de Nutella.', '/produtos/brigadeiro-ninho-nutella.jpg'),
    ('Brigadeiro de chocolate', 'Brigadeiros especiais', 2.50, 'cento', 'Massa cremosa de chocolate 50% cacau, finalizada com granule de chocolate nobre meio amargo.', '/produtos/brigadeiro-chocolate.jpg'),
    ('Brigadeiro de churros', 'Brigadeiros especiais', 2.50, 'cento', 'Massa cremosa de leite ninho, passada no leite em pó com canela e finalizada com uma pitanga de doce de leite.', '/produtos/brigadeiro-churros.jpg'),
    ('Brigadeiro confete', 'Brigadeiros especiais', 2.50, 'cento', 'Massa cremosa de chocolate 50% cacau, finalizada com confeitos sabor chocolate.', '/produtos/brigadeiro-confete.jpg'),
    ('Brigadeiro color personalizado', 'Brigadeiros personalizados', 3.00, 'cento', 'Sabor ninho, colorido e personalizado com o tema da festa.', '/produtos/brigadeiro-color.jpg'),
    ('Brigadeiro aveludado personalizado', 'Brigadeiros personalizados', 3.00, 'cento', 'Sabor ninho, com acabamento aveludado e personalizado com o tema da festa.', '/produtos/brigadeiro-aveludado.jpg'),
    ('Brigadeiro ejetado', 'Brigadeiros personalizados', 3.50, 'cento', 'Sabor ninho, com formatos ejetados no tema da festa.', '/produtos/brigadeiro-ejetado.jpg'),
    ('Brigadeiro flores', 'Brigadeiros personalizados', 3.50, 'cento', 'Sabor ninho, decorado com flores.', '/produtos/brigadeiro-flores.jpg'),
    ('Aplique de pasta americana', 'Adicionais', 1.00, 'un', 'Aplique decorativo para os doces (borboletas, flores e outros). Preço por unidade.', '/produtos/aplique-pasta-americana.jpg')
)
insert into produtos (user_id, nome, categoria, preco, unidade, descricao, foto)
select dona.id, novo.nome, novo.categoria, novo.preco, novo.unidade, novo.descricao, novo.foto from dona, novo
where not exists (select 1 from produtos p where p.user_id = dona.id and lower(p.nome) = lower(novo.nome));
