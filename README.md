# App da Doceria

App (PWA) para a loja organizar pedidos, clientes, agenda e recebimentos. O plano completo está em [PLANO.md](PLANO.md).

## O que já funciona

**Etapa 1**

- Pedidos: cliente, data e horário, entrega ou retirada, endereço com "Abrir no Mapas", tema,
  itens com quantidade e valor, taxa de entrega, total automático, observações, foto e status.
- Lista de pedidos agrupada por dia, com filtros (próximos, entregues, cancelados, todos),
  busca e aviso de pedidos atrasados.
- Clientes: cadastro, busca, histórico de pedidos e botão do WhatsApp.

**Etapa 2**
- Pagamentos por pedido (data, valor, Pix/dinheiro/cartão), com quanto já foi pago e quanto falta.
- Aba Financeiro: vendido e recebido no mês, total a receber, atrasados e quem está devendo.
- Botão "Cobrar" que abre o WhatsApp do cliente com a mensagem pronta.
- Orçamentos e pedidos cancelados não contam como venda nem como dívida. Um pedido fica
  atrasado quando a data de entrega já passou e ainda falta receber.

**Etapa 3**
- Aba Agenda: mês em grade com a quantidade de pedidos por dia, ou semana em lista.
- Tocar num dia mostra os pedidos dele; "+ Novo pedido neste dia" já preenche a data.
- Cancelados não aparecem; orçamentos aparecem mais apagados.

**Melhorias**
- Cardápio: produtos com preço; no pedido, o nome é sugerido e o preço vem sozinho.
- Produção (na Agenda): soma dos itens dos pedidos confirmados e em produção, do dia ou da semana.
- Enviar orçamento/comprovante: gera uma imagem com o logo da loja e abre o compartilhar do celular.
- Fotos dos produtos no cardápio (recortadas do portfólio) e miniaturas nos itens do pedido.
- Cardápio organizado em seções (brigadeiros, doces 3D/2D, topiarias, adicionais), com descrição
  e preço por unidade ou por cento (mostra o cento e o meio cento).
- Botão "Enviar cardápio em PDF": gera o cardápio em A4, com fotos e preços, para mandar às clientes
  (o cardápio todo ou só a seção escolhida).

**Contratos**
- Dois modelos: encomenda de doces e locação de bolo cenográfico (texto da loja).
- Preenchidos com os dados do pedido e do cliente (CPF e endereço opcionais, só no contrato),
  com sinal de 50% e restante até a véspera calculados sozinhos.
- Prévia na tela, PDF para enviar, mensagem pedindo "ACEITO" no WhatsApp e registro do aceite.
- Dados da contratada e valores (reposição, multa, pedido mínimo) em `src/marca.ts`.

**Relatórios** (Financeiro → Relatórios), em painéis escuros no estilo de dashboard
- Períodos de 3, 6 ou 12 meses (por semana ou por mês).
- Indicadores com variação sobre o período anterior e minigráfico: faturamento, pedidos,
  ticket médio e recebido.
- Faturamento empilhado por categoria (Doces 3D, Doces 2D, Topiarias, Outros e taxas), com
  leitura ao tocar, categorias que ligam/desligam e versão em tabela.
- Mapa de atividade das últimas 12 semanas, dia mais movimentado e maior pedido.
- Produtos mais vendidos, por faturamento ou quantidade.

## Rodar no computador

```bash
npm install
npm run dev
```

Sem o Supabase configurado, o app abre em **modo demonstração**: os dados ficam só naquele navegador.

## Configurar a nuvem (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) (de preferência com o e-mail da dona).
2. Em **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
   Depois, numa consulta nova de cada vez, faça o mesmo com [`supabase/002_pagamentos.sql`](supabase/002_pagamentos.sql)
   e [`supabase/003_produtos.sql`](supabase/003_produtos.sql), [`004_cardapio_inicial.sql`](supabase/004_cardapio_inicial.sql)
   , [`005_contrato.sql`](supabase/005_contrato.sql) e [`006_cardapio_organizado.sql`](supabase/006_cardapio_organizado.sql).
3. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**.
4. Em **Authentication → Users**, clique em **Add user** e crie o usuário da dona com e-mail e senha.
5. Copie `.env.example` para `.env.local` e preencha com a **Project URL** e a **anon key**
   (em **Project Settings → API**).

## Publicar (Vercel)

1. Em [vercel.com](https://vercel.com), importe este repositório.
2. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Depois de publicado, abra o endereço no Safari do iPhone → **Compartilhar** →
   **Adicionar à Tela de Início**.
