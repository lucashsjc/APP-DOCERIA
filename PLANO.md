# App da Doceria — Plano

App para a dona de uma loja de doces organizar pedidos, clientes, agenda e recebimentos.

## Uso

- Uma loja, uma usuária (só a dona), no iPhone.
- PWA (site que funciona como app, com ícone na tela inicial), gratuito.
- Sempre com internet; não precisa funcionar offline.
- Dados na nuvem (Supabase, plano gratuito). Login uma vez pelo e-mail dela.
- Cadastro de novas contas desligado; regras no banco só permitem acesso à conta dela.
- Recomendado: conta do Supabase criada com o e-mail da dona.

## Pedidos

- Cliente (do cadastro de clientes).
- Itens digitados à mão (sem cardápio cadastrado).
- Observações: tema da festa, texto no bolo, alergias.
- Data e horário exato da entrega ou retirada.
- Entrega ou retirada; endereço digitado + botão "abrir no Mapas".
- Valor total, taxa de entrega, foto de referência.
- Status: orçamento → confirmado → em produção → pronto → entregue → cancelado.

## Clientes

- Nome e telefone, com histórico de pedidos.

## Calendário

- Calendário dentro do app (pedidos por dia, semana e mês).
- Sem integração com o calendário do iPhone: a agenda do app é suficiente (decidido em out/2026).

## Financeiro

- Vários pagamentos por pedido (data, valor, forma: Pix, dinheiro, cartão).
- Painel: vendido no mês, recebido, a receber, quem deve quanto.
- Pagamentos atrasados em destaque + botão que abre o WhatsApp com mensagem de cobrança pronta.
- Sem controle de custos por enquanto.

## Etapas

1. ✅ Clientes e pedidos.
2. ✅ Pagamentos e painel financeiro.
3. ✅ Calendário dentro do app.
4. ~~Assinatura da agenda do iPhone~~ — cancelada; a agenda do app é suficiente.

Os pedidos do caderno serão digitados à mão depois que o app estiver pronto.
