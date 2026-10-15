import type { Cliente, NovoCliente, NovoPedido, Pedido } from './types'
import { criarRepoLocal } from './localRepo'
import { criarRepoSupabase, supabaseConfigurado } from './supabaseRepo'

export interface Repo {
  listarClientes(): Promise<Cliente[]>
  buscarCliente(id: string): Promise<Cliente | null>
  salvarCliente(dados: NovoCliente, id?: string): Promise<Cliente>
  excluirCliente(id: string): Promise<void>

  listarPedidos(): Promise<Pedido[]>
  buscarPedido(id: string): Promise<Pedido | null>
  salvarPedido(dados: NovoPedido, id?: string): Promise<Pedido>
  excluirPedido(id: string): Promise<void>

  /** Guarda a foto e devolve o caminho a salvar em `foto_path`. */
  enviarFoto(foto: Blob): Promise<string>
  urlFoto(caminho: string): Promise<string>
  excluirFoto(caminho: string): Promise<void>
}

/** Sem Supabase configurado, o app roda em modo demonstração, com dados só neste navegador. */
export const modoDemonstracao = !supabaseConfigurado

export const repo: Repo = supabaseConfigurado ? criarRepoSupabase() : criarRepoLocal()
