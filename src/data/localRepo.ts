import type { Repo } from './repo'
import type { Cliente, Pagamento, Pedido, Produto } from './types'

const CHAVE = 'doceria-demo'

interface Banco {
  clientes: Cliente[]
  pedidos: Pedido[]
  pagamentos: Pagamento[]
  produtos: Produto[]
  fotos: Record<string, string>
}

function ler(): Banco {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) return { pagamentos: [], produtos: [], ...JSON.parse(salvo) }
  } catch {
    // sem armazenamento: começa vazio
  }
  return { clientes: [], pedidos: [], pagamentos: [], produtos: [], fotos: {} }
}

function gravar(banco: Banco) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(banco))
  } catch {
    // modo demonstração: ignorar falha de armazenamento
  }
}

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result as string)
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsDataURL(blob)
  })
}

export function criarRepoLocal(): Repo {
  return {
    async listarClientes() {
      return ler().clientes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },
    async buscarCliente(id) {
      return ler().clientes.find((c) => c.id === id) ?? null
    },
    async salvarCliente(dados, id) {
      const banco = ler()
      const cliente: Cliente = { ...dados, id: id ?? crypto.randomUUID() }
      banco.clientes = [...banco.clientes.filter((c) => c.id !== cliente.id), cliente]
      gravar(banco)
      return cliente
    },
    async excluirCliente(id) {
      const banco = ler()
      if (banco.pedidos.some((p) => p.cliente_id === id)) {
        throw new Error('Este cliente tem pedidos. Exclua os pedidos antes.')
      }
      banco.clientes = banco.clientes.filter((c) => c.id !== id)
      gravar(banco)
    },

    async listarPedidos() {
      return ler().pedidos
    },
    async buscarPedido(id) {
      return ler().pedidos.find((p) => p.id === id) ?? null
    },
    async salvarPedido(dados, id) {
      const banco = ler()
      const anterior = banco.pedidos.find((p) => p.id === id)
      const pedido: Pedido = {
        ...dados,
        id: id ?? crypto.randomUUID(),
        criado_em: anterior?.criado_em ?? new Date().toISOString(),
      }
      banco.pedidos = [...banco.pedidos.filter((p) => p.id !== pedido.id), pedido]
      gravar(banco)
      return pedido
    },
    async excluirPedido(id) {
      const banco = ler()
      banco.pedidos = banco.pedidos.filter((p) => p.id !== id)
      banco.pagamentos = banco.pagamentos.filter((pg) => pg.pedido_id !== id)
      gravar(banco)
    },

    async listarPagamentos(pedidoId) {
      return ler().pagamentos.filter((pg) => !pedidoId || pg.pedido_id === pedidoId)
    },
    async salvarPagamento(dados) {
      const banco = ler()
      const pagamento: Pagamento = { ...dados, id: crypto.randomUUID() }
      banco.pagamentos.push(pagamento)
      gravar(banco)
      return pagamento
    },
    async excluirPagamento(id) {
      const banco = ler()
      banco.pagamentos = banco.pagamentos.filter((pg) => pg.id !== id)
      gravar(banco)
    },

    async listarProdutos() {
      return ler()
        .produtos.map((p) => ({ ...p, categoria: p.categoria ?? '', descricao: p.descricao ?? '', unidade: p.unidade ?? 'un' }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },
    async salvarProduto(dados, id) {
      const banco = ler()
      const produto: Produto = { ...dados, id: id ?? crypto.randomUUID() }
      banco.produtos = [...banco.produtos.filter((p) => p.id !== produto.id), produto]
      gravar(banco)
      return produto
    },
    async excluirProduto(id) {
      const banco = ler()
      banco.produtos = banco.produtos.filter((p) => p.id !== id)
      gravar(banco)
    },

    async enviarFoto(foto) {
      const banco = ler()
      const caminho = crypto.randomUUID()
      banco.fotos[caminho] = await blobParaDataUrl(foto)
      gravar(banco)
      return caminho
    },
    async urlFoto(caminho) {
      return ler().fotos[caminho] ?? ''
    },
    async excluirFoto(caminho) {
      const banco = ler()
      delete banco.fotos[caminho]
      gravar(banco)
    },
  }
}
