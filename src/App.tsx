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
import Agenda from './pages/Agenda'
import Cardapio from './pages/Cardapio'
import ContratoPedido from './pages/ContratoPedido'
import { IconeAgenda, IconeCardapio, IconeClientes, IconeFinanceiro, IconePedidos } from './icones'
import { NOME_LOJA } from './marca'

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
      <header className="topo">
        <span className="logo">{NOME_LOJA}</span>
        <nav className="abas">
          <NavLink to="/" end>
            <IconePedidos />
            Pedidos
          </NavLink>
          <NavLink to="/agenda">
            <IconeAgenda />
            Agenda
          </NavLink>
          <NavLink to="/cardapio">
            <IconeCardapio />
            Cardápio
          </NavLink>
          <NavLink to="/clientes">
            <IconeClientes />
            Clientes
          </NavLink>
          <NavLink to="/financeiro">
            <IconeFinanceiro />
            Financeiro
          </NavLink>
        </nav>
      </header>
      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Pedidos />} />
          <Route path="/pedidos/novo" element={<PedidoForm />} />
          <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
          <Route path="/pedidos/:id/editar" element={<PedidoForm />} />
          <Route path="/pedidos/:id/contrato" element={<ContratoPedido />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/novo" element={<ClienteForm />} />
          <Route path="/clientes/:id" element={<ClienteDetalhe />} />
          <Route path="/clientes/:id/editar" element={<ClienteForm />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/cardapio" element={<Cardapio />} />
        </Routes>
      </main>
    </HashRouter>
  )
}
