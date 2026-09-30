#!/usr/bin/env node
/**
 * One command that boots the whole HireHub stack and tells you where it is.
 *
 *   node scripts/dev.mjs            boot API + web, wait, then open the browser
 *   node scripts/dev.mjs --no-open  same, but leave the browser alone
 *   node scripts/dev.mjs --check    just report the URLs/ports, boot nothing
 *
 * The whole point is that the ports are printed, pinned and re-printed on
 * every change, so nobody has to ask where the site is. Both services are
 * health-checked before the banner is shown, which means the URL in the banner
 * is a URL that actually answers.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'
import process from 'node:process'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BACKEND = resolve(ROOT, 'backend')
const FRONTEND = resolve(ROOT, 'frontend')

const FRONTEND_PORT = Number(process.env.FRONTEND_PORT ?? 5173)
const BACKEND_PORT = Number(process.env.BACKEND_PORT ?? 8000)

const WEB_URL = `http://127.0.0.1:${FRONTEND_PORT}`
const API_URL = `http://127.0.0.1:${BACKEND_PORT}`
const HEALTH_URL = `${API_URL}/api/v1/health`

const argv = new Set(process.argv.slice(2))
const CHECK_ONLY = argv.has('--check')
const NO_OPEN = argv.has('--no-open')

// Vite is invoked through its own entry point rather than `npm run dev`.
// `npm.cmd` is a batch file, and spawning a .cmd without a shell throws EINVAL
// on Windows, which would take the whole stack down. Running the JS entry
// directly with the current Node binary needs no shell, skips a process layer,
// and makes sure the Vite that starts is the one installed in frontend/.
const VITE_BIN = resolve(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js')

// --- terminal output -------------------------------------------------------

const BOLD = '\u001b[1m'
const DIM = '\u001b[2m'
const CYAN = '\u001b[36m'
const GREEN = '\u001b[32m'
const YELLOW = '\u001b[33m'
const RED = '\u001b[31m'
const RESET = '\u001b[0m'

const say = (msg = '') => process.stdout.write(`${msg}\n`)

// Padding must be measured against the *visible* text, so strip SGR sequences
// before counting. Without this, every coloured cell is padded short and the
// right-hand border wanders.
const visibleLength = (text) => text.replace(/\u001b\[[0-9;]*m/g, '').length

function banner(title, lines) {
  const width = Math.max(visibleLength(title), ...lines.map(visibleLength)) + 4
  const top = `\u250c${'\u2500'.repeat(width)}\u2510`
  const bottom = `\u2514${'\u2500'.repeat(width)}\u2518`
  const mid = (text) => `\u2502  ${text}${' '.repeat(width - 4 - visibleLength(text))}  \u2502`
  say()
  say(`${CYAN}${top}${RESET}`)
  say(mid(`${BOLD}${title}${RESET}`))
  say(`${CYAN}\u251c${'\u2500'.repeat(width)}\u2524${RESET}`)
  lines.forEach((line) => say(mid(line)))
  say(`${CYAN}${bottom}${RESET}`)
}

// --- helpers ---------------------------------------------------------------

function portInUse(port) {
  return new Promise((done) => {
    const probe = net.connect({ port, host: '127.0.0.1' })
    probe.once('connect', () => {
      probe.destroy()
      done(true)
    })
    probe.once('error', () => done(false))
    probe.setTimeout(700, () => {
      probe.destroy()
      done(false)
    })
  })
}

async function waitForPort(port, { timeoutMs = 45000, label = `port ${port}` } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await portInUse(port)) return true
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`${label} did not start listening within ${timeoutMs / 1000}s`)
}

async function waitForHttp(url, { timeoutMs = 45000 } = {}) {
  const deadline = Date.now() + timeoutMs
  let lastError = 'no response'
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
      if (res.ok || res.status === 401 || res.status === 403 || res.status === 429) return res.status
      lastError = `HTTP ${res.status}`
    } catch (err) {
      lastError = err.message
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`${url} never became reachable (${lastError})`)
}

function openBrowser(url) {
  const table = { win32: ['cmd', ['/c', 'start', '', url]], darwin: ['open', [url]], linux: ['xdg-open', [url]] }
  const [cmd, args] = table[process.platform] ?? table.linux
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true }).unref()
  } catch {
    say(`${YELLOW}Could not open a browser automatically. Use the URL above.${RESET}`)
  }
}

function startService(name, colour, command, args, cwd) {
  const child = spawn(command, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
  const write = (stream) => (chunk) => {
    const text = chunk.toString()
    text
      .split(/\r?\n/)
      .filter((line) => line.trim().length)
      .forEach((line) => stream.write(`${colour}[${name}]${RESET} ${line}\n`))
  }
  child.stdout.on('data', write(process.stdout))
  child.stderr.on('data', write(process.stderr))
  child.on('error', (err) => process.stderr.write(`${RED}[${name}] failed to start: ${err.message}${RESET}\n`))
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`${RED}[${name}] exited with code ${code}${RESET}\n`)
    }
  })
  return child
}

// --- preflight -------------------------------------------------------------

async function preflight() {
  const problems = []

  if (!existsSync(resolve(BACKEND, 'vendor', 'autoload.php'))) {
    problems.push('backend dependencies are missing — run `composer install` in backend/')
  }
  if (!existsSync(resolve(BACKEND, '.env'))) {
    problems.push('backend/.env is missing — copy .env.example to .env and run `php artisan key:generate`')
  }
  if (!existsSync(VITE_BIN)) {
    problems.push('frontend dependencies are missing or incomplete — run `npm install` in frontend/')
  }

  // A silent port shift is the exact problem this script exists to remove, so
  // refuse to start rather than start somewhere unexpected.
  for (const [port, name] of [
    [BACKEND_PORT, 'API'],
    [FRONTEND_PORT, 'web'],
  ]) {
    if (await portInUse(port)) {
      problems.push(
        `port ${port} (${name}) is already in use — close whatever is using it, ` +
          `or set ${name === 'API' ? 'BACKEND_PORT' : 'FRONTEND_PORT'} to a free port`,
      )
    }
  }

  return problems
}

function printPortsOnly() {
  banner('HireHub — ports', [
    `${BOLD}Website${RESET}   ${WEB_URL}`,
    `${BOLD}API${RESET}      ${API_URL}`,
    `${BOLD}Health${RESET}   ${HEALTH_URL}`,
    '',
    `${DIM}frontend port : ${FRONTEND_PORT} (pinned in frontend/vite.config.js)${RESET}`,
    `${DIM}backend port  : ${BACKEND_PORT}${RESET}`,
  ])
}

// --- main ------------------------------------------------------------------

async function main() {
  if (CHECK_ONLY) {
    printPortsOnly()
    return
  }

  say(`${DIM}Starting HireHub…${RESET}`)

  const problems = await preflight()
  if (problems.length) {
    banner('HireHub — cannot start', problems.map((p) => `${RED}!${RESET} ${p}`))
    process.exitCode = 1
    return
  }

  const children = []
  const shutdown = () => {
    children.forEach((child) => {
      if (!child.killed) child.kill()
    })
  }
  process.on('SIGINT', () => {
    say(`\n${DIM}Shutting down…${RESET}`)
    shutdown()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    shutdown()
    process.exit(0)
  })

  children.push(
    startService('api', YELLOW, 'php', ['artisan', 'serve', `--port=${BACKEND_PORT}`, '--host=127.0.0.1'], BACKEND),
  )
  children.push(startService('web', CYAN, process.execPath, [VITE_BIN], FRONTEND))

  let apiStatus = 'unknown'
  try {
    await waitForPort(BACKEND_PORT, { label: `API on port ${BACKEND_PORT}` })
    apiStatus = String(await waitForHttp(HEALTH_URL))
  } catch (err) {
    apiStatus = `unreachable (${err.message})`
  }

  let webStatus = 'unknown'
  try {
    await waitForPort(FRONTEND_PORT, { label: `web on port ${FRONTEND_PORT}` })
    webStatus = String(await waitForHttp(WEB_URL))
  } catch (err) {
    webStatus = `unreachable (${err.message})`
  }

  const healthy = apiStatus !== 'unknown' && !apiStatus.startsWith('unreachable')

  banner('HireHub is running', [
    `${BOLD}Website${RESET}       ${WEB_URL}`,
    `${BOLD}API${RESET}          ${API_URL}`,
    `${BOLD}API health${RESET}   ${HEALTH_URL} ${healthy ? `${GREEN}(${apiStatus})${RESET}` : `${RED}(${apiStatus})${RESET}`}`,
    `${BOLD}Web health${RESET}   ${webStatus}`,
    '',
    `${DIM}Frontend port ${FRONTEND_PORT}  ·  Backend port ${BACKEND_PORT}  ·  pinned, so the`,
    `${DIM}URL above never changes between restarts.${RESET}`,
  ])

  say()
  say(`  ${BOLD}Copy this next time instead of asking:${RESET} ${WEB_URL}`)
  say(`  ${DIM}Ctrl+C stops both services.${RESET}`)
  say()

  if (healthy && !NO_OPEN) openBrowser(WEB_URL)
}

main().catch((err) => {
  process.stderr.write(`\n${RED}dev.mjs failed:${RESET} ${err.stack ?? err.message}\n`)
  process.exit(1)
})
