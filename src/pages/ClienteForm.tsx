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
      })
      .catch((e: Error) => setErro(e.message))
  }, [id])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      const salvo = await repo.salvarCliente(
        { nome: nome.trim(), telefone: telefone.trim(), observacoes: observacoes.trim() },
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
        {erro && <p className="erro">{erro}</p>}
        <button className="botao primario" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar cliente'}
        </button>
      </form>
    </>
  )
}
