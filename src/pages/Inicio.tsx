import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Estado, Valor } from '../components'
import { repo } from '../data/repo'
import { STATUS_NOME, contaComoVenda, saldoPedido, totalPedido, type Pedido } from '../data/types'
import { IconeAgenda, IconeCardapio, IconeMais, IconeMoeda, IconeProducao, IconeSeta, IconeSino } from '../icones'
import { formatarDataRelativa, formatarMoeda, hojeIso, somarMes } from '../lib/format'
import { useCarregar } from '../lib/useCarregar'
import { NOME_DONA } from '../marca'

type Visao = 'receber' | 'vendido'

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

const chave = (p: Pedido) => `${p.data_entrega} ${p.horario || '99:99'}`

export default function Inicio() {
  const [visao, setVisao] = useState<Visao>('receber')
  const { dados, erro } = useCarregar(
    () => Promise.all([repo.listarPedidos(), repo.listarClientes(), repo.listarPagamentos()]),
    [],
  )

  const painel = useMemo(() => {
    if (!dados) return null
    const [pedidos, clientes, pagamentos] = dados
    const hoje = hojeIso()
    const mes = hoje.slice(0, 7)
    const mesPassado = somarMes(mes, -1)
    const nomes = new Map(clientes.map((c) => [c.id, c.nome]))

    const vendidoNo = (m: string) =>
      pedidos.filter((p) => contaComoVenda(p) && p.data_entrega.startsWith(m)).reduce((s, p) => s + totalPedido(p), 0)
    const vendido = vendidoNo(mes)
    const vendidoAntes = vendidoNo(mesPassado)
    const recebido = pagamentos.filter((pg) => pg.data.startsWith(mes)).reduce((s, pg) => s + pg.valor, 0)

    const emAberto = pedidos.filter((p) => saldoPedido(p, pagamentos) > 0)
    const aReceber = emAberto.reduce((s, p) => s + saldoPedido(p, pagamentos), 0)
    const atrasados = emAberto.filter((p) => p.data_entrega < hoje).length

    const proximos = pedidos
      .filter((p) => p.status !== 'cancelado' && p.status !== 'entregue')
      .sort((a, b) => chave(a).localeCompare(chave(b)))
      .slice(0, 5)
      .map((p) => ({ ...p, cliente: nomes.get(p.cliente_id) ?? '—', saldo: saldoPedido(p, pagamentos) }))

    return {
      vendido,
      variacao: vendidoAntes > 0 ? ((vendido - vendidoAntes) / vendidoAntes) * 100 : null,
      recebido,
      aReceber,
      qtdAberto: emAberto.length,
      atrasados,
      proximos,
      hoje,
    }
  }, [dados])

  const progresso = painel && painel.vendido > 0 ? Math.min(100, Math.round((painel.recebido / painel.vendido) * 100)) : 0

  return (
    <>
      <header className="saudacao">
        <img className="avatar-loja" src="/logo-loja.jpg" alt="" />
        <div>
          <span className="suave">Bem-vinda de volta</span>
          <strong>{NOME_DONA}</strong>
        </div>
        <Link to="/financeiro" className="botao-redondo" aria-label="Avisos do financeiro">
          <IconeSino />
          {painel && painel.atrasados > 0 && <span className="ponto-aviso" />}
        </Link>
      </header>

      <Estado erro={erro} carregando={!painel} />

      {painel && (
        <>
          <section className="cartao-escuro">
            <div className="linha">
              <span className="cartao-escuro-rotulo">{visao === 'receber' ? 'Total a receber' : 'Vendido no mês'}</span>
              <div className="pilulas" role="group" aria-label="Mostrar">
                <button className={visao === 'receber' ? 'ativo' : ''} onClick={() => setVisao('receber')}>
                  Receber
                </button>
                <button className={visao === 'vendido' ? 'ativo' : ''} onClick={() => setVisao('vendido')}>
                  Vendido
                </button>
              </div>
            </div>
            <Valor valor={visao === 'receber' ? painel.aReceber : painel.vendido} className="cartao-escuro-valor" />
            <p className="cartao-escuro-nota">
              {visao === 'receber' ? (
                painel.atrasados > 0 ? (
                  <>
                    <span className="destaque-rosa">{painel.atrasados}</span>{' '}
                    {painel.atrasados === 1 ? 'pedido atrasado' : 'pedidos atrasados'} · {painel.qtdAberto} em aberto
                  </>
                ) : (
                  <>
                    <span className="destaque-rosa">{painel.qtdAberto}</span> {painel.qtdAberto === 1 ? 'pedido' : 'pedidos'} em aberto
                  </>
                )
              ) : painel.variacao !== null ? (
                <>
                  <span className="destaque-rosa">
                    <IconeSeta /> {painel.variacao >= 0 ? '+' : ''}
                    {painel.variacao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                  </span>{' '}
                  vs mês passado
                </>
              ) : (
                'Primeiro mês com vendas registradas'
              )}
            </p>
            <span className="cartao-escuro-anel" aria-hidden />
          </section>

          <nav className="atalhos">
            <Link to="/pedidos/novo" className="atalho principal">
              <span><IconeMais /></span>Novo pedido
            </Link>
            <Link to="/agenda" className="atalho">
              <span><IconeAgenda /></span>Agenda
            </Link>
            <Link to="/agenda?visao=producao" className="atalho">
              <span><IconeProducao /></span>Produção
            </Link>
            <Link to="/cardapio" className="atalho">
              <span><IconeCardapio /></span>Cardápio
            </Link>
          </nav>

          <Link to="/financeiro" className="cartao progresso">
            <span className="progresso-icone"><IconeMoeda /></span>
            <span className="progresso-texto">
              <strong>Recebido no mês</strong>
              <span className="suave">
                {formatarMoeda(painel.recebido)} de {formatarMoeda(painel.vendido)}
              </span>
            </span>
            <strong className="progresso-pct">{progresso}%</strong>
            <span className="barra">
              <span style={{ width: `${progresso}%` }} />
            </span>
          </Link>

          <div className="linha titulo-secao">
            <h2>Próximos pedidos</h2>
            <Link to="/pedidos" className="ver-todos">
              Ver todos
            </Link>
          </div>

          {painel.proximos.length === 0 ? (
            <p className="vazio">Nenhum pedido pela frente.</p>
          ) : (
            <section className="cartao atividades">
              {painel.proximos.map((p, i) => (
                <Link key={p.id} to={`/pedidos/${p.id}`} className="atividade">
                  <span className={i === 0 ? 'iniciais rosa' : 'iniciais'}>{iniciais(p.cliente)}</span>
                  <span className="atividade-texto">
                    <strong>{p.cliente}</strong>
                    <span className={p.data_entrega < painel.hoje ? 'suave atrasado' : 'suave'}>
                      {formatarDataRelativa(p.data_entrega)}
                      {p.horario && ` · ${p.horario}`} · {STATUS_NOME[p.status]}
                    </span>
                  </span>
                  <span className="atividade-valor">
                    <Valor valor={totalPedido(p)} />
                    {contaComoVenda(p) && (
                      <span className={p.saldo > 0 ? 'falta' : 'quitado'}>{p.saldo > 0 ? 'a receber' : 'pago'}</span>
                    )}
                  </span>
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </>
  )
}
