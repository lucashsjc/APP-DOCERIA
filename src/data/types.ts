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
  /** Só para contratos; nunca aparece nas listas. */
  cpf: string
  endereco: string
}

export interface ItemPedido {
  descricao: string
  quantidade: number
  valor_unitario: number
  /** Custo da unidade quando o pedido foi salvo (vem do cardápio). Sem ele, usa o custo atual do produto. */
  custo_unitario?: number
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
  contrato: DadosContrato | null
  criado_em: string
}

export type ModeloContrato = 'doces' | 'locacao'

export const MODELO_NOME: Record<ModeloContrato, string> = {
  doces: 'Encomenda de doces',
  locacao: 'Locação de bolo cenográfico',
}

/** O que o contrato precisa além do que o pedido já tem. */
export interface DadosContrato {
  modelo: ModeloContrato
  local: string
  horario_entrega: string
  /** Locação: descrição do bolo e do andar verdadeiro. */
  objeto: string
  acessorios: string
  devolucao_data: string
  devolucao_hora: string
  enviado_em?: string
  aceito_em?: string
  aceite?: 'whatsapp' | 'govbr'
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

export interface Produto {
  id: string
  nome: string
  preco: number
  /** Caminho no armazenamento, ou endereço fixo do app (começa com "/") para as fotos do portfólio. */
  foto: string | null
  /** Seção do cardápio, ex.: "Brigadeiros especiais". Vazio = "Outros". */
  categoria: string
  descricao: string
  /** "cento": preço é por unidade, mas o cardápio mostra o cento e o meio cento. */
  unidade: 'un' | 'cento'
  /** Quanto custa fazer uma unidade (ingredientes, embalagem). 0 = não informado. */
  custo: number
}

export type NovoCliente = Omit<Cliente, 'id'>
export type NovoPedido = Omit<Pedido, 'id' | 'criado_em'>
export type NovoPagamento = Omit<Pagamento, 'id'>
export type NovoProduto = Omit<Produto, 'id'>

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
