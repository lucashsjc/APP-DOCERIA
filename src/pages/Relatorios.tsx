import { useMemo, useState } from 'react'
import { Cabecalho, Estado, Valor } from '../components'
import { repo } from '../data/repo'
import { contaComoVenda, totalPedido, type Pedido, type Produto } from '../data/types'
import { formatarMes, formatarMoeda, hojeIso, somarMes } from '../lib/format'
import { formatarQuantidade } from '../lib/producao'
import { useCarregar } from '../lib/useCarregar'
import { FotoProduto } from './Cardapio'

type Periodo = 6 | 12
type Ordem = 'quantidade' | 'faturamento'

interface Mes {
  mes: string // AAAA-MM
  vendido: number
  pedidos: number
}

const mesCurto = (m: string) =>
  formatarMes(m).split(' ')[0].slice(0, 3).replace(/^./, (c) => c.toUpperCase())

/** Eixo em números redondos: 0 / 500 / 1 mil… */
function topoDoEixo(max: number): number {
  if (max <= 0) return 100
  const passo = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / passo) * passo
}

const compacto = (v: number) =>
  v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(Math.round(v))

/** Colunas do faturamento por mês: uma série, rótulo só no maior mês e no mês atual, toque mostra o valor. */
function GraficoMeses({ meses }: { meses: Mes[] }) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const L = 340
  const A = 190
  const margem = { esq: 44, dir: 6, topo: 22, base: 26 }
  const largura = L - margem.esq - margem.dir
  const altura = A - margem.topo - margem.base
  const topo = topoDoEixo(Math.max(...meses.map((m) => m.vendido)))
  const faixa = largura / meses.length
  const barra = Math.min(24, faixa * 0.55)
  const y = (v: number) => margem.topo + altura - (v / topo) * altura
  const maior = meses.reduce((iMax, m, i) => (m.vendido > meses[iMax].vendido ? i : iMax), 0)
  const rotulados = new Set([maior, meses.length - 1])

  return (
    <div className="grafico">
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Faturamento por mês">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line className="grafico-grade" x1={margem.esq} x2={L - margem.dir} y1={y(topo * f)} y2={y(topo * f)} />
            <text className="grafico-eixo" x={margem.esq - 6} y={y(topo * f) + 4} textAnchor="end">
              {compacto(topo * f)}
            </text>
          </g>
        ))}
        {meses.map((m, i) => {
          const x = margem.esq + faixa * i + (faixa - barra) / 2
          const h = Math.max(0, y(0) - y(m.vendido))
          const r = Math.min(4, h)
          return (
            <g key={m.mes}>
              {h > 0 && (
                <path
                  className={ativo === null || ativo === i ? 'grafico-barra' : 'grafico-barra apagada'}
                  d={`M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + barra - r} Q${x + barra},${y(0) - h} ${x + barra},${y(0) - h + r} V${y(0)} Z`}
                />
              )}
              {rotulados.has(i) && m.vendido > 0 && ativo === null && (
                <text className="grafico-valor" x={x + barra / 2} y={y(m.vendido) - 6} textAnchor="middle">
                  {compacto(m.vendido)}
                </text>
              )}
              <text className="grafico-eixo" x={x + barra / 2} y={A - 8} textAnchor="middle">
                {mesCurto(m.mes)}
              </text>
              {/* Área de toque maior que a barra: a faixa inteira do mês. */}
              <rect
                x={margem.esq + faixa * i}
                y={margem.topo}
                width={faixa}
                height={altura}
                fill="transparent"
                tabIndex={0}
                aria-label={`${formatarMes(m.mes)}: ${formatarMoeda(m.vendido)}, ${m.pedidos} pedidos`}
                // Mouse: passar por cima mostra. Toque: o toque escolhe o mês (sem sumir na hora).
                onPointerEnter={(e) => e.pointerType === 'mouse' && setAtivo(i)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setAtivo(null)}
                onClick={() => setAtivo(i)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
              />
            </g>
          )
        })}
      </svg>
      <p className="grafico-dica" aria-live="polite">
        {ativo !== null ? (
          <>
            <strong>{formatarMoeda(meses[ativo].vendido)}</strong> em {formatarMes(meses[ativo].mes)} ·{' '}
            {meses[ativo].pedidos} {meses[ativo].pedidos === 1 ? 'pedido' : 'pedidos'}
          </>
        ) : (
          'Toque numa coluna para ver o valor do mês.'
        )}
      </p>
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
  const [periodo, setPeriodo] = useState<Periodo>(6)
  const [ordem, setOrdem] = useState<Ordem>('quantidade')
  const [tabela, setTabela] = useState(false)
  const { dados, erro } = useCarregar(
    () => Promise.all([repo.listarPedidos(), repo.listarProdutos().catch(() => [] as Produto[])]),
    [],
  )

  const relatorio = useMemo(() => {
    if (!dados) return null
    const [pedidos, produtos] = dados
    const atual = hojeIso().slice(0, 7)
    const lista = Array.from({ length: periodo }, (_, i) => somarMes(atual, i - periodo + 1))
    const noPeriodo = (p: Pedido) => contaComoVenda(p) && lista.includes(p.data_entrega.slice(0, 7))
    const vendas = pedidos.filter(noPeriodo)

    const meses: Mes[] = lista.map((mes) => {
      const doMes = vendas.filter((p) => p.data_entrega.startsWith(mes))
      return { mes, vendido: doMes.reduce((s, p) => s + totalPedido(p), 0), pedidos: doMes.length }
    })
    const total = meses.reduce((s, m) => s + m.vendido, 0)

    const porProduto = new Map<string, ItemRanking>()
    for (const p of vendas) {
      for (const item of p.itens) {
        const chave = item.descricao.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
        const atualItem = porProduto.get(chave) ?? {
          nome: item.descricao.trim(),
          quantidade: 0,
          faturamento: 0,
          produto: produtos.find((pr) => pr.nome.toLocaleLowerCase('pt-BR') === chave),
        }
        atualItem.quantidade += item.quantidade
        atualItem.faturamento += item.quantidade * item.valor_unitario
        porProduto.set(chave, atualItem)
      }
    }
    return { meses, total, qtd: vendas.length, ticket: vendas.length ? total / vendas.length : 0, ranking: [...porProduto.values()] }
  }, [dados, periodo])

  const ranking = relatorio
    ? [...relatorio.ranking].sort((a, b) => b[ordem] - a[ordem]).slice(0, 10)
    : []
  const maxRanking = ranking[0]?.[ordem] ?? 1

  return (
    <>
      <Cabecalho titulo="Relatórios" voltar />

      <div className="alternar">
        {([6, 12] as Periodo[]).map((p) => (
          <button key={p} className={periodo === p ? 'ativo' : ''} onClick={() => setPeriodo(p)}>
            Últimos {p} meses
          </button>
        ))}
      </div>

      <Estado erro={erro} carregando={!relatorio} />
      {relatorio && (
        <>
          <section className="cartao-escuro">
            <span className="cartao-escuro-rotulo">Faturamento nos últimos {periodo} meses</span>
            <Valor valor={relatorio.total} className="cartao-escuro-valor" />
            <p className="cartao-escuro-nota">
              <span className="destaque-rosa">{relatorio.qtd}</span> {relatorio.qtd === 1 ? 'pedido' : 'pedidos'} · ticket
              médio <span className="destaque-rosa">{formatarMoeda(relatorio.ticket)}</span>
            </p>
            <span className="cartao-escuro-anel" aria-hidden />
          </section>

          <section className="bloco">
            <div className="linha">
              <h2>Vendido por mês</h2>
              <button className="botao pequeno" onClick={() => setTabela(!tabela)}>
                {tabela ? 'Ver gráfico' : 'Ver tabela'}
              </button>
            </div>
            {tabela ? (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Pedidos</th>
                    <th>Vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.meses.map((m) => (
                    <tr key={m.mes}>
                      <td>{formatarMes(m.mes)}</td>
                      <td>{m.pedidos}</td>
                      <td>{formatarMoeda(m.vendido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <GraficoMeses meses={relatorio.meses} />
            )}
            <p className="suave">Conta pedidos confirmados, em produção, prontos e entregues, pela data de entrega.</p>
          </section>

          <div className="linha titulo-secao">
            <h2>Mais vendidos</h2>
          </div>
          <div className="alternar">
            <button className={ordem === 'quantidade' ? 'ativo' : ''} onClick={() => setOrdem('quantidade')}>
              Por quantidade
            </button>
            <button className={ordem === 'faturamento' ? 'ativo' : ''} onClick={() => setOrdem('faturamento')}>
              Por faturamento
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
                      <span style={{ width: `${Math.max(4, (item[ordem] / maxRanking) * 100)}%` }} />
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
        </>
      )}
    </>
  )
}
