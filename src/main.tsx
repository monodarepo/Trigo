import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/* Boot à prova de tela branca, em três camadas: erros de RENDER caem no
 * ErrorBoundary raiz do App; erros na avaliação dos MÓDULOS importados acima
 * (que rodam antes deste corpo) caem na rede de segurança inline do
 * index.html; este try/catch cobre o meio do caminho (#root ausente, falha ao
 * criar a raiz), com um aviso legível que não depende do CSS do bundle. */
const raiz = document.getElementById('root')
try {
  if (!raiz) throw new Error('elemento #root não encontrado no index.html')
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (erro) {
  console.error('[torre] falha ao iniciar:', erro)
  const alvo = raiz ?? document.body
  alvo.innerHTML =
    '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:48px 24px;text-align:center;background:#0A101F;color:#F4F7FF;font-family:system-ui,sans-serif">' +
    '<p style="font-size:16px;font-weight:600;margin:0">A Torre de Controle não conseguiu iniciar</p>' +
    '<p style="font-size:13px;color:#8593AC;margin:0">Recarregue a página; se persistir, avise o time Monoda.</p>' +
    '</div>'
}
