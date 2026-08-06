import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/feedback/ErrorBoundary'
import { TelaComEstado } from './components/feedback/TelaComEstado'
import {
  EsqueletoAlertas,
  EsqueletoCockpit,
  EsqueletoCompra,
  EsqueletoCopiloto,
  EsqueletoHedge,
  EsqueletoPlaceholder,
  EsqueletoPrevisao,
  EsqueletoSimulador,
  EsqueletoSinais,
  EsqueletoTlc,
  EsqueletoVro,
} from './components/feedback/skeletons'
/**
 * A Visão Executiva é a rota de entrada e vem no bundle inicial — carregá-la
 * sob demanda só adicionaria um round-trip antes do primeiro pixel útil.
 * Todas as demais são `lazy`: o fallback do Suspense é o MESMO esqueleto que a
 * rota já usava, então o code-split não introduz um segundo estado de carga.
 */
import Cockpit from './pages/Cockpit'

const Alerts = lazy(() => import('./pages/Alerts'))
const BuyRecommendation = lazy(() => import('./pages/BuyRecommendation'))
const Copilot = lazy(() => import('./pages/Copilot'))
const DemandPlanning = lazy(() => import('./pages/DemandPlanning'))
const ExportOnePager = lazy(() => import('./pages/ExportOnePager'))
const Forecast = lazy(() => import('./pages/Forecast'))
const Hedge = lazy(() => import('./pages/Hedge'))
const Inventory = lazy(() => import('./pages/Inventory'))
const LandedCost = lazy(() => import('./pages/LandedCost'))
const LiveSignals = lazy(() => import('./pages/LiveSignals'))
const MakeBuySell = lazy(() => import('./pages/MakeBuySell'))
const MillPerformance = lazy(() => import('./pages/MillPerformance'))
const Opportunities = lazy(() => import('./pages/Opportunities'))
const Poc = lazy(() => import('./pages/Poc'))
const Showcase = lazy(() => import('./pages/Showcase'))
const Simulator = lazy(() => import('./pages/Simulator'))
const Verticalization = lazy(() => import('./pages/Verticalization'))
const Vro = lazy(() => import('./pages/Vro'))

/** Hash router para builds de preview estático (VITE_HASH_ROUTER=1). */
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter

/** Cache + stale-while-revalidate dos sinais ao vivo (periferia). */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
})

/**
 * Rota → tela + skeleton por layout + fronteira de erro (nunca tela branca).
 * Ordem = a da sidebar (elos da cadeia: visão · mercado · trigo · moinhos · margem · governança).
 */
const TELAS: Array<{ path: string; titulo: string; Tela: ComponentType; esqueleto: ReactNode }> = [
  { path: '/', titulo: 'a Visão Executiva', Tela: Cockpit, esqueleto: <EsqueletoCockpit /> },
  { path: '/previsao', titulo: 'o Mercado de Trigo e Farinha', Tela: Forecast, esqueleto: <EsqueletoPrevisao /> },
  { path: '/sinais', titulo: 'os Sinais ao Vivo', Tela: LiveSignals, esqueleto: <EsqueletoSinais /> },
  { path: '/tlc', titulo: 'o Total Landed Cost', Tela: LandedCost, esqueleto: <EsqueletoTlc /> },
  { path: '/compra', titulo: 'a Recomendação de Compra', Tela: BuyRecommendation, esqueleto: <EsqueletoCompra /> },
  { path: '/hedge', titulo: 'o Hedge', Tela: Hedge, esqueleto: <EsqueletoHedge /> },
  { path: '/estoques', titulo: 'os Estoques & Blends', Tela: Inventory, esqueleto: <EsqueletoPlaceholder /> },
  { path: '/moinhos', titulo: 'a Performance dos Moinhos', Tela: MillPerformance, esqueleto: <EsqueletoPlaceholder /> },
  { path: '/verticalizacao', titulo: 'a Rentabilidade da Verticalização', Tela: Verticalization, esqueleto: <EsqueletoPlaceholder /> },
  { path: '/demanda', titulo: 'o Planejamento da Demanda', Tela: DemandPlanning, esqueleto: <EsqueletoPlaceholder /> },
  { path: '/make-buy-sell', titulo: 'o Simulador Make/Buy/Sell', Tela: MakeBuySell, esqueleto: <EsqueletoPlaceholder /> },
  { path: '/oportunidades', titulo: 'as Oportunidades Comerciais', Tela: Opportunities, esqueleto: <EsqueletoPlaceholder /> },
  { path: '/simulador', titulo: 'o Simulador de Cenários', Tela: Simulator, esqueleto: <EsqueletoSimulador /> },
  { path: '/alertas', titulo: 'os Alertas & Decisões', Tela: Alerts, esqueleto: <EsqueletoAlertas /> },
  { path: '/copiloto', titulo: 'o Copiloto Executivo', Tela: Copilot, esqueleto: <EsqueletoCopiloto /> },
  { path: '/vro', titulo: 'a Realização de Valor', Tela: Vro, esqueleto: <EsqueletoVro /> },
  { path: '/poc', titulo: 'o Modo POC', Tela: Poc, esqueleto: <EsqueletoPlaceholder /> },
]

export default function App() {
  return (
    <ErrorBoundary rotulo="A Torre de Controle">
    <QueryClientProvider client={queryClient}>
    <MotionConfig reducedMotion="user">
      <Router>
        <Routes>
          {/* One-pager de exportação: fora do AppShell (página clara, para imprimir).
              Fora do AppShell também está fora do TelaComEstado, então precisa do
              seu próprio Suspense — sem ele, o lazy derruba a árvore. */}
          <Route
            path="/exportar"
            element={
              <Suspense fallback={null}>
                <ExportOnePager />
              </Suspense>
            }
          />
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
            {/* Alias: a rota canônica de Estoques & Blends é /estoques. */}
            <Route path="/estoques-blends" element={<Navigate to="/estoques" replace />} />
            {/* QA temporário dos primitivos — não listado na sidebar */}
            <Route
              path="/showcase"
              element={
                <Suspense fallback={null}>
                  <Showcase />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </MotionConfig>
    </QueryClientProvider>
    </ErrorBoundary>
  )
}
