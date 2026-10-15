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

export const FORMAS_PAGAMENTO = ['pix', 'dinheiro', 'cartao'] as const

export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]

export const FORMA_NOME: Record<FormaPagamento, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
}

export interface Pagamento {
  id: string
  pedido_id: string
  data: string // AAAA-MM-DD
  valor: number
  forma: FormaPagamento
}

export type NovoCliente = Omit<Cliente, 'id'>
export type NovoPedido = Omit<Pedido, 'id' | 'criado_em'>
export type NovoPagamento = Omit<Pagamento, 'id'>

export function totalPedido(p: Pick<Pedido, 'itens' | 'taxa_entrega'>): number {
  const itens = p.itens.reduce((soma, i) => soma + i.quantidade * i.valor_unitario, 0)
  return Math.round((itens + p.taxa_entrega) * 100) / 100
}

/** Orçamentos e cancelados não contam como venda nem como dívida. */
export function contaComoVenda(p: Pick<Pedido, 'status'>): boolean {
  return p.status !== 'orcamento' && p.status !== 'cancelado'
}

export function totalPago(pedidoId: string, pagamentos: Pagamento[]): number {
  const soma = pagamentos.filter((pg) => pg.pedido_id === pedidoId).reduce((s, pg) => s + pg.valor, 0)
  return Math.round(soma * 100) / 100
}

/** Quanto falta receber deste pedido (nunca negativo; zero se não conta como venda). */
export function saldoPedido(p: Pedido, pagamentos: Pagamento[]): number {
  if (!contaComoVenda(p)) return 0
  return Math.max(0, Math.round((totalPedido(p) - totalPago(p.id, pagamentos)) * 100) / 100)
}
