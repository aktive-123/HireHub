#!/usr/bin/env node
/**
 * Typography audit.
 *
 * Enforces the type scale across the whole frontend: one font family, and a
 * font size drawn only from the ramp declared in src/styles/tokens.css.
 *
 * The scale is a design decision, so it is checked mechanically rather than
 * left to review. A new `font-size: 0.9rem` in a component is invisible in a
 * diff and impossible to catch by eye across 9 stylesheets; this script makes
 * it a build failure instead.
 *
 *   node scripts/audit-typography.mjs          report and exit non-zero on failure
 *   node scripts/audit-typography.mjs --quiet  only print the summary
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const SRC = join(ROOT, 'src')
const TOKENS = join(SRC, 'styles', 'tokens.css')

const QUIET = process.argv.includes('--quiet')

/* ------------------------------------------------------------------ *
 * The ramp. Mirrors --hh-fs-* in tokens.css; the scale is deliberately
 * duplicated here as data so the audit has an independent statement of the
 * rule. If tokens.css grows a step, this list must grow with it — the
 * mismatch is reported by the "ramp drift" check below.
 * ------------------------------------------------------------------ */
const RAMP_REM = {
  '--hh-fs-12': 0.75,
  '--hh-fs-13': 0.8125,
  '--hh-fs-14': 0.875,
  '--hh-fs-15': 0.9375,
  '--hh-fs-16': 1,
  '--hh-fs-17': 1.0625,
  '--hh-fs-18': 1.125,
  '--hh-fs-20': 1.25,
  '--hh-fs-22': 1.375,
  '--hh-fs-24': 1.5,
  '--hh-fs-28': 1.75,
  '--hh-fs-32': 2,
  '--hh-fs-36': 2.25,
  '--hh-fs-40': 2.5,
  '--hh-fs-44': 2.75,
  '--hh-fs-48': 3,
  '--hh-fs-56': 3.5,
}

const FLOOR_REM = RAMP_REM['--hh-fs-12'] // nothing renders smaller than 12px
const FLOOR_PX = 12

/* The page/section title is the ceiling for ordinary headings; only a hero
   title may exceed it. Both h1 and h2 sit on --hh-fs-36 at wide widths, so
   that is the step a non-hero heading is allowed to reach and no further. */
const H1_REM = RAMP_REM['--hh-fs-36']
const DISPLAY_VALUES = [
  RAMP_REM['--hh-fs-40'],
  RAMP_REM['--hh-fs-44'],
  RAMP_REM['--hh-fs-48'],
  RAMP_REM['--hh-fs-56'],
]

/* Icons are sized with font-size because icon fonts size by glyph, so
   font-size is the right property — but an icon is not type, and it is held
   to its own scale so the type scale stays meaningful. */
const ICON_SCALE = {
  '--hh-icon-xs': 0.75,
  '--hh-icon-sm': 0.875,
  '--hh-icon-md': 1.125,
  '--hh-icon-lg': 1.25,
  '--hh-icon-xl': 1.5,
  '--hh-icon-2xl': 2,
}
const ICON_VALUES = Object.values(ICON_SCALE)

const violations = []

function fail(file, line, rule, message) {
  violations.push({ file, line, rule, message })
}

/* ------------------------------------------------------------------ *
 * Resolve the token graph in tokens.css so `var(--hh-fs-sm)` can be
 * followed to a literal.
 * ------------------------------------------------------------------ */
