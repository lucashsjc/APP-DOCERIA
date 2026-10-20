import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Cabecalho, Estado } from '../components'
import { repo, urlDaFoto } from '../data/repo'
import type { Produto } from '../data/types'
import { formatarMoeda, lerMoeda, moedaParaCampo } from '../lib/format'
import { reduzirFoto } from '../lib/imagem'
import { useCarregar } from '../lib/useCarregar'
import { agruparPorSecao, precoDeVitrine, SECOES_CARDAPIO, SEM_CATEGORIA } from '../lib/categorias'
import { NOME_LOJA, SUBTITULO_LOJA } from '../marca'
import { compartilharArquivo } from '../lib/comprovante'
import { margem } from '../lib/lucro'

/** Foto redonda do produto, como no portfólio. Sem foto, mostra a inicial. */
export function FotoProduto({ produto, tamanho = 'grande' }: { produto: Pick<Produto, 'nome' | 'foto'>; tamanho?: 'grande' | 'media' | 'mini' }) {
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
  categorias,
  aoSalvar,
  aoCancelar,
}: {
  inicial?: Produto
  categorias: string[]
  aoSalvar: () => void
  aoCancelar?: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [preco, setPreco] = useState(inicial ? moedaParaCampo(inicial.preco) : '')
  const [custo, setCusto] = useState(inicial?.custo ? moedaParaCampo(inicial.custo) : '')
  const [categoria, setCategoria] = useState(inicial?.categoria ?? '')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [unidade, setUnidade] = useState<Produto['unidade']>(inicial?.unidade ?? 'un')
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
      await repo.salvarProduto(
        {
          nome: nome.trim(),
          preco: lerMoeda(preco),
          foto: caminho,
          categoria: categoria.trim(),
          descricao: descricao.trim(),
          unidade,
          custo: lerMoeda(custo),
        },
        inicial?.id,
      )
      // A foto antiga só sai do armazenamento se era uma enviada por ela (não as do portfólio).
      const antiga = inicial?.foto
      if (antiga && antiga !== caminho && !antiga.startsWith('/')) await repo.excluirFoto(antiga).catch(() => {})
      if (!inicial) {
        setNome('')
        setPreco('')
        setCusto('')
        setDescricao('')
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

  const valor = lerMoeda(preco)
  const valorCusto = lerMoeda(custo)
  const lucroUnidade = valor - valorCusto
  const idLista = `categorias-${inicial?.id ?? 'novo'}`

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
      <label>
        Produto
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Trufa 2D" required />
      </label>
      <label>
        Seção do cardápio
        <input
          list={idLista}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder="Ex.: Doces 3D"
        />
        <datalist id={idLista}>
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label>
        Descrição
        <textarea
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Sabores ninho, maracujá ou chocolate"
        />
      </label>
      <div className="produto-campos">
        <label>
          Vende por
          <select value={unidade} onChange={(e) => setUnidade(e.target.value as Produto['unidade'])}>
            <option value="un">Unidade</option>
            <option value="cento">Cento</option>
          </select>
        </label>
        <label>
          Preço da unidade (R$)
          <input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
        </label>
      </div>
      {unidade === 'cento' && valor > 0 && (
        <p className="dica">
          No cardápio: {formatarMoeda(valor * 100)} o cento · {formatarMoeda(valor * 50)} meio cento
        </p>
      )}
      <label>
        Custo da unidade (R$) · só você vê
        <input
          inputMode="decimal"
          value={custo}
          onChange={(e) => setCusto(e.target.value)}
          placeholder="Ingredientes + embalagem"
        />
      </label>
      {valorCusto > 0 && valor > 0 && (
        <p className={lucroUnidade < 0 ? 'dica atrasado' : 'dica'}>
          {lucroUnidade < 0 ? 'Prejuízo' : 'Lucro'} de {formatarMoeda(Math.abs(lucroUnidade))} por unidade (
          {Math.round(margem(valor, valorCusto))}%)
          {unidade === 'cento' && ` · ${formatarMoeda(lucroUnidade * 100)} no cento`}
        </p>
      )}
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

function ItemCardapio({ produto, aoTocar }: { produto: Produto; aoTocar: () => void }) {
  const preco = precoDeVitrine(produto)
  return (
    <button className="item-cardapio" onClick={aoTocar}>
      <FotoProduto produto={produto} tamanho="media" />
      <span className="item-cardapio-texto">
        <strong>{produto.nome}</strong>
        {produto.descricao && <span className="item-cardapio-descricao">{produto.descricao}</span>}
        <span className="item-cardapio-preco">
          <b>{preco.principal}</b>
          {preco.secundario && <span>{preco.secundario}</span>}
          {produto.custo > 0 && (
            <span className={produto.custo > produto.preco ? 'item-cardapio-lucro atrasado' : 'item-cardapio-lucro'}>
              lucro {Math.round(margem(produto.preco, produto.custo))}%
            </span>
          )}
        </span>
      </span>
    </button>
  )
}

export default function Cardapio() {
  const { dados: produtos, erro, recarregar } = useCarregar(() => repo.listarProdutos(), [])
  const [editando, setEditando] = useState<string | null>(null)
  const [novo, setNovo] = useState(false)
  const [busca, setBusca] = useState('')
  const [secao, setSecao] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)

  const secoes = useMemo(() => agruparPorSecao(produtos ?? []), [produtos])
  const categorias = useMemo(
    () => [...new Set([...SECOES_CARDAPIO.map((s) => s.nome), ...secoes.map((s) => s.nome)])].filter((c) => c !== SEM_CATEGORIA),
    [secoes],
  )

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const visiveis = secoes
    .filter((s) => !secao || s.nome === secao)
    .map((s) => ({
      ...s,
      produtos: s.produtos.filter(
        (p) =>
          !termo ||
          p.nome.toLocaleLowerCase('pt-BR').includes(termo) ||
          p.descricao.toLocaleLowerCase('pt-BR').includes(termo),
      ),
    }))
    .filter((s) => s.produtos.length > 0)

  // O PDF leva o cardápio todo, ou só a seção escolhida nos filtros.
  async function enviarPdf() {
    const escolhidas = secoes.filter((s) => !secao || s.nome === secao)
    if (escolhidas.length === 0) return
    setGerando(true)
    try {
      const { gerarCardapioPdf } = await import('../lib/cardapioPdf')
      const pdf = await gerarCardapioPdf(escolhidas)
      const sufixo = secao ? `-${secao.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[^a-z0-9]+/g, '-')}` : ''
      await compartilharArquivo(pdf, `cardapio-atelie-doce-festa${sufixo}.pdf`, `Cardápio ${NOME_LOJA}`)
    } catch (e) {
      alert(`Não consegui gerar o PDF: ${(e as Error).message}`)
    } finally {
      setGerando(false)
    }
  }

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

      <section className="capa-cardapio">
        <img src="/logo-loja.jpg" alt="" />
        <div>
          <span className="capa-cardapio-loja">{NOME_LOJA}</span>
          <span className="capa-cardapio-sub">
            {SUBTITULO_LOJA} · {produtos ? `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}` : '…'}
          </span>
        </div>
        {secoes.length > 0 && (
          <button className="botao primario pequeno capa-cardapio-enviar" onClick={enviarPdf} disabled={gerando}>
            {gerando ? 'Gerando PDF…' : secao ? `Enviar PDF de “${secao}”` : 'Enviar cardápio em PDF'}
          </button>
        )}
      </section>

      {novo && (
        <section className="bloco">
          <h2>Novo produto</h2>
          <FormProduto
            categorias={categorias}
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

      {secoes.length > 1 && (
        <div className="chips" role="tablist" aria-label="Seções do cardápio">
          <button className={secao === null ? 'chip ativo' : 'chip'} onClick={() => setSecao(null)}>
            Tudo
          </button>
          {secoes.map((s) => (
            <button key={s.nome} className={secao === s.nome ? 'chip ativo' : 'chip'} onClick={() => setSecao(s.nome)}>
              {s.nome}
            </button>
          ))}
        </div>
      )}

      <Estado erro={erro} carregando={!produtos} />
      {produtos && produtos.length === 0 && (
        <p className="vazio">Nenhum produto cadastrado ainda. Toque em "+ Novo" para começar.</p>
      )}
      {produtos && produtos.length > 0 && visiveis.length === 0 && <p className="vazio">Nada encontrado.</p>}

      {visiveis.map((s) => (
        <section key={s.nome} className="secao-cardapio">
          <header>
            <h2>{s.nome}</h2>
            {s.descricao && <p>{s.descricao}</p>}
          </header>
          <div className="cartao lista-cardapio">
            {s.produtos.map((p) =>
              editando === p.id ? (
                <div key={p.id} className="item-cardapio-edicao">
                  <FormProduto
                    inicial={p}
                    categorias={categorias}
                    aoSalvar={() => {
                      setEditando(null)
                      recarregar()
                    }}
                    aoCancelar={() => setEditando(null)}
                  />
                </div>
              ) : (
                <ItemCardapio key={p.id} produto={p} aoTocar={() => setEditando(p.id)} />
              ),
            )}
          </div>
        </section>
      ))}
    </>
  )
}
