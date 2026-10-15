import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { modoDemonstracao } from './data/repo'
import { supabase } from './data/supabaseRepo'
import Login from './pages/Login'
import Pedidos from './pages/Pedidos'
import PedidoDetalhe from './pages/PedidoDetalhe'
import PedidoForm from './pages/PedidoForm'
import Clientes from './pages/Clientes'
import ClienteDetalhe from './pages/ClienteDetalhe'
import ClienteForm from './pages/ClienteForm'
import Financeiro from './pages/Financeiro'

export default function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(modoDemonstracao ? null : undefined)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => data.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <div className="carregando">Carregando…</div>
  if (!modoDemonstracao && !sessao) return <Login />

  return (
    <HashRouter>
      {modoDemonstracao && (
        <div className="aviso-demo">Modo demonstração: os dados ficam só neste aparelho.</div>
      )}
      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Pedidos />} />
          <Route path="/pedidos/novo" element={<PedidoForm />} />
          <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
          <Route path="/pedidos/:id/editar" element={<PedidoForm />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/novo" element={<ClienteForm />} />
          <Route path="/clientes/:id" element={<ClienteDetalhe />} />
          <Route path="/clientes/:id/editar" element={<ClienteForm />} />
          <Route path="/financeiro" element={<Financeiro />} />
        </Routes>
      </main>
      <nav className="abas">
        <NavLink to="/" end>
          <span aria-hidden>🧁</span>Pedidos
        </NavLink>
        <NavLink to="/clientes">
          <span aria-hidden>👥</span>Clientes
        </NavLink>
        <NavLink to="/financeiro">
          <span aria-hidden>💰</span>Financeiro
        </NavLink>
      </nav>
    </HashRouter>
  )
}
