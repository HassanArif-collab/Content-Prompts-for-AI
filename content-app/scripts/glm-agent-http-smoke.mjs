#!/usr/bin/env node

const DEFAULT_BASE_URL = 'http://localhost:3000'
const SANDBOX_TITLE_PREFIX = 'GLM HTTP Sandbox'
const SEED_PROJECT_TITLE = 'The Forgotten Cartographers'

const VISUAL_PROMPT = {
  folder: 'visual-v7-glm',
  path: ['v7', 'Visuals Generation Prompt v7.md'],
}

const SCRIPT_PROMPT = {
  folder: 'script-v5',
  path: ['Script Generation Prompt v5.md'],
}

const SAMPLE_SCRIPT_SECTION = {
  type: 'act',
  heading: 'SANDBOX GLM HTTP CHECK',
  content:
    'A local GLM-style agent connects to Documentary Studio, reads the script and visual prompt library, pushes a visual plan, and renders a harmless Remotion preview without spending browser credits.',
}

const SAMPLE_SHOTS = [
  {
    id: 'sandbox-shot-01',
    archetype: 'documentary-map',
    duration: 6,
    visual: 'A crisp timeline card showing the external agent handshake into Documentary Studio.',
    motion: 'Slow lateral drift with a pulsing connection line.',
    textOverlay: 'HTTP agent connected',
    narration: SAMPLE_SCRIPT_SECTION.content,
    asset: {
      capability: 'browser.source_capture',
      prompt: 'Observe-only source capture health check. No Dreamina or Flow generation.',
      status: 'pending',
    },
  },
]

const SAMPLE_REMOTION_CODE = String.raw`
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const UserComposition = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const sweep = interpolate(frame, [0, 90], [0, width], { extrapolateRight: 'clamp' });
  const pulse = interpolate(frame % 45, [0, 22, 44], [0.35, 1, 0.35]);

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #101820 0%, #1f2937 48%, #f2c14e 100%)',
      color: 'white',
      fontFamily: 'Inter, Arial, sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 72,
        border: '2px solid rgba(255,255,255,0.24)',
        borderRadius: 28,
        padding: 54,
      }}>
        <div style={{ fontSize: 34, letterSpacing: 0, opacity: 0.72 }}>Documentary Studio</div>
        <div style={{ marginTop: 28, fontSize: 82, fontWeight: 800, lineHeight: 1 }}>
          GLM Agent HTTP Smoke Test
        </div>
        <div style={{ marginTop: 30, maxWidth: 980, fontSize: 31, lineHeight: 1.34, opacity: 0.9 }}>
          Prompts fetched, script workflow reached, visual plan patched, and Remotion preview rendered locally.
        </div>
      </div>
      <div style={{
        position: 'absolute',
        left: 0,
        top: height - 150,
        width: sweep,
        height: 12,
        background: '#ffffff',
        boxShadow: '0 0 42px rgba(255,255,255,0.85)',
      }} />
      <div style={{
        position: 'absolute',
        right: 90,
        bottom: 72,
        width: 96,
        height: 96,
        borderRadius: 48,
        background: 'rgba(16,24,32,0.78)',
        border: '4px solid white',
        transform: 'scale(' + (0.85 + pulse * 0.12) + ')',
      }} />
    </AbsoluteFill>
  );
};
`.trim()

const state = {
  baseUrl: DEFAULT_BASE_URL,
  preferSeed: true,
  allowCreateProject: true,
  timeoutMs: 120_000,
}

const results = []

function parseArgs(argv) {
  state.baseUrl = process.env.DOC_STUDIO_URL || process.env.APP_URL || state.baseUrl

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    if (arg === '--base-url' || arg === '--url') {
      state.baseUrl = requireValue(argv, i, arg)
      i += 1
      continue
    }
    if (arg.startsWith('--base-url=')) {
      state.baseUrl = arg.slice('--base-url='.length)
      continue
    }
    if (arg === '--no-seed') {
      state.preferSeed = false
      continue
    }
    if (arg === '--no-create-project') {
      state.allowCreateProject = false
      continue
    }
    if (arg === '--timeout-ms') {
      state.timeoutMs = Number(requireValue(argv, i, arg))
      i += 1
      continue
    }
    if (arg.startsWith('--timeout-ms=')) {
      state.timeoutMs = Number(arg.slice('--timeout-ms='.length))
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  state.baseUrl = normalizeBaseUrl(state.baseUrl)
  if (!Number.isFinite(state.timeoutMs) || state.timeoutMs < 1000) {
    throw new Error('--timeout-ms must be a number >= 1000')
  }
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/, '')
}

