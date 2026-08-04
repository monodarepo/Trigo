import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AppShell } from './components/layout/AppShell'
import Alerts from './pages/Alerts'
import BuyRecommendation from './pages/BuyRecommendation'
import Cockpit from './pages/Cockpit'
import Copilot from './pages/Copilot'
import Forecast from './pages/Forecast'
import Hedge from './pages/Hedge'
import LandedCost from './pages/LandedCost'
import Showcase from './pages/Showcase'
import Simulator from './pages/Simulator'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Cockpit />} />
            <Route path="/previsao" element={<Forecast />} />
            <Route path="/tlc" element={<LandedCost />} />
            <Route path="/compra" element={<BuyRecommendation />} />
            <Route path="/hedge" element={<Hedge />} />
            <Route path="/simulador" element={<Simulator />} />
            <Route path="/alertas" element={<Alerts />} />
            <Route path="/copiloto" element={<Copilot />} />
            {/* QA temporário dos primitivos — não listado na sidebar */}
            <Route path="/showcase" element={<Showcase />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  )
}
