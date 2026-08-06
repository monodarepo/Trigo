/**
 * Gera `src/data/mapaBrasil.ts` a partir do pacote @svg-maps/brazil (CC BY 4.0),
 * cujas geometrias derivam da malha oficial do IBGE.
 *
 * Por que um script e não um fetch em runtime: o modo Cenário do produto não
 * consulta rede — um mapa que falha ao carregar quebraria a demo no pior
 * momento. A geometria entra no bundle já projetada e otimizada.
 *
 * Otimização: os paths originais são relativos (`m` + linetos implícitos) com
 * até 6 casas decimais. Arredondar os DELTAS acumularia erro ao longo de
 * centenas de pontos, então convertemos para ABSOLUTO primeiro, arredondamos a
 * 1 casa (0,05 de erro máximo num viewBox de 613×639) e removemos pontos que
 * viraram duplicados.
 *
 * Uso: node scripts/gerar-mapa-brasil.mjs
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Regiões do IBGE — a divisão oficial. */
const REGIOES = {
  norte: { rotulo: 'Norte', ufs: ['ac', 'ap', 'am', 'pa', 'ro', 'rr', 'to'] },
  nordeste: { rotulo: 'Nordeste', ufs: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'] },
  'centro-oeste': { rotulo: 'Centro-Oeste', ufs: ['df', 'go', 'mt', 'ms'] },
  sudeste: { rotulo: 'Sudeste', ufs: ['es', 'mg', 'rj', 'sp'] },
  sul: { rotulo: 'Sul', ufs: ['pr', 'rs', 'sc'] },
}

const CASAS = 1
const fator = 10 ** CASAS
const arred = (v) => Math.round(v * fator) / fator

/**
 * Tolerância do Douglas-Peucker, em unidades do viewBox. O mapa é renderizado
 * com ~400px de largura sobre um viewBox de 613 — cada unidade vale ~0,65px, e
 * 0,45 unidade fica abaixo de meio pixel. Reduz o arquivo à metade sem que a
 * silhueta mude a olho nu.
 */
const TOLERANCIA = 0.45

/** Distância perpendicular do ponto p ao segmento a–b. */
function distanciaAoSegmento(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Douglas-Peucker iterativo — recursão estoura a pilha em polígonos longos. */
function simplificar(pontos, tol) {
  if (pontos.length < 3) return pontos
  const manter = new Uint8Array(pontos.length)
  manter[0] = 1
  manter[pontos.length - 1] = 1
  const pilha = [[0, pontos.length - 1]]

  while (pilha.length) {
    const [ini, fim] = pilha.pop()
    let maior = 0
    let idx = -1
    for (let i = ini + 1; i < fim; i++) {
      const d = distanciaAoSegmento(pontos[i], pontos[ini], pontos[fim])
      if (d > maior) {
        maior = d
        idx = i
      }
    }
    if (idx !== -1 && maior > tol) {
      manter[idx] = 1
      pilha.push([ini, idx], [idx, fim])
    }
  }
  return pontos.filter((_, i) => manter[i])
}

/** Baixa o pacote num diretório temporário e devolve o módulo já parseado. */
function carregarPacote() {
  const dir = mkdtempSync(join(tmpdir(), 'svgmap-'))
  execSync('npm pack @svg-maps/brazil --silent', { cwd: dir, stdio: 'pipe' })
  execSync('tar xzf *.tgz', { cwd: dir, stdio: 'pipe', shell: '/bin/bash' })
  const bruto = readFileSync(join(dir, 'package/index.js'), 'utf8')
  return JSON.parse(bruto.replace(/^export default /, '').replace(/;\s*$/, ''))
}

/**
 * Percorre um path de comandos `m`/`z` e devolve os sub-polígonos em
 * coordenadas ABSOLUTAS. No SVG, o primeiro par depois de `m` é um moveto
 * relativo e os seguintes são linetos relativos — é isso que a conversão faz.
 */
function paraPoligonos(d) {
  const tokens = d.match(/[mzMZ]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  const poligonos = []
  let atual = null
  let x = 0
  let y = 0
  let i = 0

  while (i < tokens.length) {
    const t = tokens[i]
    if (t === 'm' || t === 'M') {
      const absoluto = t === 'M'
      i++
      const dx = Number(tokens[i++])
      const dy = Number(tokens[i++])
      x = absoluto ? dx : x + dx
      y = absoluto ? dy : y + dy
      atual = [[x, y]]
      poligonos.push(atual)
      // Pares subsequentes = linetos (relativos no caso do 'm' minúsculo).
      while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
        const ex = Number(tokens[i++])
        const ey = Number(tokens[i++])
        x = absoluto ? ex : x + ex
        y = absoluto ? ey : y + ey
        atual.push([x, y])
      }
    } else if (t === 'z' || t === 'Z') {
      i++
    } else {
      i++ // token solto: ignora
    }
  }
  return poligonos
}

/** Reescreve os polígonos como path absoluto arredondado, sem pontos repetidos. */
function paraPathAbsoluto(poligonos) {
  const partes = []
  for (const bruto of poligonos) {
    // Simplifica ANTES de arredondar: sobre as coordenadas cheias, o
    // Douglas-Peucker mede a distância real ao segmento em vez de medir o
    // ruído que o próprio arredondamento introduziu.
    const pts = simplificar(bruto, TOLERANCIA)
    const limpos = []
    for (const [px, py] of pts) {
      const rx = arred(px)
      const ry = arred(py)
      const ultimo = limpos[limpos.length - 1]
      if (!ultimo || ultimo[0] !== rx || ultimo[1] !== ry) limpos.push([rx, ry])
    }
    // Um polígono com menos de 3 pontos não tem área — some no arredondamento.
    if (limpos.length < 3) continue
    partes.push(
      `M${limpos[0][0]} ${limpos[0][1]}` +
        limpos
          .slice(1)
          .map(([px, py]) => `L${px} ${py}`)
          .join('') +
        'Z',
    )
  }
  return partes.join('')
}

function bbox(poligonos) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const pts of poligonos)
    for (const [px, py] of pts) {
      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
    }
  return { minX, minY, maxX, maxY }
}

