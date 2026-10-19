import { useEffect, useState } from 'react'
import type { Produto } from '../data/types'
import { formatarMoeda } from '../lib/format'
import { agruparPorSecao } from '../lib/categorias'
import { FotoProduto } from './Cardapio'

/**
 * Janela com os produtos do cardápio (com foto) para escolher os itens do pedido.
 * Cada toque adiciona o produto; tocar de novo num já adicionado não duplica.
 */
export default function SeletorCardapio({
  produtos,
  erro,
  jaNoPedido,
  aoEscolher,
  aoFechar,
}: {
  produtos: Produto[] | null
  erro: string | null
  jaNoPedido: (nome: string) => boolean
  aoEscolher: (produto: Produto) => void
  aoFechar: () => void
}) {
  const [busca, setBusca] = useState('')

  // Trava a rolagem da página por baixo enquanto a janela está aberta.
  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const lista = (produtos ?? []).filter((p) => !termo || p.nome.toLocaleLowerCase('pt-BR').includes(termo))

  return (
    <div className="janela-fundo" onClick={aoFechar}>
      <section
        className="janela"
        role="dialog"
        aria-modal="true"
        aria-label="Escolher do cardápio"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="linha">
          <h2>Escolher do cardápio</h2>
          <button type="button" className="botao primario pequeno" onClick={aoFechar}>
            Concluir
          </button>
        </div>
        <input
          className="busca"
          type="search"
          placeholder="Buscar produto"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className="janela-lista">
          {erro && <p className="erro">Não consegui carregar o cardápio: {erro}</p>}
          {!erro && produtos === null && <p className="vazio">Carregando…</p>}
          {!erro && produtos?.length === 0 && (
            <p className="vazio">O cardápio está vazio. Cadastre os produtos na aba Cardápio.</p>
          )}
          {agruparPorSecao(lista).map((secao) => (
            <div key={secao.nome} className="janela-secao">
              <h3>{secao.nome}</h3>
              {secao.produtos.map((p) => {
                const adicionado = jaNoPedido(p.nome)
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={adicionado ? 'opcao-produto adicionado' : 'opcao-produto'}
                    onClick={() => !adicionado && aoEscolher(p)}
                    aria-pressed={adicionado}
                  >
                    <FotoProduto produto={p} tamanho="mini" />
                    <span className="opcao-nome">{p.nome}</span>
                    <span className="opcao-preco">
                      {adicionado ? '✓ No pedido' : `${formatarMoeda(p.preco)}${p.unidade === 'cento' ? ' un.' : ''}`}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
