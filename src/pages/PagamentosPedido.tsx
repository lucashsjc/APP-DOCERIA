import { useState, type FormEvent } from 'react'
import { repo } from '../data/repo'
import {
  FORMA_NOME,
  FORMAS_PAGAMENTO,
  contaComoVenda,
  saldoPedido,
  totalPago,
  totalPedido,
  type Cliente,
  type FormaPagamento,
  type Pedido,
} from '../data/types'
import { mensagemCobranca } from '../lib/cobranca'
import { formatarData, formatarMoeda, hojeIso, lerMoeda, linkWhatsApp, moedaParaCampo } from '../lib/format'
import { useCarregar } from '../lib/useCarregar'

export default function PagamentosPedido({ pedido, cliente }: { pedido: Pedido; cliente: Cliente | null }) {
  const { dados: pagamentos, erro, recarregar } = useCarregar(() => repo.listarPagamentos(pedido.id), [pedido.id])
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeIso())
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [salvando, setSalvando] = useState(false)

  if (erro) return <p className="erro">Erro: {erro}</p>
  if (!pagamentos) return null

  const total = totalPedido(pedido)
  const pago = totalPago(pedido.id, pagamentos)
  const falta = Math.max(0, Math.round((total - pago) * 100) / 100)
  const saldo = saldoPedido(pedido, pagamentos)
  const atrasado = saldo > 0 && pedido.data_entrega < hojeIso()

  function abrir() {
    setValor(moedaParaCampo(falta))
    setData(hojeIso())
    setForma('pix')
    setAberto(true)
  }

  async function registrar(e: FormEvent) {
    e.preventDefault()
    const lido = lerMoeda(valor)
    if (lido <= 0) return
    setSalvando(true)
    try {
      await repo.salvarPagamento({ pedido_id: pedido.id, data, valor: lido, forma })
      setAberto(false)
      recarregar()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    if (!confirm('Apagar este pagamento?')) return
    await repo.excluirPagamento(id)
    recarregar()
  }

  return (
    <section className="bloco">
      <h2>Pagamentos</h2>

      {pagamentos.map((pg) => (
        <div key={pg.id} className="linha">
          <span>
            {formatarData(pg.data)} · {FORMA_NOME[pg.forma]}
          </span>
          <span className="linha-acao">
            {formatarMoeda(pg.valor)}
            <button className="remover" aria-label="Apagar pagamento" onClick={() => excluir(pg.id)}>
              ×
            </button>
          </span>
        </div>
      ))}
      {pagamentos.length === 0 && <p className="suave">Nenhum pagamento registrado.</p>}

      <div className="linha total">
        <span>Pago</span>
        <span>
          {formatarMoeda(pago)} de {formatarMoeda(total)}
        </span>
      </div>
      {!contaComoVenda(pedido) ? (
        <p className="suave">
          {pedido.status === 'orcamento' ? 'Orçamento ainda não conta como venda.' : 'Pedido cancelado.'}
        </p>
      ) : saldo > 0 ? (
        <p className={atrasado ? 'falta atrasado' : 'falta'}>
          Falta receber {formatarMoeda(saldo)}
          {atrasado && ' · atrasado'}
        </p>
      ) : (
        <p className="quitado">✓ Pago</p>
      )}

      {aberto ? (
        <form className="formulario grupo" onSubmit={registrar}>
          <div className="dupla">
            <label>
              Valor (R$)
              <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required autoFocus />
            </label>
            <label>
              Data
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </label>
          </div>
          <div className="alternar tres">
            {FORMAS_PAGAMENTO.map((f) => (
              <button key={f} type="button" className={f === forma ? 'ativo' : ''} onClick={() => setForma(f)}>
                {FORMA_NOME[f]}
              </button>
            ))}
          </div>
          <div className="dupla">
            <button type="button" className="botao" onClick={() => setAberto(false)}>
              Cancelar
            </button>
            <button className="botao primario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      ) : (
        <button className="botao primario" onClick={abrir}>
          + Registrar pagamento
        </button>
      )}

      {saldo > 0 && cliente?.telefone && (
        <a
          className="botao"
          href={linkWhatsApp(cliente.telefone, mensagemCobranca(cliente.nome, saldo, [pedido]))}
          target="_blank"
          rel="noreferrer"
        >
          Cobrar pelo WhatsApp
        </a>
      )}
    </section>
  )
}
