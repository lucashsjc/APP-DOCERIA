import { useMemo, useState, type PointerEvent } from 'react'
import { Cabecalho, Estado } from '../components'
import { repo } from '../data/repo'
import { contaComoVenda, totalPedido, type Pedido, type Produto } from '../data/types'
import { diaDaSemana, formatarData, formatarMes, formatarMoeda, hojeIso, somarDias, somarMes } from '../lib/format'
import { compacto, curvaSuave, topoDoEixo, type Ponto } from '../lib/graficos'
import { formatarQuantidade } from '../lib/producao'
import { useCarregar } from '../lib/useCarregar'
import { FotoProduto } from './Cardapio'

type Periodo = '3m' | '6m' | '12m'
type Ordem = 'quantidade' | 'faturamento'

const PERIODOS: Record<Periodo, string> = { '3m': '3 meses', '6m': '6 meses', '12m': '12 meses' }

/** Categorias do gráfico empilhado, em ordem fixa (cores validadas no fundo escuro). */
const CATEGORIAS = [
  { chave: 'd3', nome: 'Doces 3D', cor: '#d55181' },
  { chave: 'd2', nome: 'Doces 2D', cor: '#3987e5' },
  { chave: 'top', nome: 'Topiarias', cor: '#199e70' },
  { chave: 'out', nome: 'Outros e taxas', cor: '#c98500' },
] as const
type Categoria = (typeof CATEGORIAS)[number]['chave']

function categoria(descricao: string): Categoria {
  if (/torre/i.test(descricao)) return 'top'
  if (/\b3d\b/i.test(descricao)) return 'd3'
  if (/\b2d\b/i.test(descricao)) return 'd2'
  return 'out'
}

/** Escala do mapa de atividade (um tom de rosa, do claro ao intenso). */
const NIVEIS = ['#7a3356', '#9e3f6d', '#c24c85', '#e0659f', '#f7a6cb']

interface Faixa {
  inicio: string
  fim: string
  rotulo: string
  rotuloLongo: string
}

/**
 * Divide o período em faixas: semanas (3 e 6 meses) ou meses (12 meses).
 * Por dia o gráfico ficaria cheio de picos isolados, porque a loja não vende todo dia.
 */
function faixas(periodo: Periodo, fim: string): Faixa[] {
  if (periodo !== '12m') {
    const semanas = periodo === '3m' ? 13 : 26
    return Array.from({ length: semanas }, (_, i) => {
      const f = somarDias(fim, (i - semanas + 1) * 7)
      const ini = somarDias(f, -6)
      return {
        inicio: ini,
        fim: f,
        rotulo: `${ini.slice(8)}/${ini.slice(5, 7)}`,
        rotuloLongo: `semana de ${formatarData(ini)} a ${formatarData(f)}`,
      }
    })
  }
  const mesAtual = fim.slice(0, 7)
  return Array.from({ length: 12 }, (_, i) => {
    const m = somarMes(mesAtual, i - 11)
    const ultimo = somarDias(`${somarMes(m, 1)}-01`, -1)
    const nome = formatarMes(m)
    return {
      inicio: `${m}-01`,
      fim: ultimo < fim ? ultimo : fim,
      rotulo: nome.slice(0, 3).replace(/^./, (c) => c.toUpperCase()),
      rotuloLongo: nome,
    }
  })
}

const dentro = (d: string, f: Faixa) => d >= f.inicio && d <= f.fim

/** Variação percentual com seta e cor; a seta e o sinal garantem que não depende só da cor. */
function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior <= 0) return atual > 0 ? <span className="variacao neutra">novo</span> : null
  const pct = ((atual - anterior) / anterior) * 100
  const sobe = pct >= 0
  return (
    <span className={sobe ? 'variacao sobe' : 'variacao desce'}>
      {sobe ? '↑' : '↓'}
      {Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%
    </span>
  )
}

