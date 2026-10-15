import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { STATUS_NOME, type Status } from './data/types'

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
