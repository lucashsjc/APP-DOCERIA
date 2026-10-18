import { useEffect, useState, type FormEvent } from 'react'
import { Cabecalho, Estado } from '../components'
import { repo, urlDaFoto } from '../data/repo'
import type { Produto } from '../data/types'
import { formatarMoeda, lerMoeda, moedaParaCampo } from '../lib/format'
import { reduzirFoto } from '../lib/imagem'
import { useCarregar } from '../lib/useCarregar'

/** Foto redonda do produto, como no portfólio. Sem foto, mostra a inicial. */
export function FotoProduto({ produto, tamanho = 'grande' }: { produto: Pick<Produto, 'nome' | 'foto'>; tamanho?: 'grande' | 'mini' }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let ativo = true
    setUrl(null)
    if (produto.foto) urlDaFoto(produto.foto).then((u) => ativo && setUrl(u)).catch(() => {})
    return () => {
      ativo = false
    }
  }, [produto.foto])
  return (
    <span className={`foto-produto ${tamanho}`} aria-hidden>
      {url ? <img src={url} alt="" loading="lazy" /> : produto.nome.trim()[0]?.toUpperCase()}
    </span>
  )
}

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
  const [foto, setFoto] = useState<string | null>(inicial?.foto ?? null)
  const [fotoNova, setFotoNova] = useState<Blob | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (foto && !fotoNova) urlDaFoto(foto).then(setPrevia).catch(() => {})
  }, [foto, fotoNova])

  async function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return
    const reduzida = await reduzirFoto(arquivo, 800)
    setFotoNova(reduzida)
    setPrevia(URL.createObjectURL(reduzida))
  }

  function tirarFoto() {
    setFoto(null)
    setFotoNova(null)
    setPrevia(null)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    try {
      const caminho = fotoNova ? await repo.enviarFoto(fotoNova) : foto
      await repo.salvarProduto({ nome: nome.trim(), preco: lerMoeda(preco), foto: caminho }, inicial?.id)
      // A foto antiga só sai do armazenamento se era uma enviada por ela (não as do portfólio).
      const antiga = inicial?.foto
      if (antiga && antiga !== caminho && !antiga.startsWith('/')) await repo.excluirFoto(antiga).catch(() => {})
      if (!inicial) {
        setNome('')
        setPreco('')
        tirarFoto()
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
    if (inicial.foto && !inicial.foto.startsWith('/')) await repo.excluirFoto(inicial.foto).catch(() => {})
    aoSalvar()
  }

  return (
    <form className="formulario produto-form" onSubmit={salvar}>
      <div className="produto-foto-campo">
        <span className="foto-produto grande">{previa ? <img src={previa} alt="Foto do produto" /> : '+'}</span>
        <div className="produto-foto-botoes">
          <label className="botao pequeno">
            {previa ? 'Trocar foto' : 'Adicionar foto'}
            <input type="file" accept="image/*" hidden onChange={(e) => escolherFoto(e.target.files?.[0])} />
          </label>
          {previa && (
            <button type="button" className="botao pequeno" onClick={tirarFoto}>
              Remover foto
            </button>
          )}
        </div>
      </div>
      <div className="produto-campos">
        <label>
          Produto
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Trufa 2D" required />
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
          {salvando ? 'Salvando…' : inicial ? 'Salvar' : '+ Adicionar'}
        </button>
      </div>
    </form>
  )
}

export default function Cardapio() {
  const { dados: produtos, erro, recarregar } = useCarregar(() => repo.listarProdutos(), [])
  const [editando, setEditando] = useState<string | null>(null)
  const [novo, setNovo] = useState(false)
  const [busca, setBusca] = useState('')

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const lista = (produtos ?? []).filter((p) => !termo || p.nome.toLocaleLowerCase('pt-BR').includes(termo))

  return (
    <>
      <Cabecalho
        titulo="Cardápio"
        acao={
          !novo && (
            <button className="botao primario pequeno" onClick={() => setNovo(true)}>
              + Novo
            </button>
          )
        }
      />

      {novo && (
        <section className="bloco">
          <h2>Novo produto</h2>
          <FormProduto
            aoSalvar={() => {
              setNovo(false)
              recarregar()
            }}
            aoCancelar={() => setNovo(false)}
          />
        </section>
      )}

      <input
        className="busca"
        type="search"
        placeholder="Buscar produto"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <Estado erro={erro} carregando={!produtos} />
      {produtos && produtos.length === 0 && (
        <p className="vazio">Nenhum produto cadastrado ainda. Toque em "+ Novo" para começar.</p>
      )}

      <div className="vitrine">
        {lista.map((p) =>
          editando === p.id ? (
            <div key={p.id} className="cartao vitrine-edicao">
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
            <button key={p.id} className="cartao vitrine-item" onClick={() => setEditando(p.id)}>
              <FotoProduto produto={p} />
              <strong>{p.nome}</strong>
              <span className="vitrine-preco">{formatarMoeda(p.preco)}</span>
            </button>
          ),
        )}
      </div>
    </>
  )
}
