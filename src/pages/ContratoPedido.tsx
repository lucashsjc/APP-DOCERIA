import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Cabecalho, Estado } from '../components'
import { repo } from '../data/repo'
import { MODELO_NOME, type Cliente, type DadosContrato, type ModeloContrato, type Pedido } from '../data/types'
import { compartilharArquivo } from '../lib/comprovante'
import { montarContrato, mensagemAceite, type Bloco } from '../lib/contratos'
import { gerarContratoPdf } from '../lib/contratoPdf'
import { linkWhatsApp, somarDias } from '../lib/format'
import { formatarQuantidade } from '../lib/producao'
import { useCarregar } from '../lib/useCarregar'

function contratoInicial(pedido: Pedido): DadosContrato {
  const ehLocacao = pedido.itens.some((i) => /cenogr|fake/i.test(i.descricao))
  return {
    modelo: ehLocacao ? 'locacao' : 'doces',
    local: pedido.tipo === 'entrega' ? pedido.endereco : '',
    horario_entrega: pedido.horario,
    objeto: pedido.itens.map((i) => `${formatarQuantidade(i.quantidade)}× ${i.descricao}`).join('\n'),
    acessorios: '',
    devolucao_data: somarDias(pedido.data_entrega, 1),
    devolucao_hora: '',
  }
}

