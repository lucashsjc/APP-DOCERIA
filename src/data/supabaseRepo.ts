import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Repo } from './repo'
import type { Cliente, Pagamento, Pedido, Produto } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && chave)

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url!, chave!)
  : null

const BUCKET = 'fotos'

function erro(e: { message: string } | null) {
  if (e) throw new Error(e.message)
}

// O Postgres devolve "numeric" como texto e "time" como HH:MM:SS.
function lerPedido(linha: Record<string, unknown>): Pedido {
  const p = linha as unknown as Pedido
  return {
    ...p,
    horario: (p.horario ?? '').slice(0, 5),
    taxa_entrega: Number(p.taxa_entrega),
  }
}

function lerPagamento(linha: Record<string, unknown>): Pagamento {
  const pg = linha as unknown as Pagamento
  return { ...pg, valor: Number(pg.valor) }
}

function lerProduto(linha: Record<string, unknown>): Produto {
  const p = linha as unknown as Produto
  // As colunas categoria/descricao/unidade só existem depois do SQL 006.
  return {
    ...p,
    preco: Number(p.preco),
    categoria: p.categoria ?? '',
    descricao: p.descricao ?? '',
    unidade: p.unidade === 'cento' ? 'cento' : 'un',
    // Só existe depois do SQL 007.
    custo: Number(p.custo ?? 0),
  }
}

/**
 * Grava a linha; se o banco ainda não tiver alguma coluna nova (SQL da atualização não rodado),
 * tenta de novo sem essa coluna, para o app continuar funcionando até o SQL ser rodado.
 */
async function gravarComColunasOpcionais<T extends object>(
  gravar: (linha: T) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>,
  linha: T,
  opcionais: (keyof T)[],
) {
  const atual = { ...linha }
  let restantes = [...opcionais]
  let resultado = await gravar(atual)
  while (resultado.error?.code === 'PGRST204' && restantes.length > 0) {
    // A mensagem diz qual coluna falta ("Could not find the 'custo' column…"); sem isso, tira todas.
    const faltando = restantes.filter((c) => resultado.error!.message.includes(`'${String(c)}'`))
    const tirar = faltando.length ? faltando : restantes
    for (const campo of tirar) delete atual[campo]
    restantes = restantes.filter((c) => !tirar.includes(c))
    resultado = await gravar(atual)
  }
  erro(resultado.error)
  return resultado.data
}

export function criarRepoSupabase(): Repo {
  const db = supabase!

  return {
    async listarClientes() {
      const { data, error } = await db.from('clientes').select('*').order('nome')
      erro(error)
      return data as Cliente[]
    },
    async buscarCliente(id) {
      const { data, error } = await db.from('clientes').select('*').eq('id', id).maybeSingle()
      erro(error)
      return data as Cliente | null
    },
    async salvarCliente(dados, id) {
      const data = await gravarComColunasOpcionais(
        (linha) =>
          (id ? db.from('clientes').update(linha).eq('id', id) : db.from('clientes').insert(linha)).select().single(),
        dados,
        ['cpf', 'endereco'],
      )
      return data as Cliente
    },
    async excluirCliente(id) {
      const { error } = await db.from('clientes').delete().eq('id', id)
      if (error?.code === '23503') {
        throw new Error('Este cliente tem pedidos. Exclua os pedidos antes.')
      }
      erro(error)
    },

    async listarPedidos() {
      const { data, error } = await db.from('pedidos').select('*')
      erro(error)
      return (data ?? []).map(lerPedido)
    },
    async buscarPedido(id) {
      const { data, error } = await db.from('pedidos').select('*').eq('id', id).maybeSingle()
      erro(error)
      return data ? lerPedido(data) : null
    },
    async salvarPedido(dados, id) {
      const data = await gravarComColunasOpcionais(
        (linha) =>
          (id ? db.from('pedidos').update(linha).eq('id', id) : db.from('pedidos').insert(linha)).select().single(),
        { ...dados, horario: dados.horario || null },
        ['contrato'],
      )
      return lerPedido(data as Record<string, unknown>)
    },
    async excluirPedido(id) {
      const { error } = await db.from('pedidos').delete().eq('id', id)
      erro(error)
    },

    async listarPagamentos(pedidoId) {
      let consulta = db.from('pagamentos').select('id, pedido_id, data, valor, forma').order('data')
      if (pedidoId) consulta = consulta.eq('pedido_id', pedidoId)
      const { data, error } = await consulta
      erro(error)
      return (data ?? []).map(lerPagamento)
    },
    async salvarPagamento(dados) {
      const { data, error } = await db.from('pagamentos').insert(dados).select('id, pedido_id, data, valor, forma').single()
      erro(error)
      return lerPagamento(data!)
    },
    async excluirPagamento(id) {
      const { error } = await db.from('pagamentos').delete().eq('id', id)
      erro(error)
    },

    async listarProdutos() {
      const { data, error } = await db.from('produtos').select('*').order('nome')
      erro(error)
      return (data ?? []).map(lerProduto)
    },
    async salvarProduto(dados, id) {
      const data = await gravarComColunasOpcionais(
        (linha) =>
          (id ? db.from('produtos').update(linha).eq('id', id) : db.from('produtos').insert(linha)).select('*').single(),
        dados,
        ['categoria', 'descricao', 'unidade', 'custo'],
      )
      return lerProduto(data as Record<string, unknown>)
    },
    async excluirProduto(id) {
      const { error } = await db.from('produtos').delete().eq('id', id)
      erro(error)
    },

    async enviarFoto(foto) {
      const { data: sessao } = await db.auth.getUser()
      const caminho = `${sessao.user!.id}/${crypto.randomUUID()}.jpg`
      const { error } = await db.storage
        .from(BUCKET)
        .upload(caminho, foto, { contentType: 'image/jpeg' })
      erro(error)
      return caminho
    },
    async urlFoto(caminho) {
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(caminho, 60 * 60)
      erro(error)
      return data!.signedUrl
    },
    async excluirFoto(caminho) {
      const { error } = await db.storage.from(BUCKET).remove([caminho])
      erro(error)
    },
  }
}
