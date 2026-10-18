import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Cabecalho, Estado } from '../components'
import { repo } from '../data/repo'
import { STATUS, STATUS_NOME, totalPedido, type Status } from '../data/types'
import { formatarData, formatarMoeda, linkWhatsApp } from '../lib/format'
import { compartilharArquivo, gerarComprovante } from '../lib/comprovante'
import { useCarregar } from '../lib/useCarregar'
import { FotoProduto } from './Cardapio'
import PagamentosPedido from './PagamentosPedido'

export default function PedidoDetalhe() {
  const { id } = useParams()
  const navegar = useNavigate()
  const [foto, setFoto] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)
  const { dados, erro, recarregar } = useCarregar(async () => {
    const pedido = await repo.buscarPedido(id!)
    if (!pedido) throw new Error('Pedido não encontrado.')
    const cliente = await repo.buscarCliente(pedido.cliente_id)
    // As fotos do cardápio são só enfeite: se falhar, o pedido aparece igual.
    const produtos = await repo.listarProdutos().catch(() => [])
    return { pedido, cliente, produtos }
  }, [id])

  const fotoPath = dados?.pedido.foto_path
  useEffect(() => {
    if (fotoPath) repo.urlFoto(fotoPath).then(setFoto)
  }, [fotoPath])

  if (!dados) {
    return (
      <>
        <Cabecalho titulo="Pedido" voltar />
        <Estado erro={erro} carregando />
      </>
    )
  }

  const { pedido, cliente, produtos } = dados
  const produtoDoItem = (descricao: string) =>
    produtos.find((p) => p.nome.toLocaleLowerCase('pt-BR') === descricao.trim().toLocaleLowerCase('pt-BR'))

  async function mudarStatus(status: Status) {
    const { id: _id, criado_em: _criado, ...resto } = pedido
    await repo.salvarPedido({ ...resto, status }, pedido.id)
    recarregar()
  }

  async function enviarComprovante() {
    setGerando(true)
    try {
      const pagamentos = await repo.listarPagamentos(pedido.id)
      const imagem = await gerarComprovante(pedido, cliente, pagamentos)
      const tipo = pedido.status === 'orcamento' ? 'orcamento' : 'pedido'
      const nome = (cliente?.nome.split(' ')[0] ?? 'cliente').toLocaleLowerCase('pt-BR')
      await compartilharArquivo(imagem, `${tipo}-${nome}-${pedido.data_entrega}.png`, `${tipo} ${cliente?.nome ?? ''}`)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setGerando(false)
    }
  }

  async function excluir() {
    if (!confirm('Excluir este pedido? Não dá para desfazer.')) return
    if (pedido.foto_path) await repo.excluirFoto(pedido.foto_path)
    await repo.excluirPedido(pedido.id)
    navegar('/', { replace: true })
  }

  return (
    <>
      <Cabecalho
        titulo={cliente?.nome ?? 'Pedido'}
        voltar
        acao={
          <Link to={`/pedidos/${pedido.id}/editar`} className="botao pequeno">
            Editar
          </Link>
        }
      />

      <section className="bloco">
        <p className="destaque">
          {formatarData(pedido.data_entrega)}
          {pedido.horario && ` às ${pedido.horario}`}
        </p>
        <p>{pedido.tipo === 'entrega' ? 'Entrega' : 'Retirada no local'}</p>
        {pedido.tipo === 'entrega' && pedido.endereco && (
          <p>
            {pedido.endereco}{' '}
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(pedido.endereco)}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir no Mapas
            </a>
          </p>
        )}
        {pedido.tema && (
          <p>
            <span className="suave">Tema:</span> {pedido.tema}
          </p>
        )}
      </section>

      <section className="bloco">
        <h2>Status</h2>
        <div className="chips">
          {STATUS.map((s) => (
            <button
              key={s}
              className={s === pedido.status ? 'chip ativo' : 'chip'}
              onClick={() => mudarStatus(s)}
            >
              {STATUS_NOME[s]}
            </button>
          ))}
        </div>
      </section>

      <section className="bloco">
        <h2>Itens</h2>
        {pedido.itens.length === 0 && <p className="suave">Nenhum item.</p>}
        {pedido.itens.map((item, i) => (
          <div key={i} className="linha">
            <span className="item-com-foto">
              {produtoDoItem(item.descricao)?.foto && (
                <FotoProduto produto={produtoDoItem(item.descricao)!} tamanho="mini" />
              )}
              <span>
                {item.quantidade}× {item.descricao}
              </span>
            </span>
            <span>{formatarMoeda(item.quantidade * item.valor_unitario)}</span>
          </div>
        ))}
        {pedido.taxa_entrega > 0 && (
          <div className="linha suave">
            <span>Taxa de entrega</span>
            <span>{formatarMoeda(pedido.taxa_entrega)}</span>
          </div>
        )}
        <div className="linha total">
          <span>Total</span>
          <span>{formatarMoeda(totalPedido(pedido))}</span>
        </div>
      </section>

      <PagamentosPedido pedido={pedido} cliente={cliente} />

      {pedido.observacoes && (
        <section className="bloco">
          <h2>Observações</h2>
          <p className="texto-livre">{pedido.observacoes}</p>
        </section>
      )}

      {foto && (
        <section className="bloco">
          <h2>Foto de referência</h2>
          <img className="foto" src={foto} alt="Foto de referência do pedido" />
        </section>
      )}

      <section className="acoes">
        <button className="botao primario" onClick={enviarComprovante} disabled={gerando}>
          {gerando ? 'Gerando imagem…' : pedido.status === 'orcamento' ? 'Enviar orçamento' : 'Enviar comprovante'}
        </button>
        <Link className="botao" to={`/pedidos/${pedido.id}/contrato`}>
          {pedido.contrato?.aceito_em
            ? 'Contrato ✓ aceito'
            : pedido.contrato?.enviado_em
              ? 'Contrato (aguardando aceite)'
              : 'Contrato'}
        </Link>
        {cliente?.telefone && (
          <a className="botao" href={linkWhatsApp(cliente.telefone)} target="_blank" rel="noreferrer">
            WhatsApp de {cliente.nome.split(' ')[0]}
          </a>
        )}
        {cliente && (
          <Link className="botao" to={`/clientes/${cliente.id}`}>
            Ver cliente
          </Link>
        )}
        <button className="botao perigo" onClick={excluir}>
          Excluir pedido
        </button>
      </section>
    </>
  )
}