function dataHora(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Prévia do contrato na tela, no formato de folha. */
function Previa({ blocos }: { blocos: Bloco[] }) {
  return (
    <article className="folha">
      <img className="folha-logo" src="/logo-loja.jpg" alt="Ateliê Doce Festa" />
      {blocos.map((b, i) => {
        switch (b.tipo) {
          case 'titulo':
            return <h3 key={i} className="folha-titulo">{b.texto}</h3>
          case 'subtitulo':
            return <p key={i} className="folha-subtitulo">{b.texto}</p>
          case 'secao':
            return <h4 key={i}>{b.texto}</h4>
          case 'paragrafo':
            return <p key={i}>{b.texto}</p>
          case 'destaque':
            return <p key={i}><strong>{b.texto}</strong></p>
          case 'item':
            return <p key={i} className={b.nivel === 2 ? 'folha-item n2' : 'folha-item'}>• {b.texto}</p>
          case 'campo':
            return <p key={i} className="folha-item">{b.rotulo}: {b.valor}</p>
          case 'espaco':
            return <div key={i} className="folha-espaco" />
          case 'assinaturas':
            return (
              <div key={i} className="folha-assinaturas">
                <span>CONTRATANTE</span>
                <span>CONTRATADA</span>
              </div>
            )
        }
      })}
    </article>
  )
}

export default function ContratoPedido() {
  const { id } = useParams()
  const { dados, erro, recarregar } = useCarregar(async () => {
    const pedido = await repo.buscarPedido(id!)
    if (!pedido) throw new Error('Pedido não encontrado.')
    const cliente = await repo.buscarCliente(pedido.cliente_id)
    return { pedido, cliente }
  }, [id])

  const [contrato, setContrato] = useState<DadosContrato | null>(null)
  const [cpf, setCpf] = useState('')
  const [enderecoCliente, setEnderecoCliente] = useState('')
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    if (!dados) return
    setContrato({ ...contratoInicial(dados.pedido), ...(dados.pedido.contrato ?? {}) })
    setCpf(dados.cliente?.cpf ?? '')
    setEnderecoCliente(dados.cliente?.endereco ?? '')
  }, [dados])

  const clienteAtual: Cliente | null = useMemo(
    () => (dados?.cliente ? { ...dados.cliente, cpf, endereco: enderecoCliente } : null),
    [dados, cpf, enderecoCliente],
  )
  const blocos = useMemo(
    () => (dados && contrato ? montarContrato(dados.pedido, clienteAtual, contrato) : []),
    [dados, contrato, clienteAtual],
  )

  if (!dados || !contrato) {
    return (
      <>
        <Cabecalho titulo="Contrato" voltar />
        <Estado erro={erro} carregando />
      </>
    )
  }

  const { pedido, cliente } = dados
  const mudar = (campo: keyof DadosContrato, valor: string) => setContrato({ ...contrato, [campo]: valor })

  /** Grava o contrato no pedido e o CPF/endereço no cadastro do cliente. */
  async function salvar(extra: Partial<DadosContrato>) {
    const novo = { ...contrato!, ...extra }
    const { id: _id, criado_em: _criado, ...resto } = pedido
    await repo.salvarPedido({ ...resto, contrato: novo }, pedido.id)
    if (cliente && (cliente.cpf !== cpf.trim() || cliente.endereco !== enderecoCliente.trim())) {
      const { id: idCliente, ...dadosCliente } = cliente
      await repo.salvarCliente({ ...dadosCliente, cpf: cpf.trim(), endereco: enderecoCliente.trim() }, idCliente)
    }
    setContrato(novo)
    recarregar()
  }

  async function gerarEEnviar() {
    setGerando(true)
    try {
      await salvar({ enviado_em: new Date().toISOString() })
      const pdf = await gerarContratoPdf(blocos)
      const nome = (cliente?.nome.split(' ')[0] ?? 'cliente').toLocaleLowerCase('pt-BR')
      await compartilharArquivo(pdf, `contrato-${nome}-${pedido.data_entrega}.pdf`, `Contrato ${cliente?.nome ?? ''}`)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setGerando(false)
    }
  }

  async function registrarAceite(aceite: 'whatsapp' | 'govbr' | null) {
    try {
      await salvar(aceite ? { aceite, aceito_em: new Date().toISOString() } : { aceite: undefined, aceito_em: undefined })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const locacao = contrato.modelo === 'locacao'

  return (
    <>
      <Cabecalho titulo="Contrato" voltar />

      <section className="bloco">
        <h2>Situação</h2>
        {contrato.aceito_em ? (
          <p className="quitado">
            ✓ Aceito em {dataHora(contrato.aceito_em)} {contrato.aceite === 'govbr' ? '(assinado pelo gov.br)' : '(pelo WhatsApp)'}
          </p>
        ) : contrato.enviado_em ? (
          <p className="falta">Enviado em {dataHora(contrato.enviado_em)}. Aguardando o aceite do cliente.</p>
        ) : (
          <p className="suave">Ainda não enviado.</p>
        )}
      </section>

      <div className="formulario">
        <div className="alternar">
          {(['doces', 'locacao'] as ModeloContrato[]).map((m) => (
            <button key={m} type="button" className={contrato.modelo === m ? 'ativo' : ''} onClick={() => mudar('modelo', m)}>
              {m === 'doces' ? 'Doces' : 'Locação'}
            </button>
          ))}
        </div>
        <p className="suave">Modelo: {MODELO_NOME[contrato.modelo]}</p>

        <fieldset className="grupo">
          <legend>Cliente: {cliente?.nome}</legend>
          <label>
            CPF
            <input inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
          </label>
          <label>
            Endereço do cliente
            <input value={enderecoCliente} onChange={(e) => setEnderecoCliente(e.target.value)} placeholder="Rua, número, bairro, cidade" />
          </label>
        </fieldset>

        <fieldset className="grupo">
          <legend>Evento</legend>
          <label>
            {locacao ? 'Local da festa' : pedido.tipo === 'entrega' ? 'Local da entrega' : 'Local da retirada'}
            <input value={contrato.local} onChange={(e) => mudar('local', e.target.value)} placeholder="Endereço ou nome do salão" />
          </label>
          <label>
            {pedido.tipo === 'entrega' || locacao ? 'Horário da entrega' : 'Horário da retirada'}
            <input type="time" value={contrato.horario_entrega} onChange={(e) => mudar('horario_entrega', e.target.value)} />
          </label>
          {locacao && (
            <div className="dupla">
              <label>
                Data da devolução
                <input type="date" value={contrato.devolucao_data} onChange={(e) => mudar('devolucao_data', e.target.value)} />
              </label>
              <label>
                Horário da devolução
                <input type="time" value={contrato.devolucao_hora} onChange={(e) => mudar('devolucao_hora', e.target.value)} />
              </label>
            </div>
          )}
        </fieldset>

        {locacao && (
          <fieldset className="grupo">
            <legend>Itens da locação</legend>
            <label>
              Descrição (uma linha por item)
              <textarea
                rows={4}
                value={contrato.objeto}
                onChange={(e) => mudar('objeto', e.target.value)}
                placeholder="Bolo Cenográfico (Fake): 4 andares, branco com flores…"
              />
            </label>
            <label>
              Acessórios inclusos
              <input value={contrato.acessorios} onChange={(e) => mudar('acessorios', e.target.value)} placeholder="Ex.: prato de apoio prata" />
            </label>
          </fieldset>
        )}
      </div>

      <h2 className="dia">Prévia do contrato</h2>
      <Previa blocos={blocos} />

      <section className="acoes">
        <button className="botao primario" onClick={gerarEEnviar} disabled={gerando}>
          {gerando ? 'Gerando PDF…' : contrato.enviado_em ? 'Gerar e enviar de novo' : 'Gerar PDF e enviar'}
        </button>
        {cliente?.telefone && (
          <a className="botao" href={linkWhatsApp(cliente.telefone, mensagemAceite(cliente, pedido))} target="_blank" rel="noreferrer">
            Pedir "ACEITO" pelo WhatsApp
          </a>
        )}
        {contrato.aceito_em ? (
          <button className="botao" onClick={() => registrarAceite(null)}>
            Desfazer aceite
          </button>
        ) : (
          <div className="dupla">
            <button className="botao" onClick={() => registrarAceite('whatsapp')}>
              Aceitou no WhatsApp
            </button>
            <button className="botao" onClick={() => registrarAceite('govbr')}>
              Assinou no gov.br
            </button>
          </div>
        )}
      </section>
    </>
  )
}
