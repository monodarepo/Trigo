import type { ComponentType, ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AppShell } from './components/layout/AppShell'
import { TelaComEstado } from './components/feedback/TelaComEstado'
import {
  EsqueletoAlertas,
  EsqueletoCockpit,
  EsqueletoCompra,
  EsqueletoCopiloto,
  EsqueletoHedge,
  EsqueletoPrevisao,
  EsqueletoSimulador,
  EsqueletoTlc,
  EsqueletoVro,
} from './components/feedback/skeletons'
import Alerts from './pages/Alerts'
import BuyRecommendation from './pages/BuyRecommendation'
import Cockpit from './pages/Cockpit'
import Copilot from './pages/Copilot'
import Forecast from './pages/Forecast'
import Hedge from './pages/Hedge'
import LandedCost from './pages/LandedCost'
import Showcase from './pages/Showcase'
import Simulator from './pages/Simulator'
import Vro from './pages/Vro'

/** Hash router para builds de preview estático (VITE_HASH_ROUTER=1). */
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter

/** Rota → tela + skeleton por layout + fronteira de erro (nunca tela branca). */
const TELAS: Array<{ path: string; titulo: string; Tela: ComponentType; esqueleto: ReactNode }> = [
  { path: '/', titulo: 'o Cockpit Executivo', Tela: Cockpit, esqueleto: <EsqueletoCockpit /> },
  { path: '/previsao', titulo: 'a Previsão de Preço e Câmbio', Tela: Forecast, esqueleto: <EsqueletoPrevisao /> },
  { path: '/tlc', titulo: 'o Total Landed Cost', Tela: LandedCost, esqueleto: <EsqueletoTlc /> },
  { path: '/compra', titulo: 'a Recomendação de Compra', Tela: BuyRecommendation, esqueleto: <EsqueletoCompra /> },
  { path: '/hedge', titulo: 'a Recomendação de Hedge', Tela: Hedge, esqueleto: <EsqueletoHedge /> },
  { path: '/simulador', titulo: 'o Simulador de Cenários', Tela: Simulator, esqueleto: <EsqueletoSimulador /> },
  { path: '/alertas', titulo: 'os Alertas Diários', Tela: Alerts, esqueleto: <EsqueletoAlertas /> },
  { path: '/copiloto', titulo: 'o Copiloto Gemini', Tela: Copilot, esqueleto: <EsqueletoCopiloto /> },
  { path: '/vro', titulo: 'a Realização de Valor', Tela: Vro, esqueleto: <EsqueletoVro /> },
]

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Router>
        <Routes>
          <Route element={<AppShell />}>
            {TELAS.map(({ path, titulo, Tela, esqueleto }) => (
              <Route
                key={path}
                path={path}
                element={
                  <TelaComEstado rota={path} titulo={titulo} esqueleto={esqueleto}>
                    <Tela />
                  </TelaComEstado>
                }
              />
            ))}
            {/* QA temporário dos primitivos — não listado na sidebar */}
            <Route path="/showcase" element={<Showcase />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </MotionConfig>
  )
}
