import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Cabecalho, CartaoPedido, Estado } from '../components'
import { repo } from '../data/repo'
import { saldoPedido, type Pedido } from '../data/types'
import { diaDaSemana, formatarData, formatarDataRelativa, formatarMes, hojeIso, somarDias, somarMes } from '../lib/format'
import { useCarregar } from '../lib/useCarregar'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Visao = 'mes' | 'semana'

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
  const visao: Visao = params.get('visao') === 'semana' ? 'semana' : 'mes'
  const mudar = (novoDia: string, novaVisao: Visao) =>
    setParams({ dia: novoDia, visao: novaVisao }, { replace: true })
  const setDia = (novo: string) => mudar(novo, visao)
  const setVisao = (nova: Visao) => mudar(dia, nova)
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

  const titulo =
    visao === 'mes' ? formatarMes(mes) : `${formatarData(inicioSemana)} – ${formatarData(fimSemana)}`

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

      <div className="alternar">
        <button className={visao === 'mes' ? 'ativo' : ''} onClick={() => setVisao('mes')}>
          Mês
        </button>
        <button className={visao === 'semana' ? 'ativo' : ''} onClick={() => setVisao('semana')}>
          Semana
        </button>
      </div>

      <div className="mes">
        <button
          aria-label="Anterior"
          onClick={() => (visao === 'mes' ? mudarMes(-1) : setDia(somarDias(dia, -7)))}
        >
          ‹
        </button>
        <span>{titulo}</span>
        <button aria-label="Próximo" onClick={() => (visao === 'mes' ? mudarMes(1) : setDia(somarDias(dia, 7)))}>
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
    </>
  )
}
