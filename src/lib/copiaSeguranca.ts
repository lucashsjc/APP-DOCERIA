import { repo } from '../data/repo'
import { FORMA_NOME, STATUS_NOME, totalPago, totalPedido, type Cliente } from '../data/types'
import { custoDoItem, lucroPedido, mapaDeProdutos, margem } from './lucro'
import { gerarXlsx, type Aba } from './xlsx'

const CHAVE_ULTIMA = 'doceria-ultima-copia'

/** Data (AAAA-MM-DD) da última cópia baixada neste aparelho, se houver. */
export function ultimaCopia(): string | null {
  try {
    return localStorage.getItem(CHAVE_ULTIMA)
  } catch {
    return null
  }
}

/** Chamar depois que a planilha foi salva ou enviada. */
export function marcarCopia(dia: string) {
  try {
    localStorage.setItem(CHAVE_ULTIMA, dia)
  } catch {
    // Sem armazenamento (navegação privada): só não lembra a data.
  }
}

/** Busca tudo na nuvem e monta a planilha (pedidos, itens, pagamentos, clientes e cardápio). */
export async function gerarCopiaDeSeguranca(): Promise<Blob> {
  const [pedidos, pagamentos, clientes, produtos] = await Promise.all([
    repo.listarPedidos(),
    repo.listarPagamentos(),
    repo.listarClientes(),
    repo.listarProdutos(),
  ])
  const porId = new Map<string, Cliente>(clientes.map((c) => [c.id, c]))
  const cardapio = mapaDeProdutos(produtos)
  const ordenados = [...pedidos].sort((a, b) => b.data_entrega.localeCompare(a.data_entrega))
  const nomeCliente = (id: string) => porId.get(id)?.nome ?? ''

  const abaPedidos: Aba = {
    nome: 'Pedidos',
    colunas: [
      'Entrega',
      'Horário',
      'Cliente',
      'Telefone',
      'Tema',
      'Status',
      'Retirada/Entrega',
      'Endereço',
      'Itens',
      'Taxa de entrega',
      'Total',
      'Pago',
      'Falta pagar',
      'Lucro estimado',
      'Observações',
    ],
    linhas: ordenados.map((p) => {
      const total = totalPedido(p)
      const pago = totalPago(p.id, pagamentos)
      const lucro = lucroPedido(p, cardapio)
      return [
        { data: p.data_entrega },
        p.horario,
        nomeCliente(p.cliente_id),
        porId.get(p.cliente_id)?.telefone ?? '',
        p.tema,
        STATUS_NOME[p.status],
        p.tipo === 'entrega' ? 'Entrega' : 'Retirada',
        p.endereco,
        p.itens.map((i) => `${i.quantidade}× ${i.descricao}`).join('; '),
        { moeda: p.taxa_entrega },
        { moeda: total },
        { moeda: pago },
        { moeda: p.status === 'cancelado' ? 0 : Math.max(0, total - pago) },
        lucro.receita > 0 ? { moeda: lucro.lucro } : null,
        p.observacoes,
      ]
    }),
  }

  const abaItens: Aba = {
    nome: 'Itens dos pedidos',
    colunas: ['Entrega', 'Cliente', 'Status', 'Produto', 'Quantidade', 'Valor da unidade', 'Subtotal', 'Custo da unidade'],
    linhas: ordenados.flatMap((p) =>
      p.itens.map((i) => {
        const custo = custoDoItem(i, cardapio)
        return [
          { data: p.data_entrega },
          nomeCliente(p.cliente_id),
          STATUS_NOME[p.status],
          i.descricao,
          i.quantidade,
          { moeda: i.valor_unitario },
          { moeda: i.quantidade * i.valor_unitario },
          custo == null ? null : { moeda: custo },
        ]
      }),
    ),
  }

  const pedidoPorId = new Map(pedidos.map((p) => [p.id, p]))
  const abaPagamentos: Aba = {
    nome: 'Pagamentos',
    colunas: ['Data', 'Cliente', 'Pedido (entrega)', 'Tema', 'Valor', 'Forma'],
    linhas: [...pagamentos]
      .sort((a, b) => b.data.localeCompare(a.data))
      .map((pg) => {
        const p = pedidoPorId.get(pg.pedido_id)
        return [
          { data: pg.data },
          p ? nomeCliente(p.cliente_id) : '',
          p ? { data: p.data_entrega } : null,
          p?.tema ?? '',
          { moeda: pg.valor },
          FORMA_NOME[pg.forma] ?? pg.forma,
        ]
      }),
  }

  const abaClientes: Aba = {
    nome: 'Clientes',
    colunas: ['Nome', 'Telefone', 'CPF', 'Endereço', 'Pedidos', 'Total comprado', 'Observações'],
    linhas: [...clientes]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((c) => {
        const deles = pedidos.filter((p) => p.cliente_id === c.id && p.status !== 'cancelado' && p.status !== 'orcamento')
        return [
          c.nome,
          c.telefone,
          c.cpf,
          c.endereco,
          deles.length,
          { moeda: deles.reduce((s, p) => s + totalPedido(p), 0) },
          c.observacoes,
        ]
      }),
  }

  const abaCardapio: Aba = {
    nome: 'Cardápio',
    colunas: ['Seção', 'Produto', 'Descrição', 'Vende por', 'Preço da unidade', 'Custo da unidade', 'Margem'],
    linhas: [...produtos]
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((p) => [
        p.categoria,
        p.nome,
        p.descricao,
        p.unidade === 'cento' ? 'Cento' : 'Unidade',
        { moeda: p.preco },
        p.custo > 0 ? { moeda: p.custo } : null,
        p.custo > 0 ? { porcento: margem(p.preco, p.custo) / 100 } : null,
      ]),
  }

  return gerarXlsx([abaPedidos, abaItens, abaPagamentos, abaClientes, abaCardapio])
}
