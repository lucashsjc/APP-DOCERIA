import { contaComoVenda, type ItemPedido, type Pedido, type Produto } from '../data/types'

const chave = (nome: string) => nome.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')

/** Produtos do cardápio pelo nome, para achar o custo dos itens do pedido. */
export function mapaDeProdutos(produtos: Produto[]): Map<string, Produto> {
  return new Map(produtos.map((p) => [chave(p.nome), p]))
}

/** Custo da unidade do item: o guardado no pedido ou, se não houver, o atual do cardápio. */
export function custoDoItem(item: ItemPedido, produtos: Map<string, Produto>): number | null {
  if (item.custo_unitario != null && item.custo_unitario > 0) return item.custo_unitario
  const custo = produtos.get(chave(item.descricao))?.custo ?? 0
  return custo > 0 ? custo : null
}

export interface Lucro {
  /** Vendido nos itens que têm custo. */
  receita: number
  custo: number
  lucro: number
  /** Vendido em itens sem custo informado (fica fora da conta do lucro). */
  semCusto: number
}

export const lucroVazio = (): Lucro => ({ receita: 0, custo: 0, lucro: 0, semCusto: 0 })

/** Lucro dos doces do pedido (a taxa de entrega fica de fora). */
export function lucroPedido(pedido: Pick<Pedido, 'itens'>, produtos: Map<string, Produto>, soma = lucroVazio()): Lucro {
  for (const item of pedido.itens) {
    const venda = item.quantidade * item.valor_unitario
    const custo = custoDoItem(item, produtos)
    if (custo == null) {
      soma.semCusto += venda
      continue
    }
    soma.receita += venda
    soma.custo += item.quantidade * custo
  }
  soma.lucro = soma.receita - soma.custo
  return soma
}

export function lucroDosPedidos(pedidos: Pedido[], produtos: Map<string, Produto>): Lucro {
  const soma = lucroVazio()
  for (const p of pedidos) if (contaComoVenda(p)) lucroPedido(p, produtos, soma)
  return soma
}

/** Margem em % sobre o preço de venda. */
export function margem(preco: number, custo: number): number {
  return preco > 0 ? ((preco - custo) / preco) * 100 : 0
}
