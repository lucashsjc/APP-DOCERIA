import { Link, useNavigate, useParams } from 'react-router-dom'
import { Cabecalho, Estado, StatusSelo } from '../components'
import { repo } from '../data/repo'
import { totalPedido } from '../data/types'
import { formatarData, formatarMoeda, telefoneWhatsApp } from '../lib/format'
import { useCarregar } from '../lib/useCarregar'

export default function ClienteDetalhe() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { dados, erro } = useCarregar(async () => {
    const cliente = await repo.buscarCliente(id!)
    if (!cliente) throw new Error('Cliente não encontrado.')
    const pedidos = (await repo.listarPedidos())
      .filter((p) => p.cliente_id === id)
      .sort((a, b) => b.data_entrega.localeCompare(a.data_entrega))
    return { cliente, pedidos }
  }, [id])

  if (!dados) {
    return (
      <>
        <Cabecalho titulo="Cliente" voltar />
        <Estado erro={erro} carregando />
      </>
    )
  }

  const { cliente, pedidos } = dados

  async function excluir() {
    if (!confirm(`Excluir ${cliente.nome}?`)) return
    try {
      await repo.excluirCliente(cliente.id)
      navegar('/clientes', { replace: true })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <>
      <Cabecalho
        titulo={cliente.nome}
        voltar
        acao={
          <Link to={`/clientes/${cliente.id}/editar`} className="botao pequeno">
            Editar
          </Link>
        }
      />

      <section className="bloco">
        {cliente.telefone ? <p>📞 {cliente.telefone}</p> : <p className="suave">Sem telefone.</p>}
        {cliente.observacoes && <p className="texto-livre">{cliente.observacoes}</p>}
      </section>

      <section className="acoes">
        <Link className="botao primario" to={`/pedidos/novo?cliente=${cliente.id}`}>
          + Novo pedido
        </Link>
        {cliente.telefone && (
          <a className="botao" href={`https://wa.me/${telefoneWhatsApp(cliente.telefone)}`} target="_blank" rel="noreferrer">
            Abrir WhatsApp
          </a>
        )}
      </section>

      <h2 className="dia">Histórico de pedidos</h2>
      {pedidos.length === 0 && <p className="vazio">Nenhum pedido ainda.</p>}
      {pedidos.map((p) => (
        <Link key={p.id} to={`/pedidos/${p.id}`} className="cartao">
          <div className="linha">
            <strong>{formatarData(p.data_entrega)}</strong>
            <span>{formatarMoeda(totalPedido(p))}</span>
          </div>
          <div className="linha suave">
            <span>{p.tema || '—'}</span>
            <StatusSelo status={p.status} />
          </div>
        </Link>
      ))}

      <section className="acoes">
        <button className="botao perigo" onClick={excluir}>
          Excluir cliente
        </button>
      </section>
    </>
  )
}
