export const STATUS = [
  'orcamento',
  'confirmado',
  'em_producao',
  'pronto',
  'entregue',
  'cancelado',
] as const

export type Status = (typeof STATUS)[number]

export const STATUS_NOME: Record<Status, string> = {
  orcamento: 'Orçamento',
  confirmado: 'Confirmado',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export type TipoEntrega = 'entrega' | 'retirada'

export interface Cliente {
  id: string
  nome: string
  telefone: string
  observacoes: string
}

export interface ItemPedido {
  descricao: string
  quantidade: number
  valor_unitario: number
}

export interface Pedido {
  id: string
  cliente_id: string
  data_entrega: string // AAAA-MM-DD
  horario: string // HH:MM
  tipo: TipoEntrega
  endereco: string
  tema: string
  itens: ItemPedido[]
  taxa_entrega: number
  observacoes: string
  foto_path: string | null
  status: Status
  criado_em: string
}

export type NovoCliente = Omit<Cliente, 'id'>
export type NovoPedido = Omit<Pedido, 'id' | 'criado_em'>

export function totalPedido(p: Pick<Pedido, 'itens' | 'taxa_entrega'>): number {
  const itens = p.itens.reduce((soma, i) => soma + i.quantidade * i.valor_unitario, 0)
  return Math.round((itens + p.taxa_entrega) * 100) / 100
}
