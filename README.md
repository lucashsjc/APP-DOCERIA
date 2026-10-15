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

## Rodar no computador

```bash
npm install
npm run dev
```

Sem o Supabase configurado, o app abre em **modo demonstração**: os dados ficam só naquele navegador.

## Configurar a nuvem (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) (de preferência com o e-mail da dona).
2. Em **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
   Depois, numa consulta nova, faça o mesmo com [`supabase/002_pagamentos.sql`](supabase/002_pagamentos.sql).
3. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**.
4. Em **Authentication → Users**, clique em **Add user** e crie o usuário da dona com e-mail e senha.
5. Copie `.env.example` para `.env.local` e preencha com a **Project URL** e a **anon key**
   (em **Project Settings → API**).

## Publicar (Vercel)

1. Em [vercel.com](https://vercel.com), importe este repositório.
2. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Depois de publicado, abra o endereço no Safari do iPhone → **Compartilhar** →
   **Adicionar à Tela de Início**.
