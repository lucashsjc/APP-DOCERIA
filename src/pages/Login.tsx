import { useState, type FormEvent } from 'react'
import { supabase } from '../data/supabaseRepo'
import { NOME_LOJA } from '../marca'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setErro(null)
    const { error } = await supabase!.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos.')
    setEntrando(false)
  }

  return (
    <main className="login">
      <section className="login-texto">
        <span className="logo">{NOME_LOJA}</span>
        <h1>Seus pedidos, sempre organizados.</h1>
        <p className="suave">Pedidos, clientes, agenda e recebimentos da loja em um só lugar.</p>
      </section>
      <form onSubmit={entrar} className="formulario cartao-login">
        <label>
          E-mail
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button className="botao primario" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
