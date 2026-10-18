import { useState, type FormEvent } from 'react'
import { Cabecalho, Estado } from '../components'
import { repo } from '../data/repo'
import type { Produto } from '../data/types'
import { formatarMoeda, lerMoeda, moedaParaCampo } from '../lib/format'
import { useCarregar } from '../lib/useCarregar'

function FormProduto({
  inicial,
  aoSalvar,
  aoCancelar,
}: {
  inicial?: Produto
  aoSalvar: () => void
  aoCancelar?: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [preco, setPreco] = useState(inicial ? moedaParaCampo(inicial.preco) : '')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    try {
      await repo.salvarProduto({ nome: nome.trim(), preco: lerMoeda(preco) }, inicial?.id)
      if (!inicial) {
        setNome('')
        setPreco('')
      }
      aoSalvar()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!inicial || !confirm(`Tirar "${inicial.nome}" do cardápio? Os pedidos antigos não mudam.`)) return
    await repo.excluirProduto(inicial.id)
    aoSalvar()
  }

  return (
    <form className="formulario produto-form" onSubmit={salvar}>
      <div className="produto-campos">
        <label>
          Produto
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Brigadeiro gourmet" required />
        </label>
        <label>
          Preço (R$)
          <input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
        </label>
      </div>
      <div className="produto-botoes">
        {inicial && (
          <button type="button" className="botao pequeno perigo" onClick={excluir}>
            Excluir
          </button>
        )}
        {aoCancelar && (
          <button type="button" className="botao pequeno" onClick={aoCancelar}>
            Cancelar
          </button>
        )}
        <button className="botao primario pequeno" disabled={salvando}>
          {inicial ? 'Salvar' : '+ Adicionar'}
        </button>
      </div>
    </form>
  )
}

export default function Cardapio() {
  const { dados: produtos, erro, recarregar } = useCarregar(() => repo.listarProdutos(), [])
  const [editando, setEditando] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const lista = (produtos ?? []).filter((p) => !termo || p.nome.toLocaleLowerCase('pt-BR').includes(termo))

  return (
    <>
      <Cabecalho titulo="Cardápio" />
      <p className="suave">
        Cadastre os produtos uma vez. No pedido, é só começar a digitar o nome que o preço vem sozinho.
      </p>

      <section className="bloco">
        <h2>Novo produto</h2>
        <FormProduto aoSalvar={recarregar} />
      </section>

      {(produtos?.length ?? 0) > 5 && (
        <input
          className="busca"
          type="search"
          placeholder="Buscar produto"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      )}

      <Estado erro={erro} carregando={!produtos} />
      {produtos && produtos.length === 0 && <p className="vazio">Nenhum produto cadastrado ainda.</p>}

      <div className="lista">
        {lista.map((p) =>
          editando === p.id ? (
            <div key={p.id} className="cartao">
              <FormProduto
                inicial={p}
                aoSalvar={() => {
                  setEditando(null)
                  recarregar()
                }}
                aoCancelar={() => setEditando(null)}
              />
            </div>
          ) : (
            <button key={p.id} className="cartao cartao-botao" onClick={() => setEditando(p.id)}>
              <span className="linha">
                <strong>{p.nome}</strong>
                <span>{formatarMoeda(p.preco)}</span>
              </span>
            </button>
          ),
        )}
      </div>
    </>
  )
}
