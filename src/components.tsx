import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { STATUS_NOME, contaComoVenda, totalPedido, type Pedido, type Status } from './data/types'
import { formatarMoeda } from './lib/format'

export function Cabecalho({ titulo, voltar, acao }: { titulo: string; voltar?: boolean; acao?: ReactNode }) {
  const navegar = useNavigate()
  return (
    <header className="cabecalho">
      {voltar && (
        <button className="voltar" onClick={() => navegar(-1)} aria-label="Voltar">
          ‹
        </button>
      )}
      <h1>{titulo}</h1>
      {acao}
    </header>
  )
}

export function StatusSelo({ status }: { status: Status }) {
  return <span className={`selo selo-${status}`}>{STATUS_NOME[status]}</span>
}

export function Estado({ erro, carregando }: { erro: string | null; carregando: boolean }) {
  if (erro) return <p className="erro">Erro: {erro}</p>
  if (carregando) return <p className="vazio">Carregando…</p>
  return null
}

/** Cartão de um pedido nas listas. `saldo` é quanto falta receber. */
export function CartaoPedido({ pedido, cliente, saldo }: { pedido: Pedido; cliente: string; saldo: number }) {
  return (
    <Link to={`/pedidos/${pedido.id}`} className={pedido.status === 'orcamento' ? 'cartao apagado' : 'cartao'}>
      <div className="linha">
        <strong>{cliente}</strong>
        <span>{formatarMoeda(totalPedido(pedido))}</span>
      </div>
      <div className="linha suave">
        <span>
          {pedido.horario && `${pedido.horario} · `}
          {pedido.tipo === 'entrega' ? 'Entrega' : 'Retirada'}
          {pedido.tema && ` · ${pedido.tema}`}
        </span>
        <StatusSelo status={pedido.status} />
      </div>
      {contaComoVenda(pedido) && (
        <div className={saldo > 0 ? 'falta nota' : 'quitado nota'}>
          {saldo > 0 ? `Falta ${formatarMoeda(saldo)}` : '✓ Pago'}
        </div>
      )}
    </Link>
  )
}