/** Mini gráfico de área do cartão de indicador. */
function Faisca({ valores }: { valores: number[] }) {
  const L = 160
  const A = 44
  const max = Math.max(...valores, 1)
  const pts: Ponto[] = valores.map((v, i) => [(i / Math.max(1, valores.length - 1)) * L, A - 3 - (v / max) * (A - 8)])
  const linha = curvaSuave(pts)
  return (
    <svg className="faisca" viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="faisca-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0659f" stopOpacity="0.35" />
          <stop offset="1" stopColor="#e0659f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${linha} L${L},${A} L0,${A} Z`} fill="url(#faisca-grad)" />
      <path d={linha} fill="none" stroke="#e0659f" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Indicador({
  titulo,
  valor,
  atual,
  anterior,
  serie,
}: {
  titulo: string
  valor: string
  atual: number
  anterior: number
  serie: number[]
}) {
  return (
    <div className="indicador">
      <span className="indicador-titulo">{titulo}</span>
      <span className="indicador-linha">
        <strong>{valor}</strong>
        <Variacao atual={atual} anterior={anterior} />
      </span>
      <span className="indicador-nota">vs período anterior</span>
      <Faisca valores={serie} />
    </div>
  )
}

type Pilha = Record<Categoria, number>

/** Área empilhada por categoria, com cursor que mostra todas as séries do ponto tocado. */
function GraficoEmpilhado({
  rotulos,
  rotulosLongos,
  pilhas,
  visiveis,
}: {
  rotulos: string[]
  rotulosLongos: string[]
  pilhas: Pilha[]
  visiveis: Set<Categoria>
}) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const L = 340
  const A = 210
  const m = { esq: 40, dir: 8, topo: 12, base: 24 }
  const largura = L - m.esq - m.dir
  const altura = A - m.topo - m.base
  const cats = CATEGORIAS.filter((c) => visiveis.has(c.chave))
  const totais = pilhas.map((p) => cats.reduce((s, c) => s + p[c.chave], 0))
  const topo = topoDoEixo(Math.max(...totais, 0))
  const n = pilhas.length
  const x = (i: number) => m.esq + (n === 1 ? largura / 2 : (i / (n - 1)) * largura)
  const y = (v: number) => m.topo + altura - (v / topo) * altura

  // Camadas de baixo para cima: cada uma vai do acumulado anterior até o acumulado com ela.
  const camadas = cats.map((c, k) => {
    const base = pilhas.map((p) => cats.slice(0, k).reduce((s, cc) => s + p[cc.chave], 0))
    const topoCamada = pilhas.map((p, i) => base[i] + p[c.chave])
    const cima: Ponto[] = topoCamada.map((v, i) => [x(i), y(v)])
    const baixo: Ponto[] = base.map((v, i) => [x(i), y(v)]).reverse() as Ponto[]
    return { c, cima, area: `${curvaSuave(cima)} ${curvaSuave(baixo, 'L')} Z` }
  })

  const passoRotulo = Math.ceil(n / 6)

  function mover(e: PointerEvent<SVGRectElement>) {
    const caixa = e.currentTarget.getBoundingClientRect()
    const fracao = (e.clientX - caixa.left) / caixa.width
    setAtivo(Math.max(0, Math.min(n - 1, Math.round(fracao * (n - 1)))))
  }

  return (
    <div className="grafico">
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Faturamento por categoria ao longo do período">
        <defs>
          {cats.map((c) => (
            <linearGradient key={c.chave} id={`grad-${c.chave}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={c.cor} stopOpacity="0.95" />
              <stop offset="1" stopColor={c.cor} stopOpacity="0.55" />
            </linearGradient>
          ))}
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line className="grafico-grade" x1={m.esq} x2={L - m.dir} y1={y(topo * f)} y2={y(topo * f)} />
            <text className="grafico-eixo" x={m.esq - 6} y={y(topo * f) + 4} textAnchor="end">
              {compacto(topo * f)}
            </text>
          </g>
        ))}
        {/* Camadas de cima para baixo, para a borda de cada uma ficar visível sobre a de baixo. */}
        {[...camadas].reverse().map(({ c, area, cima }) => (
          <g key={c.chave}>
            <path d={area} fill={`url(#grad-${c.chave})`} />
            <path d={curvaSuave(cima)} fill="none" className="grafico-vao" />
            <path d={curvaSuave(cima)} fill="none" stroke={c.cor} strokeWidth="2" strokeLinejoin="round" />
          </g>
        ))}
        {ativo !== null && (
          <line className="grafico-cursor" x1={x(ativo)} x2={x(ativo)} y1={m.topo} y2={m.topo + altura} />
        )}
        {rotulos.map((r, i) =>
          i % passoRotulo === 0 || i === n - 1 ? (
            <text key={i} className="grafico-eixo" x={x(i)} y={A - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
              {r}
            </text>
          ) : null,
        )}
        <rect
          x={m.esq}
          y={m.topo}
          width={largura}
          height={altura}
          fill="transparent"
          onPointerMove={mover}
          onPointerDown={mover}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setAtivo(null)}
        />
      </svg>
      <div className="grafico-leitura" aria-live="polite">
        {ativo === null ? (
          <span className="painel-suave">Toque ou passe o dedo no gráfico para ver cada ponto.</span>
        ) : (
          <>
            <span className="leitura-titulo">
              <strong>{formatarMoeda(totais[ativo])}</strong> · {rotulosLongos[ativo]}
            </span>
            <span className="leitura-series">
              {cats.map((c) => (
                <span key={c.chave}>
                  <i style={{ background: c.cor }} />
                  {c.nome} <strong>{formatarMoeda(pilhas[ativo][c.chave])}</strong>
                </span>
              ))}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

interface ItemRanking {
  nome: string
  quantidade: number
  faturamento: number
  produto?: Produto
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState<Periodo>('3m')
  const [ordem, setOrdem] = useState<Ordem>('faturamento')
  const [tabela, setTabela] = useState(false)
  const [visiveis, setVisiveis] = useState<Set<Categoria>>(new Set(CATEGORIAS.map((c) => c.chave)))
  const { dados, erro } = useCarregar(
    () =>
      Promise.all([
        repo.listarPedidos(),
        repo.listarPagamentos(),
        repo.listarClientes(),
        repo.listarProdutos().catch(() => [] as Produto[]),
      ]),
    [],
  )

  const r = useMemo(() => {
    if (!dados) return null
    const [pedidos, pagamentos, clientes, produtos] = dados
    const hoje = hojeIso()
    const lista = faixas(periodo, hoje)
    const ini = lista[0].inicio
    const duracao = Math.round((Date.parse(hoje) - Date.parse(ini)) / 86_400_000) + 1
    const iniAnterior = somarDias(ini, -duracao)
    const vendas = pedidos.filter(contaComoVenda)
    const noPeriodo = vendas.filter((p) => p.data_entrega >= ini && p.data_entrega <= hoje)
    const anteriores = vendas.filter((p) => p.data_entrega >= iniAnterior && p.data_entrega < ini)
    const pagosPeriodo = pagamentos.filter((pg) => pg.data >= ini && pg.data <= hoje)
    const pagosAnterior = pagamentos.filter((pg) => pg.data >= iniAnterior && pg.data < ini)

    const soma = (ps: Pedido[]) => ps.reduce((s, p) => s + totalPedido(p), 0)
    const porFaixa = lista.map((f) => noPeriodo.filter((p) => dentro(p.data_entrega, f)))

    const pilhas: Pilha[] = porFaixa.map((ps) => {
      const pilha: Pilha = { d3: 0, d2: 0, top: 0, out: 0 }
      for (const p of ps) {
        for (const item of p.itens) pilha[categoria(item.descricao)] += item.quantidade * item.valor_unitario
        pilha.out += p.taxa_entrega
      }
      return pilha
    })

    const fat = soma(noPeriodo)
    const fatAnt = soma(anteriores)
    const ticket = noPeriodo.length ? fat / noPeriodo.length : 0
    const ticketAnt = anteriores.length ? fatAnt / anteriores.length : 0

    // Mapa de atividade: 12 semanas (domingo a sábado), pedidos por dia.
    const inicioMapa = somarDias(hoje, -diaDaSemana(hoje) - 77)
    const dias = Array.from({ length: 84 }, (_, i) => somarDias(inicioMapa, i))
    const porDia = new Map<string, Pedido[]>()
    for (const p of vendas) {
      if (p.data_entrega < inicioMapa || p.data_entrega > hoje) continue
      porDia.set(p.data_entrega, [...(porDia.get(p.data_entrega) ?? []), p])
    }
    const maxDia = Math.max(1, ...[...porDia.values()].map((ps) => ps.length))
    const diasPassados = dias.filter((d) => d <= hoje).length
    const ativos = [...porDia.keys()].length
    let melhorDia: { dia: string; valor: number } | null = null
    for (const [dia, ps] of porDia) {
      const v = soma(ps)
      if (!melhorDia || v > melhorDia.valor) melhorDia = { dia, valor: v }
    }
    const pedidosMapa = [...porDia.values()].flat()
    const maior = pedidosMapa.reduce<Pedido | null>((a, p) => (!a || totalPedido(p) > totalPedido(a) ? p : a), null)

    const ranking = new Map<string, ItemRanking>()
    for (const p of noPeriodo) {
      for (const item of p.itens) {
        const chave = item.descricao.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
        const atual = ranking.get(chave) ?? {
          nome: item.descricao.trim(),
          quantidade: 0,
          faturamento: 0,
          produto: produtos.find((pr) => pr.nome.toLocaleLowerCase('pt-BR') === chave),
        }
        atual.quantidade += item.quantidade
        atual.faturamento += item.quantidade * item.valor_unitario
        ranking.set(chave, atual)
      }
    }

    return {
      lista,
      pilhas,
      indicadores: {
        fat: { atual: fat, anterior: fatAnt, serie: porFaixa.map(soma) },
        pedidos: { atual: noPeriodo.length, anterior: anteriores.length, serie: porFaixa.map((ps) => ps.length) },
        ticket: {
          atual: ticket,
          anterior: ticketAnt,
          serie: porFaixa.map((ps) => (ps.length ? soma(ps) / ps.length : 0)),
        },
        recebido: {
          atual: pagosPeriodo.reduce((s, pg) => s + pg.valor, 0),
          anterior: pagosAnterior.reduce((s, pg) => s + pg.valor, 0),
          serie: lista.map((f) => pagosPeriodo.filter((pg) => dentro(pg.data, f)).reduce((s, pg) => s + pg.valor, 0)),
        },
      },
      mapa: dias.map((d) => ({ dia: d, futuro: d > hoje, qtd: porDia.get(d)?.length ?? 0, valor: soma(porDia.get(d) ?? []) })),
      maxDia,
      ativos,
      diasPassados,
      melhorDia,
      maior,
      nomeMaior: maior ? clientes.find((c) => c.id === maior.cliente_id)?.nome ?? '' : '',
      ticketMapa: pedidosMapa.length ? soma(pedidosMapa) / pedidosMapa.length : 0,
      ranking: [...ranking.values()],
    }
  }, [dados, periodo])

  const ranking = r ? [...r.ranking].sort((a, b) => b[ordem] - a[ordem]).slice(0, 10) : []
  const maxRanking = ranking[0]?.[ordem] ?? 1
  const totalVisivel = r
    ? r.pilhas.reduce((s, p) => s + CATEGORIAS.filter((c) => visiveis.has(c.chave)).reduce((ss, c) => ss + p[c.chave], 0), 0)
    : 0

  function alternarCategoria(c: Categoria) {
    const nova = new Set(visiveis)
    if (nova.has(c)) {
      if (nova.size > 1) nova.delete(c)
    } else nova.add(c)
    setVisiveis(nova)
  }

  return (
    <>
      <Cabecalho titulo="Relatórios" voltar />

      <div className="segmentos" role="group" aria-label="Período">
        {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
          <button key={p} className={periodo === p ? 'ativo' : ''} onClick={() => setPeriodo(p)}>
            {PERIODOS[p]}
          </button>
        ))}
      </div>

      <Estado erro={erro} carregando={!r} />
      {r && (
        <>
          <div className="indicadores">
            <Indicador titulo="Faturamento" valor={compacto(r.indicadores.fat.atual)} {...r.indicadores.fat} />
            <Indicador titulo="Pedidos" valor={String(r.indicadores.pedidos.atual)} {...r.indicadores.pedidos} />
            <Indicador titulo="Ticket médio" valor={compacto(r.indicadores.ticket.atual)} {...r.indicadores.ticket} />
            <Indicador titulo="Recebido" valor={compacto(r.indicadores.recebido.atual)} {...r.indicadores.recebido} />
          </div>

          <section className="painel">
            <div className="linha">
              <span className="painel-suave">
                Faturamento, últimos {PERIODOS[periodo]} · por {periodo === '12m' ? 'mês' : 'semana'}
              </span>
              <button className="botao-painel" onClick={() => setTabela(!tabela)}>
                {tabela ? 'Gráfico' : 'Tabela'}
              </button>
            </div>
            <strong className="painel-valor">{formatarMoeda(totalVisivel)}</strong>

            {tabela ? (
              <table className="tabela tabela-escura">
                <thead>
                  <tr>
                    <th>{periodo === '12m' ? 'Mês' : 'Semana'}</th>
                    {CATEGORIAS.filter((c) => visiveis.has(c.chave)).map((c) => (
                      <th key={c.chave}>{c.nome}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.lista.map((f, i) => (
                    <tr key={f.inicio}>
                      <td>{f.rotulo}</td>
                      {CATEGORIAS.filter((c) => visiveis.has(c.chave)).map((c) => (
                        <td key={c.chave}>{compacto(r.pilhas[i][c.chave])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <GraficoEmpilhado
                rotulos={r.lista.map((f) => f.rotulo)}
                rotulosLongos={r.lista.map((f) => f.rotuloLongo)}
                pilhas={r.pilhas}
                visiveis={visiveis}
              />
            )}

            <div className="legenda" role="group" aria-label="Categorias">
              {CATEGORIAS.map((c) => {
                const total = r.pilhas.reduce((s, p) => s + p[c.chave], 0)
                return (
                  <button
                    key={c.chave}
                    className={visiveis.has(c.chave) ? 'legenda-item' : 'legenda-item oculto'}
                    aria-pressed={visiveis.has(c.chave)}
                    onClick={() => alternarCategoria(c.chave)}
                  >
                    <i style={{ background: c.cor }} />
                    {c.nome}
                    <span>{compacto(total)}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="painel">
            <strong className="painel-titulo">Atividade</strong>
            <span className="painel-suave">Pedidos por dia, últimas 12 semanas</span>
            <div className="mapa">
              <div className="mapa-dias" aria-hidden>
                <span />
                <span>Seg</span>
                <span />
                <span>Qua</span>
                <span />
                <span>Sex</span>
                <span />
              </div>
              <div className="mapa-grade">
                {r.mapa.map((d) => {
                  const nivel = d.qtd ? Math.min(4, Math.ceil((d.qtd / r.maxDia) * 5) - 1) : -1
                  return (
                    <span
                      key={d.dia}
                      className={d.futuro ? 'mapa-celula futuro' : 'mapa-celula'}
                      style={nivel >= 0 ? { background: NIVEIS[nivel] } : undefined}
                      title={`${formatarData(d.dia)}: ${d.qtd} ${d.qtd === 1 ? 'pedido' : 'pedidos'}${d.qtd ? ` · ${formatarMoeda(d.valor)}` : ''}`}
                    />
                  )
                })}
              </div>
            </div>
            <div className="mapa-legenda" aria-hidden>
              Menos
              <span className="mapa-celula" />
              {NIVEIS.map((c) => (
                <span key={c} className="mapa-celula" style={{ background: c }} />
              ))}
              Mais
            </div>

            <div className="mapa-destaques">
              <div>
                <span className="painel-suave">Dias com pedidos</span>
                <strong>{r.ativos}</strong>
                <span className="painel-suave">
                  <span className="destaque-rosa">{Math.round((r.ativos / Math.max(1, r.diasPassados)) * 100)}%</span> de{' '}
                  {r.diasPassados} dias
                </span>
              </div>
              <div>
                <span className="painel-suave">Ticket médio</span>
                <strong>{formatarMoeda(r.ticketMapa)}</strong>
                <span className="painel-suave">nas 12 semanas</span>
              </div>
            </div>
            <dl className="mapa-lista">
              <div>
                <dt>Dia mais movimentado</dt>
                <dd>{r.melhorDia ? `${formatarData(r.melhorDia.dia)} · ${formatarMoeda(r.melhorDia.valor)}` : '—'}</dd>
              </div>
              <div>
                <dt>Maior pedido</dt>
                <dd>{r.maior ? `${formatarMoeda(totalPedido(r.maior))} · ${r.nomeMaior.split(' ')[0]}` : '—'}</dd>
              </div>
            </dl>
          </section>

          <div className="linha titulo-secao">
            <h2>Mais vendidos</h2>
          </div>
          <div className="alternar">
            <button className={ordem === 'faturamento' ? 'ativo' : ''} onClick={() => setOrdem('faturamento')}>
              Por faturamento
            </button>
            <button className={ordem === 'quantidade' ? 'ativo' : ''} onClick={() => setOrdem('quantidade')}>
              Por quantidade
            </button>
          </div>

          {ranking.length === 0 ? (
            <p className="vazio">Nenhuma venda neste período.</p>
          ) : (
            <section className="cartao atividades">
              {ranking.map((item, i) => (
                <div key={item.nome} className="ranking">
                  <span className="ranking-posicao">{i + 1}</span>
                  {item.produto ? (
                    <FotoProduto produto={item.produto} tamanho="mini" />
                  ) : (
                    <span className="foto-produto mini">{item.nome[0]?.toUpperCase()}</span>
                  )}
                  <span className="ranking-texto">
                    <strong>{item.nome}</strong>
                    <span className="ranking-barra">
                      <span
                        style={{
                          width: `${Math.max(4, (item[ordem] / maxRanking) * 100)}%`,
                          background: CATEGORIAS.find((c) => c.chave === categoria(item.nome))?.cor,
                        }}
                      />
                    </span>
                  </span>
                  <span className="ranking-valores">
                    <strong>{ordem === 'quantidade' ? formatarQuantidade(item.quantidade) : formatarMoeda(item.faturamento)}</strong>
                    <span className="suave">
                      {ordem === 'quantidade' ? formatarMoeda(item.faturamento) : `${formatarQuantidade(item.quantidade)} un.`}
                    </span>
                  </span>
                </div>
              ))}
            </section>
          )}
          <p className="suave">
            Conta pedidos confirmados, em produção, prontos e entregues, pela data de entrega até hoje. Orçamentos e
            cancelados ficam de fora.
          </p>
        </>
      )}
    </>
  )
}