function parseTokens() {
  const css = readFileSync(TOKENS, 'utf8')
  const defs = new Map()

  for (const m of css.matchAll(/(--hh-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    defs.set(m[1], m[2].trim())
  }

  return defs
}

const tokens = parseTokens()

/** Follow an alias chain to a literal value, or null if it cannot be resolved. */
function resolveToken(name, depth = 0) {
  if (depth > 8) return null
  const raw = tokens.get(name)
  if (raw === undefined) return null

  const inner = raw.match(/^var\((--hh-[a-z0-9-]+)\)$/)
  if (inner) return resolveToken(inner[1], depth + 1)

  return raw
}

/** Convert a CSS length to rem, or return null if it is not a fixed length. */
function toRem(value) {
  const v = value.trim()

  if (/^var\(/.test(v)) {
    const name = v.match(/^var\((--hh-[a-z0-9-]+)\)$/)?.[1]
    if (!name) return null
    const resolved = resolveToken(name)
    return resolved === null ? null : toRem(resolved)
  }

  const rem = v.match(/^(-?[\d.]+)rem$/)
  if (rem) return Number.parseFloat(rem[1])

  const px = v.match(/^(-?[\d.]+)px$/)
  if (px) return Number.parseFloat(px[1]) / 16

  return null
}

/* ------------------------------------------------------------------ *
 * Drift check: the ramp in this file must match the ramp in tokens.css.
 * ------------------------------------------------------------------ */
for (const [name, expected] of Object.entries(RAMP_REM)) {
  const resolved = toRem(`var(${name})`)

  if (resolved === null) {
    fail('scripts/audit-typography.mjs', 0, 'ramp-drift', `${name} is not defined in tokens.css`)
  } else if (Math.abs(resolved - expected) > 1e-9) {
    fail('scripts/audit-typography.mjs', 0, 'ramp-drift', `${name} is ${resolved}rem here but ${expected}rem in tokens.css`)
  }
}

/** Every role token must also land on the ramp. */
for (const name of tokens.keys()) {
  if (!name.startsWith('--hh-type-') || !name.endsWith('-size')) continue

  const rem = toRem(`var(${name})`)
  if (rem === null) {
    fail('styles/tokens.css', 0, 'role-token', `${name} does not resolve to a fixed length`)
    continue
  }

  if (!Object.values(RAMP_REM).some((r) => Math.abs(r - rem) < 1e-9)) {
    fail('styles/tokens.css', 0, 'role-token', `${name} is ${rem}rem, which is not a step on the ramp`)
  }
}

/* ------------------------------------------------------------------ *
 * Walk the source tree.
 * ------------------------------------------------------------------ */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const files = walk(SRC)
const cssFiles = files.filter((f) => extname(f) === '.css')
const jsxFiles = files.filter((f) => ['.jsx', '.js'].includes(extname(f)))

const ALLOWED_FAMILIES = new Set(['var(--hh-font-sans)', 'inherit', 'var(--hh-font-mono)'])

/**
 * A custom property that is referenced but never declared still passes every
 * per-declaration check above: `font-family: var(--hh-font-sans)` is an allowed
 * value either way, so the whole site silently falls back to the UA default.
 * Collect every declared property across the stylesheets and fail on the
 * family tokens that are referenced but undefined.
 */
const declaredProps = new Set()
const usedProps = new Set()
const tokenValues = []
for (const file of cssFiles) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/(--hh-[a-z0-9-]+)\s*:/g)) declaredProps.add(m[1])
  for (const m of src.matchAll(/var\((--hh-font-[a-z0-9-]+)\)/g)) usedProps.add(m[1])
  for (const m of src.matchAll(/(--hh-[a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,8})\s*;/gi)) {
    tokenValues.push([m[1], m[2]])
  }
}
for (const prop of usedProps) {
  if (!declaredProps.has(prop)) {
    violations.push({
      rule: 'undefined-token',
      file: relative(ROOT, join(SRC, 'styles/tokens.css')).replace(/\\/g, '/'),
      line: 1,
      message: `${prop} is used as a font family but never declared — the browser would fall back to its default font`,
    })
  }
}

/** Selectors that are allowed to be bold, because they are headings or KPIs. */
const BOLD_ALLOWED = /(^|[\s,>+~(])(h[1-6]|strong|b|\.hh-type-h[1-4]|stat|badge|count|price|amount|total|score|rating|amount|\.hh-.*-(title|heading|headline|name|value|figure))([\s,:.>+~)[\]]|$)/i

/** Every family named by an @font-face, accumulated across all stylesheets. */
const declaredFaceFamilies = new Set()

