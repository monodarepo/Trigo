/**
 * PORTA DE ENTRADA DO PROTÓTIPO — e é importante ser exato sobre o que isto é.
 *
 * Isto NÃO é autenticação. Não há servidor: a verificação roda no navegador de
 * quem entra, e qualquer pessoa com o DevTools aberto passa por ela editando
 * uma linha de JavaScript ou escrevendo a chave no sessionStorage. Serve para
 * o mockup não ficar aberto na URL durante a fase de venda — o equivalente a
 * uma porta encostada, não a uma fechadura.
 *
 * O que dá para fazer bem, e está feito: NÃO carregar a senha em texto no
 * bundle. Guardamos só o SHA-256 de `USUÁRIO:senha`. Quem abrir o JS público
 * vê um digest, não a senha — que pode ser reaproveitada em outro lugar. Isso
 * não impede o bypass (nada client-side impede), mas impede o vazamento.
 *
 * Quando houver backend, o que muda aqui é `entrar()`: vira uma chamada que
 * devolve um token, e a tela de login continua igual.
 */
import { useSyncExternalStore } from 'react'

/**
 * SHA-256 de `MDIA3:<senha>`. Trocar a credencial = trocar este digest
 * (`printf 'USUARIO:senha' | shasum -a 256`) ou definir VITE_ACESSO_HASH no
 * ambiente de build — assim a rotação não pede commit.
 */
const HASH_ESPERADO =
  import.meta.env.VITE_ACESSO_HASH ?? '9705f3b555acd7eb43b3651a469840283089b2d2256b60e085851ac83b6255e3'

/** Marca de sessão: dura a aba aberta, some ao fechar. */
const CHAVE = 'torre:sessao'

/**
 * `sessionStorage` e não `localStorage`: a demo não deve deixar a porta
 * destrancada para sempre na máquina de quem assistiu. E não é `useState`
 * porque um F5 no meio da apresentação não pode devolver ninguém ao login.
 */
function lerPersistido(): boolean {
  try {
    return sessionStorage.getItem(CHAVE) === '1'
  } catch {
    // Modo privado/cookies de terceiros bloqueados: a sessão não persiste.
    return false
  }
}

let autenticado = lerPersistido()
const listeners = new Set<() => void>()

function emitir() {
  for (const l of listeners) l()
}

async function digest(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto)
  const buffer = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Comparação em tempo constante. Contra um atacante local não vale nada (ele
 * edita o código), mas é o hábito certo e custa três linhas — código de
 * exemplo é copiado.
 */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function entrar(usuario: string, senha: string): Promise<boolean> {
  // Usuário sem diferenciar caixa: ninguém perde a demo por causa de Caps Lock.
  const hash = await digest(`${usuario.trim().toUpperCase()}:${senha}`)
  if (!iguais(hash, HASH_ESPERADO)) return false
  autenticado = true
  try {
    sessionStorage.setItem(CHAVE, '1')
  } catch {
    /* sem persistência: a sessão vale enquanto a página não recarregar */
  }
  emitir()
  return true
}

export function sair() {
  autenticado = false
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    /* nada a limpar */
  }
  emitir()
}

export function useSessao(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => autenticado,
    () => false,
  )
}
