import type { Pedido } from '../data/types'

/** Só entra na produção o que já foi confirmado e ainda não ficou pronto. */
export function entraNaProducao(p: Pick<Pedido, 'status'>): boolean {
  return p.status === 'confirmado' || p.status === 'em_producao'
}

export interface ItemProducao {
  nome: string
  quantidade: number
  /** De quem é cada parte, para ela saber para qual pedido separar. */
  origens: { cliente: string; quantidade: number; pedidoId: string }[]
}

function chave(descricao: string) {
  return descricao.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
}

/** Soma os itens iguais (mesmo nome, ignorando maiúsculas e espaços) de vários pedidos. */
export function somarProducao(pedidos: (Pedido & { cliente: string })[]): ItemProducao[] {
  const mapa = new Map<string, ItemProducao>()
  for (const p of pedidos) {
    if (!entraNaProducao(p)) continue
    for (const item of p.itens) {
      const k = chave(item.descricao)
      const atual = mapa.get(k) ?? { nome: item.descricao.trim(), quantidade: 0, origens: [] }
      atual.quantidade += item.quantidade
      atual.origens.push({ cliente: p.cliente, quantidade: item.quantidade, pedidoId: p.id })
      mapa.set(k, atual)
    }
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export function formatarQuantidade(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}
