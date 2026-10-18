import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Cabecalho } from '../components'
import { repo } from '../data/repo'

export default function ClienteForm() {
  const { id } = useParams()
  const navegar = useNavigate()
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [cpf, setCpf] = useState('')
  const [endereco, setEndereco] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!id) return
    repo
      .buscarCliente(id)
      .then((c) => {
        if (!c) throw new Error('Cliente não encontrado.')
        setNome(c.nome)
        setTelefone(c.telefone)
        setObservacoes(c.observacoes)
        setCpf(c.cpf ?? '')
        setEndereco(c.endereco ?? '')
      })
      .catch((e: Error) => setErro(e.message))
  }, [id])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      const salvo = await repo.salvarCliente(
        {
          nome: nome.trim(),
          telefone: telefone.trim(),
          observacoes: observacoes.trim(),
          cpf: cpf.trim(),
          endereco: endereco.trim(),
        },
        id,
      )
      navegar(`/clientes/${salvo.id}`, { replace: true })
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <>
      <Cabecalho titulo={id ? 'Editar cliente' : 'Novo cliente'} voltar />
      <form className="formulario" onSubmit={salvar}>
        <label>
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>
        <label>
          Telefone (WhatsApp)
          <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(12) 99999-9999" />
        </label>
        <label>
          Observações
          <textarea
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Preferências, alergias, como conheceu a loja…"
          />
        </label>
        <fieldset className="grupo">
          <legend>Para contratos (opcional)</legend>
          <p className="suave">Só aparecem no contrato, nunca nas listas.</p>
          <label>
            CPF
            <input inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
          </label>
          <label>
            Endereço
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade" />
          </label>
        </fieldset>
        {erro && <p className="erro">{erro}</p>}
        <button className="botao primario" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar cliente'}
        </button>
      </form>
    </>
  )
}
