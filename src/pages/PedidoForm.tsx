import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Cabecalho, Estado } from '../components'
import { repo } from '../data/repo'
import { STATUS, STATUS_NOME, totalPedido, type Cliente, type DadosContrato, type ItemPedido, type NovoPedido, type Produto, type Status, type TipoEntrega } from '../data/types'
import { formatarMoeda, hojeIso, lerMoeda, moedaParaCampo } from '../lib/format'
import { reduzirFoto } from '../lib/imagem'
import { custoDoItem, lucroPedido, mapaDeProdutos } from '../lib/lucro'
import SeletorCardapio from './SeletorCardapio'

interface ItemCampo {
  descricao: string
  quantidade: string
  valor: string
  /** Custo da unidade guardado no pedido (não aparece no formulário). */
  custo?: number
}

const NOVO_CLIENTE = '__novo__'
const itemVazio = (): ItemCampo => ({ descricao: '', quantidade: '1', valor: '' })

export default function PedidoForm() {
  const { id } = useParams()
  const [busca] = useSearchParams()
  const navegar = useNavigate()

  const [clientes, setClientes] = useState<Cliente[] | null>(null)
  const [produtos, setProdutos] = useState<Produto[] | null>(null)
  const [erroCardapio, setErroCardapio] = useState<string | null>(null)
  const [escolhendo, setEscolhendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [clienteId, setClienteId] = useState(busca.get('cliente') ?? '')
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [data, setData] = useState(busca.get('data') ?? hojeIso())
  const [horario, setHorario] = useState('')
  const [tipo, setTipo] = useState<TipoEntrega>('retirada')
  const [endereco, setEndereco] = useState('')
  const [tema, setTema] = useState('')
  const [itens, setItens] = useState<ItemCampo[]>([itemVazio()])
  const [taxa, setTaxa] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus] = useState<Status>('orcamento')
  // O contrato é editado em outra tela; aqui só é preservado ao salvar.
  const [contrato, setContrato] = useState<DadosContrato | null>(null)
  const [fotoPath, setFotoPath] = useState<string | null>(null)
  const [fotoNova, setFotoNova] = useState<Blob | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      // O cardápio só ajuda a preencher; se falhar, o pedido continua funcionando.
      repo
        .listarProdutos()
        .then(setProdutos)
        .catch((e: Error) => setErroCardapio(e.message))
      const lista = await repo.listarClientes()
      if (id) {
        const p = await repo.buscarPedido(id)
        if (!p) throw new Error('Pedido não encontrado.')
        setClienteId(p.cliente_id)
        setData(p.data_entrega)
        setHorario(p.horario)
        setTipo(p.tipo)
        setEndereco(p.endereco)
        setTema(p.tema)
        setItens(
          p.itens.length
            ? p.itens.map((i) => ({
                descricao: i.descricao,
                quantidade: String(i.quantidade),
                valor: moedaParaCampo(i.valor_unitario),
                custo: i.custo_unitario,
              }))
            : [itemVazio()],
        )
        setTaxa(moedaParaCampo(p.taxa_entrega))
        setObservacoes(p.observacoes)
        setStatus(p.status)
        setContrato(p.contrato ?? null)
        setFotoPath(p.foto_path)
        if (p.foto_path) setFotoUrl(await repo.urlFoto(p.foto_path))
      } else if (lista.length === 0) {
        setClienteId(NOVO_CLIENTE)
      }
      setClientes(lista)
    }
    carregar().catch((e: Error) => setErro(e.message))
  }, [id])

  const cardapio = mapaDeProdutos(produtos ?? [])
  const itensLidos = itens
    .filter((i) => i.descricao.trim())
    .map((i) => {
      const item: ItemPedido = {
        descricao: i.descricao.trim(),
        quantidade: Number(i.quantidade.replace(',', '.')) || 1,
        valor_unitario: lerMoeda(i.valor),
      }
      // Guarda o custo de hoje: se ela mudar o custo no cardápio depois, o lucro deste pedido não muda.
      const custo = i.custo ?? custoDoItem(item, cardapio)
      return custo ? { ...item, custo_unitario: custo } : item
    })
  const lucro = lucroPedido({ itens: itensLidos }, cardapio)
  const taxaLida = tipo === 'entrega' ? lerMoeda(taxa) : 0
  const total = totalPedido({ itens: itensLidos, taxa_entrega: taxaLida })

  function mudarItem(indice: number, campo: keyof ItemCampo, valor: string) {
    setItens(itens.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)))
  }

  const normalizar = (texto: string) => texto.trim().toLocaleLowerCase('pt-BR')

  /** Adiciona o produto escolhido na janela do cardápio, ocupando uma linha vazia se houver. */
  function adicionarDoCardapio(produto: Produto) {
    const novo: ItemCampo = {
      descricao: produto.nome,
      quantidade: '1',
      valor: moedaParaCampo(produto.preco),
      custo: produto.custo || undefined,
    }
    const vazia = itens.findIndex((i) => !i.descricao.trim() && !i.valor.trim())
    setItens(vazia >= 0 ? itens.map((item, i) => (i === vazia ? novo : item)) : [...itens, novo])
  }

  /** Ao escolher um produto do cardápio, o preço vem junto (se ainda estiver vazio). */
  function mudarDescricao(indice: number, descricao: string) {
    const nome = descricao.trim().toLocaleLowerCase('pt-BR')
    const produto = produtos?.find((p) => p.nome.toLocaleLowerCase('pt-BR') === nome)
    setItens(
      itens.map((item, i) =>
        i !== indice
          ? item
          : {
              ...item,
              descricao,
              valor: produto && !item.valor ? moedaParaCampo(produto.preco) : item.valor,
              // Trocou o produto: o custo passa a ser o do novo (ou o do cardápio na hora de salvar).
              custo: produto?.custo || undefined,
            },
      ),
    )
  }

  async function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return
    const reduzida = await reduzirFoto(arquivo)
    setFotoNova(reduzida)
    setFotoUrl(URL.createObjectURL(reduzida))
  }

  function tirarFoto() {
    setFotoNova(null)
    setFotoUrl(null)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      let cliente = clienteId
      if (cliente === NOVO_CLIENTE) {
        const novo = await repo.salvarCliente({
          nome: novoNome.trim(),
          telefone: novoTelefone.trim(),
          observacoes: '',
          cpf: '',
          endereco: '',
        })
        cliente = novo.id
      }

      // Foto trocada ou removida: a antiga sai do armazenamento depois de salvar.
      const fotoAntiga = fotoPath && (fotoNova || !fotoUrl) ? fotoPath : null
      let caminhoFoto = fotoUrl ? fotoPath : null
      if (fotoNova) caminhoFoto = await repo.enviarFoto(fotoNova)

      const dados: NovoPedido = {
        cliente_id: cliente,
        data_entrega: data,
        horario,
        tipo,
        endereco: tipo === 'entrega' ? endereco.trim() : '',
        tema: tema.trim(),
        itens: itensLidos,
        taxa_entrega: taxaLida,
        observacoes: observacoes.trim(),
        foto_path: caminhoFoto,
        status,
        contrato,
      }
      const salvo = await repo.salvarPedido(dados, id)
      if (fotoAntiga) await repo.excluirFoto(fotoAntiga).catch(() => {})
      navegar(`/pedidos/${salvo.id}`, { replace: true })
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  if (!clientes) {
    return (
      <>
        <Cabecalho titulo={id ? 'Editar pedido' : 'Novo pedido'} voltar />
        <Estado erro={erro} carregando />
      </>
    )
  }

  return (
    <>
      <Cabecalho titulo={id ? 'Editar pedido' : 'Novo pedido'} voltar />
      <form className="formulario" onSubmit={salvar}>
        <label>
          Cliente
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
            <option value="" disabled>
              Escolha o cliente
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
            <option value={NOVO_CLIENTE}>+ Novo cliente</option>
          </select>
        </label>
        {clienteId === NOVO_CLIENTE && (
          <div className="grupo">
            <label>
              Nome do cliente
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} required />
            </label>
            <label>
              Telefone
              <input type="tel" value={novoTelefone} onChange={(e) => setNovoTelefone(e.target.value)} />
            </label>
          </div>
        )}

        <div className="dupla">
          <label>
            Data
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </label>
          <label>
            Horário
            <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
          </label>
        </div>

        <div className="alternar">
          <button type="button" className={tipo === 'retirada' ? 'ativo' : ''} onClick={() => setTipo('retirada')}>
            Retirada
          </button>
          <button type="button" className={tipo === 'entrega' ? 'ativo' : ''} onClick={() => setTipo('entrega')}>
            Entrega
          </button>
        </div>
        {tipo === 'entrega' && (
          <label>
            Endereço
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro" />
          </label>
        )}

        <label>
          Tema da festa
          <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ex.: Frozen, 5 anos da Ana" />
        </label>

        <fieldset className="grupo">
          <legend>Itens</legend>
          {itens.map((item, i) => (
            <div key={i} className="item">
              <input
                className="item-descricao"
                placeholder="Ex.: Brigadeiro gourmet"
                list="cardapio"
                value={item.descricao}
                onChange={(e) => mudarDescricao(i, e.target.value)}
              />
              <input
                className="item-qtd"
                inputMode="decimal"
                aria-label="Quantidade"
                value={item.quantidade}
                onChange={(e) => mudarItem(i, 'quantidade', e.target.value)}
              />
              <input
                className="item-valor"
                inputMode="decimal"
                placeholder="R$ un."
                aria-label="Valor unitário"
                value={item.valor}
                onChange={(e) => mudarItem(i, 'valor', e.target.value)}
              />
              <button
                type="button"
                className="remover"
                aria-label="Remover item"
                onClick={() => setItens(itens.length > 1 ? itens.filter((_, j) => j !== i) : [itemVazio()])}
              >
                ×
              </button>
            </div>
          ))}
          <datalist id="cardapio">
            {(produtos ?? []).map((p) => (
              <option key={p.id} value={p.nome} />
            ))}
          </datalist>
          <div className="dupla">
            <button type="button" className="botao primario pequeno" onClick={() => setEscolhendo(true)}>
              Escolher do cardápio
            </button>
            <button type="button" className="botao pequeno" onClick={() => setItens([...itens, itemVazio()])}>
              + Item avulso
            </button>
          </div>
        </fieldset>

        {escolhendo && (
          <SeletorCardapio
            produtos={produtos}
            erro={erroCardapio}
            jaNoPedido={(nome) => itens.some((i) => normalizar(i.descricao) === normalizar(nome))}
            aoEscolher={adicionarDoCardapio}
            aoFechar={() => setEscolhendo(false)}
          />
        )}

        {tipo === 'entrega' && (
          <label>
            Taxa de entrega (R$)
            <input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} placeholder="0,00" />
          </label>
        )}

        <p className="linha total">
          <span>Total</span>
          <span>{formatarMoeda(total)}</span>
        </p>
        {lucro.receita > 0 && (
          <p className="linha dica">
            <span>Lucro estimado dos doces{lucro.semCusto > 0 ? ' (itens com custo)' : ''}</span>
            <span>{formatarMoeda(lucro.lucro)}</span>
          </p>
        )}

        <label>
          Observações
          <textarea
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Texto no bolo, alergias, cores…"
          />
        </label>

        <div className="grupo">
          <span className="rotulo">Foto de referência</span>
          {fotoUrl ? (
            <>
              <img className="foto" src={fotoUrl} alt="Foto de referência" />
              <button type="button" className="botao pequeno" onClick={tirarFoto}>
                Remover foto
              </button>
            </>
          ) : (
            <input type="file" accept="image/*" onChange={(e) => escolherFoto(e.target.files?.[0])} />
          )}
        </div>

        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {STATUS_NOME[s]}
              </option>
            ))}
          </select>
        </label>

        {erro && <p className="erro">{erro}</p>}
        <button className="botao primario" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar pedido'}
        </button>
      </form>
    </>
  )
}
