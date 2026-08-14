/**
 * TELA DE ENTRADA — a primeira coisa que o cliente vê, então ela carrega a
 * marca e a tese antes de qualquer dado.
 *
 * Composição: a logo branca da M. Dias Branco sobre o navy (regra de marca do
 * CLAUDE.md — colorida só em fundo claro), o nome do produto, o formulário e a
 * assinatura da parceria. Nada de ilustração: o produto é sóbrio, e a porta
 * dele também.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Eye, EyeOff, LoaderCircle, LogIn } from 'lucide-react'
import { entrar } from './sessao'

export function LoginScreen() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const campoUsuario = useRef<HTMLInputElement>(null)

  useEffect(() => {
    campoUsuario.current?.focus()
  }, [])

  async function submeter(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    setErro('')
    setEnviando(true)
    const ok = await entrar(usuario, senha)
    if (!ok) {
      /* Mensagem genérica de propósito: dizer "usuário não existe" entregaria
         quais logins são válidos. Aqui vale pouco (não há cadastro), mas é o
         hábito certo — e o texto que a versão com backend vai manter. */
      setErro('Usuário ou senha inválidos.')
      setSenha('')
      setEnviando(false)
    }
    // No sucesso não desligamos `enviando`: a árvore inteira é substituída
    // pelo painel, e mexer no estado de um componente que sai causaria warning.
  }

  const campo =
    'w-full rounded-card border border-edge bg-surface-1 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle transition-colors focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30'

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-10">
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full max-w-[420px]"
      >
        {/* O painel em `bg-card` dá aos campos (`surface-1`) o contraste que
            eles não teriam direto sobre a base — a mesma escada de superfícies
            do resto do produto. */}
        <div className="rounded-card-lg border border-edge bg-card p-7 shadow-card sm:p-8">
          {/* Cliente e consultoria lado a lado, separados por um fio: quem é
              dono do negócio à esquerda, quem constrói à direita.

              AS ALTURAS NÃO SÃO IGUAIS DE PROPÓSITO. Igualar a caixa dos dois
              arquivos deixa o par torto, porque a proporção interna deles é
              muito diferente: na M. Dias Branco o wordmark ocupa 25,4% da
              altura (o resto é a espiga, de traço fino), enquanto na Monoda o
              "MONODA" ocupa 33,8% em caixa alta cheia. Na mesma altura de
              caixa, a Monoda sai 1,3× maior e bem mais pesada — na tela do
              próprio cliente.

              48px e 36px igualam o que o olho compara: 12,2px de wordmark nos
              dois, e larguras de 125px e 120px. Mexer numa altura sem refazer
              a conta desfaz o par. */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <img
              src="/brand/mdias-logo-branco.png"
              alt="M. Dias Branco"
              className="h-11 w-auto shrink-0 sm:h-12"
              width={296}
              height={114}
            />
            {/* Some abaixo de 360px: numa quebra de linha o fio ficaria órfão
                ao lado de uma marca só, sugerindo uma separação que não há. */}
            <span className="h-8 w-px shrink-0 bg-edge-strong max-[359px]:hidden" aria-hidden="true" />
            <img
              src="/brand/monoda-logo-branco.png"
              alt="Monoda Consulting Group"
              className="h-8 w-auto shrink-0 sm:h-9"
              width={494}
              height={148}
            />
          </div>

          <h1 className="mt-7 font-display text-28 font-semibold leading-tight text-ink">
            Wheat &amp; Flour Value Tower
          </h1>
          <p className="mt-1.5 text-13 leading-relaxed text-ink-muted">
            Torre de Controle de Trigo, Farinha e Margem — do grão à margem, na mesma verdade.
          </p>

          <form onSubmit={submeter} className="mt-7 space-y-3.5" noValidate>
          <label className="block">
            <span className="eyebrow">Usuário</span>
            <input
              ref={campoUsuario}
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Seu identificador de acesso"
              aria-invalid={erro !== ''}
              className={`mt-1.5 ${campo}`}
            />
          </label>

          <label className="block">
            <span className="eyebrow">Senha</span>
            <span className="relative mt-1.5 block">
              <input
                type={verSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••••"
                aria-invalid={erro !== ''}
                aria-describedby={erro ? 'erro-login' : undefined}
                className={`${campo} pr-11`}
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={verSenha}
                className="absolute right-1 top-1/2 flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded-card text-ink-subtle transition-colors hover:text-ink"
              >
                {verSenha ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </span>
          </label>

          {/* aria-live: quem usa leitor de tela ouve o erro sem precisar
              voltar o cursor ao campo. */}
          <p
            id="erro-login"
            role="alert"
            aria-live="assertive"
            className={`flex items-center gap-1.5 text-12 text-danger transition-opacity ${
              erro ? 'opacity-100' : 'h-0 overflow-hidden opacity-0'
            }`}
          >
            {erro && (
              <>
                <AlertCircle size={13} aria-hidden="true" /> {erro}
              </>
            )}
          </p>

          <button
            type="submit"
            disabled={enviando || usuario === '' || senha === ''}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <LogIn size={16} aria-hidden="true" />
            )}
            {enviando ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
        </div>

        {/* Assinatura fora do painel: contexto do protótipo, não do formulário. */}
        <div className="mt-5 px-1">
          <p className="text-11 font-semibold text-ink-muted">Monoda × Google Cloud</p>
          <p className="mt-1 text-11 leading-relaxed text-ink-subtle">
            Protótipo navegável para avaliação — dados de demonstração, sem integração com sistemas
            produtivos. Confidencial: uso interno.
          </p>
        </div>
      </motion.main>
    </div>
  )
}