for (const file of cssFiles) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const src = readFileSync(file, 'utf8')
  const lines = src.split('\n')

  // An @font-face block is the one legal place to name a family literally: the
  // browser cannot resolve "var()" there, so the descriptor must be a real
  // family name. Mark those lines so the one-family rule skips them — while
  // still checking everything else about the block (see below), so a webfont
  // cannot quietly become a second style system.
  const fontFaceLines = new Set()
  let inFontFace = false
  let depth = 0
  lines.forEach((lineText, i) => {
    if (/@font-face\b/.test(lineText)) {
      inFontFace = true
      depth = 0
    }
    if (inFontFace) {
      fontFaceLines.add(i)
      for (const ch of lineText) {
        if (ch === '{') depth++
        else if (ch === '}') depth--
      }
      if (depth <= 0 && /}/.test(lineText)) inFontFace = false
    }
  })

  // A webfont may only declare the site's single family. Anything else means a
  // second typeface has crept in, which is exactly what the one-family rule
  // exists to prevent.
  lines.forEach((lineText, i) => {
    if (!fontFaceLines.has(i)) return
    const m = lineText.match(/font-family\s*:\s*([^;}]+)/)
    if (m) declaredFaceFamilies.add(m[1].trim().replace(/^['"]|['"]$/g, ''))
  })

  lines.forEach((lineText, i) => {
    const line = i + 1
    const code = lineText.replace(/\/\*.*?\*\//g, '')

    /* --- font-size ------------------------------------------------- */
    const fs = code.match(/(^|[;{\s])font-size\s*:\s*([^;}]+)/)
    if (fs) {
      const value = fs[2].trim()

      if (/clamp\(|vw|vh|calc\(/.test(value)) {
        fail(rel, line, 'fluid-size', `font-size: ${value} — sizes must come from the ramp, not a fluid clamp`)
      } else if (/\b(0?\.\d+|\d+)em\b/.test(value)) {
        fail(rel, line, 'em-size', `font-size: ${value} — use rem or a ramp token, not em`)
        } else {
          const rem = toRem(value)
          const token = value.match(/^var\((--hh-[a-z0-9-]+)\)$/)?.[1]
          const isIcon = token !== undefined && token.startsWith('--hh-icon-')

          if (rem === null) {
            fail(rel, line, 'unresolvable', `font-size: ${value} — could not be resolved to a length`)
          } else if (isIcon) {
            if (!ICON_VALUES.some((v) => Math.abs(v - rem) < 1e-9)) {
              fail(rel, line, 'off-icon-scale', `font-size: ${value} (${rem}rem) is not a step on the icon scale`)
            }
          } else if (rem < FLOOR_REM - 1e-9) {
            fail(rel, line, 'below-floor', `font-size: ${value} is below the ${FLOOR_PX}px floor`)
          } else if (!Object.values(RAMP_REM).some((r) => Math.abs(r - rem) < 1e-9)) {
            fail(rel, line, 'off-ramp', `font-size: ${value} (${rem}rem) is not a step on the ramp`)
          } else if (rem > H1_REM + 1e-9 && !DISPLAY_VALUES.some((v) => Math.abs(v - rem) < 1e-9)) {
            // The hero is meant to be the single dominant block of type. A size
            // above h1 that is not a display step is a one-off heading that
            // has quietly become the biggest text on the site.
            fail(rel, line, 'above-display', `font-size: ${value} (${rem}rem) is above h1 but not a display step — only a hero title may exceed h1`)
          }
        }

    }

    /* --- font-family ----------------------------------------------- */
    const ff = code.match(/(^|[;{\s])font-family\s*:\s*([^;}]+)/)
    if (ff) {
      const value = ff[2].trim()
      // Inside @font-face the name is a descriptor, not a stack, so it is held
      // to the one-family rule separately (see declaredFaceFamilies).
      const isFaceDescriptor = fontFaceLines.has(i)
      if (!isFaceDescriptor && !ALLOWED_FAMILIES.has(value)) {
        fail(rel, line, 'font-mix', `font-family: ${value} — the site uses one family, var(--hh-font-sans)`)
      }
    }

    /* --- literal text colour that duplicates a token ---------------- */
    // Writing a hex that already exists as a token is how the palette drifts
    // into a second set of greys. Matching against the declared token values
    // keeps this exact: it never guesses at a colour, only flags a literal
    // that is already named in tokens.css.
    const col = code.match(/(^|[;{\s])color\s*:\s*(#[0-9a-f]{3,8})\s*;/i)
    if (col) {
      const hex = col[2].toLowerCase()
      const normalised = hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex
      for (const [prop, value] of tokenValues) {
        if (value.toLowerCase() === normalised) {
          fail(rel, line, 'literal-colour', `color: ${hex} duplicates ${prop} — use var(${prop}) so the palette stays in one place`)
          break
        }
      }
    }

    /* --- bold on prose --------------------------------------------- */
    const fw = code.match(/(^|[;{\s])font-weight\s*:\s*([^;}]+)/)
    if (fw) {
      const value = fw[2].trim()
      const numeric = Number.parseInt(value, 10)
      const isBold = !Number.isNaN(numeric) ? numeric >= 700 : value === 'bold'

      if (isBold) {
        // Find the selector this declaration belongs to, so a bold KPI is not
        // reported alongside a bold paragraph.
        let selector = ''
        for (let j = i; j >= 0; j--) {
          const candidate = lines[j].replace(/\/\*.*?\*\//g, '').trim()
          if (candidate.endsWith('{')) {
            selector = candidate.slice(0, -1).trim()
            break
          }
        }

        const isProse =
          /(^|[\s,>+~])(p|small|em|blockquote|dd|dt|\.hh-.*(sub|meta|caption|description|excerpt|bio|note|hint|helper|label|text|body|muted|lead|summary))([\s,:.>+~)[\]]|$)/i.test(selector)

        if (isProse && !BOLD_ALLOWED.test(selector)) {
          fail(rel, line, 'bold-prose', `font-weight: ${value} on "${selector}" — 700+ is reserved for headings and KPI numbers`)
        }
      }
    }
  })
}

/* --- inline styles in JSX ------------------------------------------- */
for (const file of jsxFiles) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const src = readFileSync(file, 'utf8')

  src.split('\n').forEach((lineText, i) => {
    if (!/fontSize|fontWeight|fontFamily|letterSpacing|lineHeight/.test(lineText)) return

    // No exemptions: type belongs in a role token. A component that needs a
    // variable box size passes a custom property (--hh-avatar-size) and lets
    // the stylesheet derive the type from it, so the scale floor still holds.
    if (/fontSize|fontWeight|fontFamily|letterSpacing|lineHeight/.test(lineText)) {
      fail(rel, i + 1, 'inline-type', 'inline type style — type belongs in a role token')
    }
  })
}

/* --- webfont must be reachable from the one stack ------------------- */
// A @font-face family that never appears in --hh-font-sans is dead weight at
// best, and at worst a second typeface waiting to be applied. This is the
// invariant that lets the one-family rule make room for @font-face at all.
{
  const tokensSrc = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')
  const stackMatch = tokensSrc.match(/--hh-font-sans\s*:\s*([^;]+);/)
  const stack = stackMatch ? stackMatch[1] : ''

  if (declaredFaceFamilies.size > 0) {
    if (!stackMatch) {
      fail('src/styles/tokens.css', 1, 'font-face-orphan', '--hh-font-sans is not declared but a @font-face exists')
    }
    for (const family of declaredFaceFamilies) {
      const named = stack.includes(`"${family}"`) || stack.includes(`'${family}'`) || stack.includes(`${family},`)
      if (!named) {
        fail(
          'src/styles/base.css',
          1,
          'font-face-orphan',
          `@font-face declares "${family}", which is not in the --hh-font-sans stack — the site would load a font it never uses`
        )
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
const byRule = new Map()
for (const v of violations) {
  if (!byRule.has(v.rule)) byRule.set(v.rule, [])
  byRule.get(v.rule).push(v)
}

if (!QUIET) {
  for (const [rule, items] of byRule) {
    console.log(`\n${rule}  (${items.length})`)
    for (const it of items) {
      console.log(`  ${it.file}:${it.line}  ${it.message}`)
    }
  }
}

const total = violations.length
console.log(`\ntypography: ${total} violation${total === 1 ? '' : 's'} across ${cssFiles.length} stylesheets`)
process.exit(total === 0 ? 0 : 1)
