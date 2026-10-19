import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cabecalho, CartaoPedido, Estado } from '../components'
import { repo } from '../data/repo'
import { saldoPedido, type Pedido } from '../data/types'
import { formatarDataRelativa, hojeIso } from '../lib/format'
import { useCarregar } from '../lib/useCarregar'

const FILTROS = {
  proximos: { nome: 'Próximos', aceita: (p: Pedido) => p.status !== 'entregue' && p.status !== 'cancelado' },
  entregues: { nome: 'Entregues', aceita: (p: Pedido) => p.status === 'entregue' },
  cancelados: { nome: 'Cancelados', aceita: (p: Pedido) => p.status === 'cancelado' },
  todos: { nome: 'Todos', aceita: () => true },
}

type Filtro = keyof typeof FILTROS

function chaveData(p: Pedido) {
  return `${p.data_entrega} ${p.horario || '99:99'}`
}

export default function Pedidos() {
  const [filtro, setFiltro] = useState<Filtro>('proximos')
  const [busca, setBusca] = useState('')
  const { dados, erro } = useCarregar(
    () => Promise.all([repo.listarPedidos(), repo.listarClientes(), repo.listarPagamentos()]),
    [],
  )

  const grupos = useMemo(() => {
    if (!dados) return []
    const [pedidos, clientes, pagamentos] = dados
    const nomes = new Map(clientes.map((c) => [c.id, c.nome]))
    const termo = busca.trim().toLocaleLowerCase('pt-BR')

    const lista = pedidos
      .filter(FILTROS[filtro].aceita)
      .map((p) => ({ ...p, cliente: nomes.get(p.cliente_id) ?? '—', saldo: saldoPedido(p, pagamentos) }))
      .filter((p) => !termo || `${p.cliente} ${p.tema}`.toLocaleLowerCase('pt-BR').includes(termo))
      .sort((a, b) => chaveData(a).localeCompare(chaveData(b)))
    // Próximos: do mais perto para o mais longe. Histórico: do mais recente para o mais antigo.
    if (filtro !== 'proximos') lista.reverse()

    const porDia = new Map<string, typeof lista>()
    for (const p of lista) porDia.set(p.data_entrega, [...(porDia.get(p.data_entrega) ?? []), p])
    return [...porDia.entries()]
  }, [dados, filtro, busca])

  const hoje = hojeIso()

  return (
    <>
      <Cabecalho
        titulo="Pedidos"
        voltar
        acao={
          <Link to="/pedidos/novo" className="botao primario pequeno">
            + Novo
          </Link>
        }
      />
      <input
        className="busca"
        type="search"
        placeholder="Buscar por cliente ou tema"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <div className="chips">
        {(Object.keys(FILTROS) as Filtro[]).map((f) => (
          <button key={f} className={f === filtro ? 'chip ativo' : 'chip'} onClick={() => setFiltro(f)}>
            {FILTROS[f].nome}
          </button>
        ))}
      </div>

      <Estado erro={erro} carregando={!dados} />
      {dados && grupos.length === 0 && <p className="vazio">Nenhum pedido aqui.</p>}

      {grupos.map(([dia, pedidos]) => (
        <section key={dia}>
          <h2 className={filtro === 'proximos' && dia < hoje ? 'dia atrasado' : 'dia'}>
            {formatarDataRelativa(dia)}
            {filtro === 'proximos' && dia < hoje && ' · atrasado'}
          </h2>
          <div className="lista">
            {pedidos.map((p) => (
              <CartaoPedido key={p.id} pedido={p} cliente={p.cliente} saldo={p.saldo} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
