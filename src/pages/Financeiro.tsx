import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cabecalho, Estado } from '../components'
import { repo } from '../data/repo'
import { contaComoVenda, saldoPedido, totalPedido, type Cliente, type Pedido } from '../data/types'
import { mensagemCobranca } from '../lib/cobranca'
import { formatarMes, formatarMoeda, hojeIso, linkWhatsApp } from '../lib/format'
import { useCarregar } from '../lib/useCarregar'

function somarMes(anoMes: string, delta: number): string {
  const [ano, mes] = anoMes.split('-').map(Number)
  const d = new Date(ano, mes - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Devedor {
  cliente: Cliente
  valor: number
  pedidos: Pedido[]
  atrasado: boolean
}

export default function Financeiro() {
  const [mes, setMes] = useState(hojeIso().slice(0, 7))
  const { dados, erro } = useCarregar(
    () => Promise.all([repo.listarPedidos(), repo.listarPagamentos(), repo.listarClientes()]),
    [],
  )

  const resumo = useMemo(() => {
    if (!dados) return null
    const [pedidos, pagamentos, clientes] = dados
    const hoje = hojeIso()

    const vendasDoMes = pedidos.filter((p) => contaComoVenda(p) && p.data_entrega.startsWith(mes))
    const vendido = vendasDoMes.reduce((s, p) => s + totalPedido(p), 0)
    const recebido = pagamentos.filter((pg) => pg.data.startsWith(mes)).reduce((s, pg) => s + pg.valor, 0)

    const porCliente = new Map<string, Devedor>()
    for (const p of pedidos) {
      const saldo = saldoPedido(p, pagamentos)
      if (saldo <= 0) continue
      const cliente = clientes.find((c) => c.id === p.cliente_id)
      if (!cliente) continue
      const devedor = porCliente.get(cliente.id) ?? { cliente, valor: 0, pedidos: [], atrasado: false }
      devedor.valor += saldo
      devedor.pedidos.push(p)
      devedor.atrasado ||= p.data_entrega < hoje
      porCliente.set(cliente.id, devedor)
    }
    // Atrasados primeiro, depois quem deve mais.
    const devedores = [...porCliente.values()].sort(
      (a, b) => Number(b.atrasado) - Number(a.atrasado) || b.valor - a.valor,
    )
    const aReceber = devedores.reduce((s, d) => s + d.valor, 0)
    const atrasado = devedores.filter((d) => d.atrasado).reduce((s, d) => s + d.valor, 0)

    return { vendido, qtdVendas: vendasDoMes.length, recebido, aReceber, atrasado, devedores }
  }, [dados, mes])

  return (
    <>
      <Cabecalho titulo="Financeiro" />
      <div className="mes">
        <button aria-label="Mês anterior" onClick={() => setMes(somarMes(mes, -1))}>
          ‹
        </button>
        <span>{formatarMes(mes)}</span>
        <button aria-label="Próximo mês" onClick={() => setMes(somarMes(mes, 1))}>
          ›
        </button>
      </div>

      <Estado erro={erro} carregando={!resumo} />
      {resumo && (
        <>
          <div className="numeros">
            <div className="numero">
              <span className="numero-rotulo">Vendido no mês</span>
              <strong>{formatarMoeda(resumo.vendido)}</strong>
              <span className="suave">
                {resumo.qtdVendas} {resumo.qtdVendas === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>
            <div className="numero">
              <span className="numero-rotulo">Recebido no mês</span>
              <strong>{formatarMoeda(resumo.recebido)}</strong>
            </div>
          </div>
          <div className="numero largo">
            <span className="numero-rotulo">A receber (todos os meses)</span>
            <strong>{formatarMoeda(resumo.aReceber)}</strong>
            {resumo.atrasado > 0 && (
              <span className="falta atrasado">{formatarMoeda(resumo.atrasado)} atrasado</span>
            )}
          </div>

          <h2 className="dia">Quem está devendo</h2>
          {resumo.devedores.length === 0 && <p className="vazio">Ninguém devendo. 🎉</p>}
          {resumo.devedores.map((d) => (
            <div key={d.cliente.id} className={d.atrasado ? 'cartao destaque-atraso' : 'cartao'}>
              <Link to={`/clientes/${d.cliente.id}`} className="linha sem-link">
                <strong>{d.cliente.nome}</strong>
                <strong>{formatarMoeda(d.valor)}</strong>
              </Link>
              <div className="linha suave">
                <span>
                  {d.pedidos.length} {d.pedidos.length === 1 ? 'pedido' : 'pedidos'}
                  {d.atrasado && <span className="atrasado"> · atrasado</span>}
                </span>
                {d.cliente.telefone && (
                  <a
                    className="botao pequeno"
                    href={linkWhatsApp(d.cliente.telefone, mensagemCobranca(d.cliente.nome, d.valor, d.pedidos))}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Cobrar
                  </a>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  )
}
