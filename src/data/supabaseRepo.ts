import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Repo } from './repo'
import type { Cliente, Pedido } from './types'

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
      const consulta = id
        ? db.from('clientes').update(dados).eq('id', id)
        : db.from('clientes').insert(dados)
      const { data, error } = await consulta.select().single()
      erro(error)
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
      const linha = { ...dados, horario: dados.horario || null }
      const consulta = id
        ? db.from('pedidos').update(linha).eq('id', id)
        : db.from('pedidos').insert(linha)
      const { data, error } = await consulta.select().single()
      erro(error)
      return lerPedido(data)
    },
    async excluirPedido(id) {
      const { error } = await db.from('pedidos').delete().eq('id', id)
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
