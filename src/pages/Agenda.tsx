import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Cabecalho, CartaoPedido, Estado } from '../components'
import { repo } from '../data/repo'
import { saldoPedido, type Pedido } from '../data/types'
import { diaDaSemana, formatarData, formatarDataRelativa, formatarMes, hojeIso, somarDias, somarMes } from '../lib/format'
import { formatarQuantidade, somarProducao } from '../lib/producao'
import { useCarregar } from '../lib/useCarregar'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Visao = 'mes' | 'semana' | 'producao'
type Periodo = 'dia' | 'semana'

interface PedidoAgenda extends Pedido {
  cliente: string
  saldo: number
}

function chaveHorario(p: Pedido) {
  return p.horario || '99:99'
}

/** Dias do mês em semanas de domingo a sábado; `null` preenche antes do dia 1 e depois do último. */
function gradeDoMes(anoMes: string): (string | null)[] {
  const primeiro = `${anoMes}-01`
  const dias: (string | null)[] = Array(diaDaSemana(primeiro)).fill(null)
  for (let d = primeiro; d.startsWith(anoMes); d = somarDias(d, 1)) dias.push(d)
  while (dias.length % 7) dias.push(null)
  return dias
}

export default function Agenda() {
  const hoje = hojeIso()
  // Dia e visão ficam no endereço, para voltar ao mesmo lugar depois de abrir um pedido.
  const [params, setParams] = useSearchParams()
  const dia = params.get('dia') ?? hoje
  const visaoParam = params.get('visao')
  const visao: Visao = visaoParam === 'semana' || visaoParam === 'producao' ? visaoParam : 'mes'
  const periodo: Periodo = params.get('periodo') === 'semana' ? 'semana' : 'dia'
  const mudar = (novoDia: string, novaVisao: Visao, novoPeriodo: Periodo = periodo) =>
    setParams({ dia: novoDia, visao: novaVisao, periodo: novoPeriodo }, { replace: true })
  const setDia = (novo: string) => mudar(novo, visao)
  const setVisao = (nova: Visao) => mudar(dia, nova)
  const setPeriodo = (novo: Periodo) => mudar(dia, visao, novo)
  const { dados, erro } = useCarregar(
    () => Promise.all([repo.listarPedidos(), repo.listarClientes(), repo.listarPagamentos()]),
    [],
  )

  const porDia = useMemo(() => {
    const mapa = new Map<string, PedidoAgenda[]>()
    if (!dados) return mapa
    const [pedidos, clientes, pagamentos] = dados
    const nomes = new Map(clientes.map((c) => [c.id, c.nome]))
    for (const p of pedidos) {
      if (p.status === 'cancelado') continue
      const item = { ...p, cliente: nomes.get(p.cliente_id) ?? '—', saldo: saldoPedido(p, pagamentos) }
      mapa.set(p.data_entrega, [...(mapa.get(p.data_entrega) ?? []), item])
    }
    for (const lista of mapa.values()) lista.sort((a, b) => chaveHorario(a).localeCompare(chaveHorario(b)))
    return mapa
  }, [dados])

  const mes = dia.slice(0, 7)
  const inicioSemana = somarDias(dia, -diaDaSemana(dia))
  const fimSemana = somarDias(inicioSemana, 6)

  function mudarMes(delta: number) {
    const novo = somarMes(mes, delta)
    setDia(novo === hoje.slice(0, 7) ? hoje : `${novo}-01`)
  }

  function navegar(direcao: 1 | -1) {
    if (visao === 'mes') mudarMes(direcao)
    else if (visao === 'producao' && periodo === 'dia') setDia(somarDias(dia, direcao))
    else setDia(somarDias(dia, 7 * direcao))
  }

  const porSemana = visao === 'semana' || (visao === 'producao' && periodo === 'semana')
  const titulo =
    visao === 'mes'
      ? formatarMes(mes)
      : porSemana
        ? `${formatarData(inicioSemana)} – ${formatarData(fimSemana)}`
        : formatarDataRelativa(dia)

  const producao = useMemo(() => {
    if (visao !== 'producao') return []
    const dias = periodo === 'dia' ? [dia] : Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i))
    return somarProducao(dias.flatMap((d) => porDia.get(d) ?? []))
  }, [visao, periodo, dia, inicioSemana, porDia])

  return (
    <>
      <Cabecalho
        titulo="Agenda"
        acao={
          dia !== hoje && (
            <button className="botao pequeno" onClick={() => setDia(hoje)}>
              Hoje
            </button>
          )
        }
      />

      <div className="alternar tres">
        <button className={visao === 'mes' ? 'ativo' : ''} onClick={() => setVisao('mes')}>
          Mês
        </button>
        <button className={visao === 'semana' ? 'ativo' : ''} onClick={() => setVisao('semana')}>
          Semana
        </button>
        <button className={visao === 'producao' ? 'ativo' : ''} onClick={() => setVisao('producao')}>
          Produção
        </button>
      </div>

      {visao === 'producao' && (
        <div className="chips">
          <button className={periodo === 'dia' ? 'chip ativo' : 'chip'} onClick={() => setPeriodo('dia')}>
            Do dia
          </button>
          <button className={periodo === 'semana' ? 'chip ativo' : 'chip'} onClick={() => setPeriodo('semana')}>
            Da semana
          </button>
        </div>
      )}

      <div className="mes">
        <button aria-label="Anterior" onClick={() => navegar(-1)}>
          ‹
        </button>
        <span>{titulo}</span>
        <button aria-label="Próximo" onClick={() => navegar(1)}>
          ›
        </button>
      </div>

      <Estado erro={erro} carregando={!dados} />

      {dados && visao === 'mes' && (
        <div className="agenda-mes">
          <div className="calendario">
            {SEMANA.map((d, i) => (
              <span key={i} className="calendario-semana">
                {d}
              </span>
            ))}
            {gradeDoMes(mes).map((d, i) => {
              if (!d) return <span key={i} />
              const qtd = porDia.get(d)?.length ?? 0
              const classes = ['calendario-dia']
              if (d === dia) classes.push('selecionado')
              if (d === hoje) classes.push('hoje')
              return (
                <button
                  key={d}
                  className={classes.join(' ')}
                  onClick={() => setDia(d)}
                  aria-label={`${formatarData(d)}${qtd ? `, ${qtd} ${qtd === 1 ? 'pedido' : 'pedidos'}` : ''}`}
                  aria-pressed={d === dia}
                >
                  {Number(d.slice(8))}
                  {qtd > 0 && <span className="calendario-qtd">{qtd}</span>}
                </button>
              )
            })}
          </div>

          <div className="agenda-dia">
            <h2 className="dia">{formatarDataRelativa(dia)}</h2>
            {(porDia.get(dia) ?? []).map((p) => (
              <CartaoPedido key={p.id} pedido={p} cliente={p.cliente} saldo={p.saldo} />
            ))}
            {!porDia.get(dia) && <p className="vazio">Nenhum pedido neste dia.</p>}
            <Link to={`/pedidos/novo?data=${dia}`} className="botao primario">
              + Novo pedido neste dia
            </Link>
          </div>
        </div>
      )}

      {dados &&
        visao === 'semana' &&
        Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i)).map((d) => (
          <section key={d}>
            <div className="linha">
              <h2 className={d === hoje ? 'dia hoje' : 'dia'}>{formatarDataRelativa(d)}</h2>
              <Link to={`/pedidos/novo?data=${d}`} className="mais" aria-label={`Novo pedido em ${formatarData(d)}`}>
                +
              </Link>
            </div>
            {(porDia.get(d) ?? []).map((p) => (
              <CartaoPedido key={p.id} pedido={p} cliente={p.cliente} saldo={p.saldo} />
            ))}
            {!porDia.get(d) && <p className="suave">Livre</p>}
          </section>
        ))}

      {dados && visao === 'producao' && (
        <>
          <p className="suave">Soma dos itens dos pedidos confirmados e em produção.</p>
          {producao.length === 0 && <p className="vazio">Nada para produzir neste período.</p>}
          <div className="lista">
            {producao.map((item) => (
              <div key={item.nome} className="cartao producao-item">
                <div className="producao-qtd">{formatarQuantidade(item.quantidade)}</div>
                <div className="producao-info">
                  <strong>{item.nome}</strong>
                  <span className="suave">
                    {item.origens.map((o, i) => (
                      <span key={i}>
                        {i > 0 && ' · '}
                        <Link to={`/pedidos/${o.pedidoId}`}>{o.cliente.split(' ')[0]}</Link>{' '}
                        {formatarQuantidade(o.quantidade)}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
