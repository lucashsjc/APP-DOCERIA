import type { Pedido } from '../data/types'
import { formatarData, formatarMoeda } from './format'

/** Mensagem educada de cobrança para mandar pelo WhatsApp. */
export function mensagemCobranca(nomeCliente: string, valor: number, pedidos: Pedido[]): string {
  const nome = nomeCliente.split(' ')[0]
  const referencia =
    pedidos.length === 1
      ? `do pedido de ${formatarData(pedidos[0].data_entrega)}${pedidos[0].tema ? ` (${pedidos[0].tema})` : ''}`
      : 'dos seus pedidos'
  return `Oi, ${nome}! Tudo bem? Passando para lembrar do valor de ${formatarMoeda(valor)} que ficou em aberto ${referencia}. Qualquer dúvida, é só me chamar. Obrigada! 🧁`
}
