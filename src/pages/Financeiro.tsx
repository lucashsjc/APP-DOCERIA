import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cabecalho, Estado } from '../components'
import { repo } from '../data/repo'
import { contaComoVenda, saldoPedido, totalPedido, type Cliente, type Pedido } from '../data/types'
import { mensagemCobranca } from '../lib/cobranca'
import { formatarDataRelativa, formatarMes, formatarMoeda, hojeIso, linkWhatsApp, somarDias, somarMes } from '../lib/format'
import { useCarregar } from '../lib/useCarregar'
import { compartilharArquivo } from '../lib/comprovante'
import { gerarCopiaDeSeguranca, marcarCopia, ultimaCopia } from '../lib/copiaSeguranca'

interface Devedor {
  cliente: Cliente
  valor: number
  pedidos: Pedido[]
  atrasado: number
}

function CopiaDeSeguranca() {
  const [ultima, setUltima] = useState(ultimaCopia)
  const [gerando, setGerando] = useState(false)
  const atrasada = !ultima || ultima < somarDias(hojeIso(), -30)

  async function baixar() {
    setGerando(true)
    try {
      const hoje = hojeIso()
      const planilha = await gerarCopiaDeSeguranca()
      await compartilharArquivo(planilha, `atelie-doce-festa-copia-${hoje}.xlsx`, 'Cópia de segurança')
      marcarCopia(hoje)
      setUltima(hoje)
    } catch (e) {
      alert(`Não consegui gerar a cópia: ${(e as Error).message}`)
    } finally {
      setGerando(false)
    }
  }

  return (
    <section className={atrasada ? 'bloco copia atrasada' : 'bloco copia'}>
      <h2>Cópia de segurança</h2>
      <p className="suave">
        Uma planilha com todos os pedidos, itens, pagamentos, clientes e o cardápio. Abre no Excel, no Numbers e no
        Google Planilhas. Guarde no iCloud Drive ou mande para você mesma no WhatsApp ou no e-mail.
      </p>
      <p className={atrasada ? 'copia-quando atrasado' : 'copia-quando'}>
        {ultima
          ? `Última cópia neste aparelho: ${formatarDataRelativa(ultima).toLocaleLowerCase('pt-BR')}${atrasada ? ' · faça uma nova' : ''}`
          : 'Nenhuma cópia feita neste aparelho ainda.'}
      </p>
      <button className="botao primario" onClick={baixar} disabled={gerando}>
        {gerando ? 'Gerando planilha…' : 'Baixar planilha'}
      </button>
    </section>
  )
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
      const devedor = porCliente.get(cliente.id) ?? { cliente, valor: 0, pedidos: [], atrasado: 0 }
      devedor.valor += saldo
      devedor.pedidos.push(p)
      if (p.data_entrega < hoje) devedor.atrasado += saldo
      porCliente.set(cliente.id, devedor)
    }
    // Atrasados primeiro, depois quem deve mais.
    const devedores = [...porCliente.values()].sort(
      (a, b) => Number(b.atrasado > 0) - Number(a.atrasado > 0) || b.valor - a.valor,
    )
    const aReceber = devedores.reduce((s, d) => s + d.valor, 0)
    const atrasado = devedores.reduce((s, d) => s + d.atrasado, 0)

    return { vendido, qtdVendas: vendasDoMes.length, recebido, aReceber, atrasado, devedores }
  }, [dados, mes])

  return (
    <>
      <Cabecalho
        titulo="Financeiro"
        acao={
          <Link to="/relatorios" className="botao pequeno">
            Relatórios
          </Link>
        }
      />
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
          {resumo.devedores.length === 0 && <p className="vazio">Ninguém devendo.</p>}
          <div className="lista">
            {resumo.devedores.map((d) => (
              <div key={d.cliente.id} className={d.atrasado > 0 ? 'cartao destaque-atraso' : 'cartao'}>
                <Link to={`/clientes/${d.cliente.id}`} className="linha sem-link">
                  <strong>{d.cliente.nome}</strong>
                  <strong>{formatarMoeda(d.valor)}</strong>
                </Link>
                <div className="linha suave">
                  <span>
                    {d.pedidos.length} {d.pedidos.length === 1 ? 'pedido' : 'pedidos'}
                    {d.atrasado > 0 && <span className="atrasado"> · {formatarMoeda(d.atrasado)} atrasado</span>}
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
          </div>
        </>
      )}

      <CopiaDeSeguranca />
    </>
  )
}