function printHelp() {
  console.log(`GLM-style HTTP smoke test for Documentary Studio

Usage:
  node scripts/glm-agent-http-smoke.mjs [--base-url http://localhost:3000]

Environment:
  DOC_STUDIO_URL or APP_URL can provide the base URL.

Options:
  --base-url <url>       Next app or tunnel URL. Default: ${DEFAULT_BASE_URL}
  --no-seed             Do not prefer the "${SEED_PROJECT_TITLE}" project when present.
  --no-create-project   Fail instead of creating a sandbox project when no suitable project exists.
  --timeout-ms <ms>     Per-request timeout. Default: ${state.timeoutMs}

Safety:
  This script never POSTs to /api/ai/browse/run_task and never sets allow_credit_spend=true.
`)
}

function apiPath(...parts) {
  const encoded = parts
    .flat()
    .map((part) => encodeURIComponent(part))
    .join('/')
  return `${state.baseUrl}/${encoded}`
}

function apiUrl(path) {
  return `${state.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

async function requestJson(pathOrUrl, options = {}) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : apiUrl(pathOrUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? state.timeoutMs)
  const headers = {
    Accept: 'application/json',
    ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })

    const text = await response.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { raw: text }
      }
    }

    if (!response.ok) {
      const message = data?.error || data?.message || text || response.statusText
      throw new Error(`${response.status} ${response.statusText}: ${message}`)
    }

    return { response, data }
  } finally {
    clearTimeout(timer)
  }
}

async function step(name, run) {
  const started = Date.now()
  try {
    const detail = await run()
    results.push({
      name,
      ok: true,
      detail: detail || 'ok',
      ms: Date.now() - started,
    })
    return detail
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
      ms: Date.now() - started,
    })
    return undefined
  }
}

function requireStep(value, label) {
  if (value === undefined || value === null) {
    throw new Error(`Cannot continue because "${label}" failed`)
  }
  return value
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function summarizePrompt(data, expectedFolder, expectedSuffix) {
  assert(data && typeof data.content === 'string', 'prompt response did not include content')
  assert(data.folder === expectedFolder, `expected folder "${expectedFolder}", got "${data.folder}"`)
  assert(String(data.file || '').endsWith(expectedSuffix), `expected file ending "${expectedSuffix}", got "${data.file}"`)
  assert(data.content.length > 500, `prompt content is unexpectedly short (${data.content.length} chars)`)
  return `${data.file} (${data.content.length.toLocaleString()} chars)`
}

function chooseProject(projects) {
  if (state.preferSeed) {
    const seed = projects.find((project) => project.title === SEED_PROJECT_TITLE)
    if (seed) return { project: seed, source: 'existing seed project' }
  }

  const sandbox = projects.find((project) => String(project.title || '').startsWith(SANDBOX_TITLE_PREFIX))
  if (sandbox) return { project: sandbox, source: 'existing sandbox project' }

  return { project: null, source: 'not found' }
}

function formatScriptSnapshot(sections) {
  return sections
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((section) => `${section.heading || 'Untitled'}\n${section.content || ''}`.trim())
    .filter(Boolean)
    .join('\n\n')
}

async function main() {
  parseArgs(process.argv.slice(2))

  console.log(`\nGLM Agent HTTP Smoke Test`)
  console.log(`Base URL: ${state.baseUrl}`)
  console.log(`Credit safety: browse health GET only; no Dreamina/Flow generate calls.\n`)

  const root = await step('Connect to Documentary Studio API', async () => {
    const { data } = await requestJson('/api')
    assert(data?.message, 'API root did not return a JSON message')
    return data.message
  })
  requireStep(root, 'Connect to Documentary Studio API')

  const promptIndex = await step('GET /api/prompts', async () => {
    const { data } = await requestJson('/api/prompts')
    assert(data?.folders && typeof data.folders === 'object', 'prompt index did not include folders')
    assert(Array.isArray(data.folders[VISUAL_PROMPT.folder]), `missing ${VISUAL_PROMPT.folder}`)
    assert(Array.isArray(data.folders[SCRIPT_PROMPT.folder]), `missing ${SCRIPT_PROMPT.folder}`)
    assert(
      data.folders[VISUAL_PROMPT.folder].includes(VISUAL_PROMPT.path.join('/')),
      `missing ${VISUAL_PROMPT.path.join('/')}`,
    )
    assert(
      data.folders[SCRIPT_PROMPT.folder].includes(SCRIPT_PROMPT.path.join('/')),
      `missing ${SCRIPT_PROMPT.path.join('/')}`,
    )
    return `${Object.keys(data.folders).length} prompt folders`
  })
  requireStep(promptIndex, 'GET /api/prompts')

  const visualPrompt = await step('Fetch visual-v7-glm/v7/Visuals Generation Prompt v7.md', async () => {
    const { data } = await requestJson(apiPath('api', 'prompts', VISUAL_PROMPT.folder, VISUAL_PROMPT.path))
    return summarizePrompt(data, VISUAL_PROMPT.folder, VISUAL_PROMPT.path.join('/'))
  })
  requireStep(visualPrompt, 'Fetch visual prompt')

  const scriptPrompt = await step('Fetch script-v5/Script Generation Prompt v5.md', async () => {
    const { data } = await requestJson(apiPath('api', 'prompts', SCRIPT_PROMPT.folder, SCRIPT_PROMPT.path))
    return summarizePrompt(data, SCRIPT_PROMPT.folder, SCRIPT_PROMPT.path.join('/'))
  })
  requireStep(scriptPrompt, 'Fetch script prompt')

  let projectRecord = await step('List or create project over HTTP', async () => {
    const { data: projects } = await requestJson('/api/projects')
    assert(Array.isArray(projects), 'projects response was not an array')

    const chosen = chooseProject(projects)
    if (chosen.project) {
      return {
        id: chosen.project.id,
        title: chosen.project.title,
        detail: `${chosen.source}: ${chosen.project.title} (${chosen.project.id})`,
      }
    }

    if (!state.allowCreateProject) {
      throw new Error('no seed or sandbox project found, and --no-create-project was set')
    }

    const title = `${SANDBOX_TITLE_PREFIX} ${new Date().toISOString()}`
    const { data: created } = await requestJson('/api/projects', {
      method: 'POST',
      body: {
        title,
        logline: 'Local HTTP test project for external GLM-style agents.',
        description:
          'Created by scripts/glm-agent-http-smoke.mjs to verify app API connectivity without browser credit spend.',
        status: 'scripting',
        targetRuntime: 1,
        narrationWpm: 150,
        coverColor: 'sky',
      },
    })
    assert(created?.id, 'project create response did not include id')
    return {
      id: created.id,
      title: created.title,
      detail: `created sandbox project: ${created.title} (${created.id})`,
    }
  })
  projectRecord = requireStep(projectRecord, 'List or create project over HTTP')
  results[results.length - 1].detail = projectRecord.detail

  let scriptSections = await step('Fetch project script sections', async () => {
    const { data } = await requestJson(`/api/projects/${encodeURIComponent(projectRecord.id)}/script`)
    assert(Array.isArray(data), 'script response was not an array')
    if (data.length > 0) return data

    const { data: createdSection } = await requestJson(`/api/projects/${encodeURIComponent(projectRecord.id)}/script`, {
      method: 'POST',
      body: SAMPLE_SCRIPT_SECTION,
    })
    assert(createdSection?.id, 'script section create response did not include id')

    const { data: refreshed } = await requestJson(`/api/projects/${encodeURIComponent(projectRecord.id)}/script`)
    assert(Array.isArray(refreshed) && refreshed.length > 0, 'script sections still empty after create')
    return refreshed
  })
  scriptSections = requireStep(scriptSections, 'Fetch project script sections')
  results[results.length - 1].detail = `${scriptSections.length} script section(s)`

  const scriptSnapshot = formatScriptSnapshot(scriptSections) || SAMPLE_SCRIPT_SECTION.content

  let visualPlan = await step('Create visual plan', async () => {
    const { data } = await requestJson(`/api/projects/${encodeURIComponent(projectRecord.id)}/visual-plans`, {
      method: 'POST',
      body: {
        title: `${SANDBOX_TITLE_PREFIX} Visual Plan`,
        status: 'in_review',
        scriptSnapshot,
        scriptSectionId: scriptSections[0]?.id || '',
        shotsJson: JSON.stringify(SAMPLE_SHOTS, null, 2),
        feedbackJson: JSON.stringify(
          [
            {
              role: 'system',
              content: 'Created by local GLM-style HTTP smoke test. No credit-spending browser action was requested.',
              timestamp: new Date().toISOString(),
            },
          ],
          null,
          2,
        ),
        remotionCode: '',
        remotionPreview: '',
        browserTasksJson: JSON.stringify(
          [
            {
              capability: 'browser.source_capture',
              action: 'not_executed_by_smoke_test',
              allow_credit_spend: false,
            },
          ],
          null,
          2,
        ),
      },
    })
    assert(data?.id, 'visual plan create response did not include id')
    return data
  })
  visualPlan = requireStep(visualPlan, 'Create visual plan')
  results[results.length - 1].detail = `${visualPlan.title} (${visualPlan.id})`

  const patchedPlan = await step('Patch visual plan with sample Remotion code', async () => {
    const { data } = await requestJson(`/api/visual-plans/${encodeURIComponent(visualPlan.id)}`, {
      method: 'PATCH',
      body: {
        status: 'approved',
        remotionCode: SAMPLE_REMOTION_CODE,
        feedbackJson: JSON.stringify(
          [
            {
              role: 'system',
              content: 'Sample Remotion code attached by smoke test for local preview rendering.',
              timestamp: new Date().toISOString(),
            },
          ],
          null,
          2,
        ),
      },
    })
    assert(data?.id === visualPlan.id, 'patched plan id did not match')
    assert(data.remotionCode?.includes('UserComposition'), 'patched plan did not include Remotion code')
    return `${data.status}; ${data.remotionCode.length.toLocaleString()} chars`
  })
  requireStep(patchedPlan, 'Patch visual plan with sample Remotion code')

  const preview = await step('POST /api/render/preview with sample Remotion code', async () => {
    const { data } = await requestJson('/api/render/preview', {
      method: 'POST',
      timeoutMs: Math.max(state.timeoutMs, 180_000),
      body: {
        remotionCode: SAMPLE_REMOTION_CODE,
        width: 1280,
        height: 720,
        fps: 30,
        durationInFrames: 90,
        frame: 45,
      },
    })
    assert(data?.ok === true, data?.error || 'preview response did not return ok=true')
    assert(typeof data.image === 'string' && data.image.length > 1000, 'preview image was missing or too small')
    return `${data.engine || 'preview'} image ${data.width}x${data.height}, ${data.image.length.toLocaleString()} base64 chars`
  })
  requireStep(preview, 'POST /api/render/preview with sample Remotion code')

  const browseHealth = await step('GET /api/ai/browse/run_task health', async () => {
    const { data } = await requestJson('/api/ai/browse/run_task')
    assert(data && typeof data.ok === 'boolean', 'browse health did not include ok boolean')
    return data.ok
      ? `${data.message} (${data.browser || data.cdp || 'cdp ready'})`
      : `reachable but not ready: ${data.message || 'unknown'} (${data.cdp || 'no cdp url'})`
  })
  requireStep(browseHealth, 'GET /api/ai/browse/run_task health')

  printReport()
}

function printReport() {
  const passed = results.filter((result) => result.ok).length
  const failed = results.length - passed
  const status = failed === 0 ? 'PASS' : 'FAIL'

  console.log('\nResult report')
  console.log('-------------')
  for (const result of results) {
    const mark = result.ok ? 'PASS' : 'FAIL'
    console.log(`${mark.padEnd(4)} ${result.name} (${result.ms} ms)`)
    console.log(`     ${String(result.detail).replace(/\s+/g, ' ').slice(0, 320)}`)
  }

  console.log(`\nSummary: ${status} (${passed}/${results.length} checks passed)`)
  if (failed > 0) {
    console.log('A failed required check means the app contract is not fully reachable from this agent test.')
  } else {
    console.log('External HTTP agent workflow is reachable without browser credit spend.')
  }
}

main()
  .then(() => {
    const failed = results.some((result) => !result.ok)
    if (!failed) return
    printReport()
    process.exitCode = 1
  })
  .catch((error) => {
    console.error(`\nFAIL ${error instanceof Error ? error.message : String(error)}`)
    printReport()
    process.exitCode = 1
  })