/**
 * Centro visual da região: média dos centroides dos estados PONDERADA pela área
 * aproximada de cada um. A média simples puxaria o rótulo para os estados
 * pequenos (a Paraíba pesaria como o Pará) e o Nordeste ficaria com o rótulo
 * espremido no litoral.
 */
function centroPonderado(estados) {
  let somaPeso = 0
  let sx = 0
  let sy = 0
  for (const e of estados) {
    const b = bbox(e.poligonos)
    const peso = Math.max(1, (b.maxX - b.minX) * (b.maxY - b.minY))
    sx += ((b.minX + b.maxX) / 2) * peso
    sy += ((b.minY + b.maxY) / 2) * peso
    somaPeso += peso
  }
  return { x: arred(sx / somaPeso), y: arred(sy / somaPeso) }
}

const mapa = carregarPacote()
const porUf = new Map()
for (const loc of mapa.locations) {
  porUf.set(loc.id, { id: loc.id, nome: loc.name, poligonos: paraPoligonos(loc.path) })
}

const faltando = Object.values(REGIOES).flatMap((r) => r.ufs).filter((uf) => !porUf.has(uf))
if (faltando.length) throw new Error(`UFs ausentes no pacote: ${faltando.join(', ')}`)

const regioes = Object.entries(REGIOES).map(([id, cfg]) => {
  const estados = cfg.ufs.map((uf) => porUf.get(uf))
  return {
    id,
    rotulo: cfg.rotulo,
    centro: centroPonderado(estados),
    estados: estados.map((e) => ({ uf: e.id.toUpperCase(), nome: e.nome, d: paraPathAbsoluto(e.poligonos) })),
  }
})

const cabecalho = `/**
 * Contorno oficial do Brasil por região e estado — GERADO, não editar à mão.
 * Rode \`node scripts/gerar-mapa-brasil.mjs\` para regenerar.
 *
 * Fonte: pacote @svg-maps/brazil (CC BY 4.0, Victor Cazanave), cuja geometria
 * deriva da malha territorial oficial do IBGE. A atribuição CC BY vive no
 * rodapé do app e no README, junto com as demais fontes.
 *
 * A geometria é VERSIONADA em vez de buscada em runtime: o modo Cenário do
 * produto não depende de rede, e um mapa que falha ao carregar quebraria a
 * demo no pior momento possível.
 *
 * Coordenadas já projetadas no viewBox ${mapa.viewBox}, absolutas e
 * arredondadas a ${CASAS} casa decimal.
 */

export interface EstadoMapa {
  uf: string
  nome: string
  /** Path SVG absoluto no viewBox do mapa. */
  d: string
}

export interface RegiaoMapa {
  id: string
  rotulo: string
  /** Centro visual para posicionar o rótulo (ponderado pela área dos estados). */
  centro: { x: number; y: number }
  estados: EstadoMapa[]
}

/** viewBox do SVG — todas as coordenadas vivem neste sistema. */
export const VIEWBOX_BRASIL = '${mapa.viewBox}'

export const REGIOES_MAPA: RegiaoMapa[] = `

const corpo = JSON.stringify(regioes, null, 2)
writeFileSync('src/data/mapaBrasil.ts', `${cabecalho}${corpo}\n`, 'utf8')

const bytes = corpo.length
console.log(
  `✓ src/data/mapaBrasil.ts — ${regioes.length} regiões, ` +
    `${regioes.reduce((s, r) => s + r.estados.length, 0)} estados, ${(bytes / 1024).toFixed(0)} kB`,
)
for (const r of regioes) console.log(`  ${r.rotulo.padEnd(13)} centro (${r.centro.x}, ${r.centro.y})`)
