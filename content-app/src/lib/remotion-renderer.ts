import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

export interface RemotionPreviewInput {
  code: string
  width?: number
  height?: number
  fps?: number
  durationInFrames?: number
  frame?: number
  props?: Record<string, unknown>
}

async function findBrowserExecutable(): Promise<string | null> {
  const candidates = [
    process.env.REMOTION_BROWSER_EXECUTABLE,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {}
  }
  return null
}

function normalizeComponentCode(code: string): string {
  if (/export\s+(const|function)\s+UserComposition/.test(code)) return code
  if (/export\s+default\s+/.test(code)) return code
  if (/export\s+(const|function)\s+Composition/.test(code)) {
    return `${code}\nexport { Composition as UserComposition };\n`
  }
  return `${code}\n\nexport const UserComposition = typeof Composition !== 'undefined' ? Composition : (() => null);\n`
}

export async function renderRemotionPreview(input: RemotionPreviewInput): Promise<{
  image: string
  width: number
  height: number
  frame: number
  durationInFrames: number
}> {
  const width = input.width ?? 1920
  const height = input.height ?? 1080
  const fps = input.fps ?? 30
  const durationInFrames = input.durationInFrames ?? 150
  const frame = input.frame ?? Math.max(0, Math.floor(durationInFrames / 2))
  const jobDir = path.join(process.cwd(), 'runtime', 'remotion-preview', randomUUID())
  const srcDir = path.join(jobDir, 'src')
  const bundleDir = path.join(jobDir, 'bundle')
  const outPath = path.join(jobDir, 'preview.png')
  const entryPath = path.join(srcDir, 'index.tsx')
  const componentPath = path.join(srcDir, 'UserComposition.tsx')

  await fs.mkdir(srcDir, { recursive: true })
  await fs.writeFile(componentPath, normalizeComponentCode(input.code), 'utf8')
  const componentImport = /export\s+default\s+/.test(input.code)
    ? "import UserComposition from './UserComposition';"
    : "import { UserComposition } from './UserComposition';"
  await fs.writeFile(
    entryPath,
    [
      "import React from 'react';",
      "import { Composition, registerRoot } from 'remotion';",
      componentImport,
      '',
      'const Root = () => (',
      '  <Composition',
      '    id="Preview"',
      '    component={UserComposition}',
      `    width={${width}}`,
      `    height={${height}}`,
      `    fps={${fps}}`,
      `    durationInFrames={${durationInFrames}}`,
      '  />',
      ');',
      '',
      'registerRoot(Root);',
      '',
    ].join('\n'),
    'utf8',
  )

  try {
    const browserExecutable = await findBrowserExecutable()
    const inputProps = input.props ?? {}
    const serveUrl = await bundle({
      entryPoint: entryPath,
      outDir: bundleDir,
      enableCaching: false,
      publicDir: null,
      rootDir: process.cwd(),
    })
    const composition = await selectComposition({
      serveUrl,
      id: 'Preview',
      inputProps,
      browserExecutable,
      logLevel: 'error',
      timeoutInMilliseconds: 120_000,
    })
    await renderStill({
      serveUrl,
      composition,
      output: outPath,
      frame,
      inputProps,
      browserExecutable,
      imageFormat: 'png',
      overwrite: true,
      logLevel: 'error',
      timeoutInMilliseconds: 120_000,
    })
    const image = await fs.readFile(outPath)
    return {
      image: image.toString('base64'),
      width,
      height,
      frame,
      durationInFrames,
    }
  } finally {
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {})
  }
}
