# Notion UI guide — how it should look & how it plugs into our app

This is the north-star guide for the documentary-studio redesign: what "Notion-faithful"
actually means in concrete values, and how each part of *our* app adopts it. It doubles as a
**handoff** so the build can continue in a fresh session (see §9–§10).

Companion spec (the detailed plan): [specs/2026-06-29-notion-ui-redesign-design.md](superpowers/specs/2026-06-29-notion-ui-redesign-design.md)

---

## 1. The one idea

Notion looks good because it **stops decorating**. No brand color, no gradients, no shadows,
no badges-in-rainbow. Almost everything is one of a few warm grays, separated by hairlines,
with lots of whitespace. Controls appear on hover and get out of the way. We copy that
restraint exactly. Our single non-gray is the **yellow spoken-line highlight**, because that is
functional content (it marks what the presenter says), not decoration.

If a change makes the UI *more colorful or busier*, it is wrong.

## 2. Exact color tokens

These are Notion's real values. They live in `content-app/src/app/globals.css` as CSS variables
and drive every component. Do not hardcode hex in components — use the token classes
(`bg-background`, `text-muted-foreground`, `border-border`, `bg-highlight`, etc.).

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--background` | `#ffffff` | `#191919` | page |
| `--card` / `--popover` | `#ffffff` / `#fff` | `#202020` / `#252525` | surfaces, menus |
| `--muted` (panel/tag) | `#f1f1ef` | `#252525` | tag chips, fills |
| `--foreground` (text) | `#373530` | `#d4d4d4` | body text (warm, not pure black/white) |
| `--muted-foreground` | `#787774` | `#9b9b9b` | secondary text, metadata |
| `--accent` (hover) | `#efefed` | `#2c2c2c` | hover surface |
| `--border` (hairline) | `#e9e9e7` | `#2c2c2c` | all dividers — 1px, subtle |
| `--highlight` (spoken) | `#faf3dd` | `#372e20` | spoken-line background (the only color) |

Light is `:root`; dark is `.dark` on `<html>`. The theme toggle (`theme-toggle.tsx`) flips the
class and persists to `localStorage`; a pre-paint script in `layout.tsx` applies it before
hydration so there is no flash.

## 3. Type, spacing, borders

- Font: the app's existing sans (Geist; Inter-class). **Two weights only** — 400 body, 500 for
  labels/headings. Never 600/700.
- Sizes: body 15–16px, line-height ~1.75; section headings 16px/500; metadata 12px muted.
- Spacing: 4px scale. Radius: 8px controls, 12px cards (`--radius` = 0.5rem).
- Borders: **1px hairline only.** No heavy dividers, no shadows, no gradients, flat surfaces.
- Sentence case everywhere. No ALL-CAPS, no Title Case (except proper nouns).

## 4. Interaction patterns (apply to every tab)

- **Inline editing, never popups.** Click text → edit in place → blur saves. No dialogs for
  content. (Dialogs only for genuinely separate flows, and even those should shrink.)
- **Block hover handle.** On hovering a row, a `+` and a six-dot drag handle appear to its left,
  in handle-gray. Hidden otherwise.
- **Slash menu (`/`).** At the start of a line, `/` opens a block-insert menu (add section, shot,
  source…).
- **Command palette (`⌘K` / `Ctrl+K`).** Jump to any section/shot and run AI actions.
- **Multiple views.** Tabs that hold lists offer view switchers (table / board / gallery /
  timeline / tree) like Notion databases.
- **Slide-in right sidebar** for context (a source, a shot's detail) instead of a modal.
- Hover/selection states are **one step** off the surface color, never saturated.

## 5. How each tab adopts Notion

Tabs stay as separate tabs (top strip, Notion underline style). What changes inside each:

- **Script** — one editing surface per section: clean rendered text by default (yellow
  highlights + clickable footnote chips), edit in place. Spoken lines highlight live as you type
  (Tiptap). Footnote chips open the source sidebar. No "raw box + preview box".
- **Storyboard** — a Notion-style **table with expandable rows** (no popups). Columns: Scene,
  Aesthetic, Visual style, Animation type, Presenter (you on screen), Duration, Status. A
  "Style Bible" block pins the global aesthetic on top. Each row maps to its script line(s) and
  visual-plan shots.
- **Visual Plans** — all shots open by default. Per shot, an **asset dock** shows, inline: the
  live-playing HTML/GSAP animation (so you can give feedback), the AI image, and the AI video.
  Keep the four views; previews are per-shot.
- **Research** — Notion hierarchical tree: inline edit, hover `+`/`⋯`, link chips → sidebar.
  Add a tree/board view switch.
- **Sources** — inline rows; the shared slide-in `SourceSidebar` (citation, web preview, AI
  summarize, chat).

## 6. Component inventory

Reuse first (already in `content-app/src/components/studio/`): `InlineEditor`, `SourceSidebar`,
`ShotBlock`, `ViewSwitcher`, `VideoPreview`, and now `theme-toggle`, `BlockEditor`.

New/needed: `RichBlockEditor` (Tiptap live-highlight script editor), `SlashMenu`,
`CommandPalette`, `AssetDock` (live iframe + image + video), `MappingRail`, `NotionTable`
(storyboard table + expandable rows).

## 7. Data storage — no DB schema changes

| New concept | Stored in (existing) |
|---|---|
| Spoken highlight | `[HIGHLIGHT]…[/HIGHLIGHT]` in `ScriptSection.content` |
| Footnotes | `[N]` in `ScriptSection.content` → Nth `Source` (citation order) |
| Per-shot aesthetic / visualStyle / animationType / presenter / links | `VisualPlan.shotsJson` (free JSON) |
| Global Style Bible | a reserved pinned `ResearchNote` (`category: "style-bible"`) |
| Script line ↔ scene ↔ shot mapping | `linkedScriptRef` / `linkedSceneId` inside `shotsJson` |

Backend stays untouched except **one** new additive, read-only route
`GET /api/assets/[...path]` to serve downloaded AI video files (they aren't web-reachable today).
Path-scoped to the known download dir, no writes/deletes, traversal-guarded.

The marker↔editor conversion lives in `content-app/src/lib/script-format.ts`
(`markersToDoc` / `docToMarkers`) and is round-trip unit-tested — never change it without
re-running the round-trip checks; a bad round-trip corrupts script text.

## 8. Prompt additions (allowed)

- `prompts/visual-v7-glm`: add per-shot `aesthetic`, `visualStyle`, `animationType`, `presenter`,
  `linkedSceneId`, `linkedScriptRef`, `previewType` (animation|image|video) to the JSON output.
- `prompts/script-v5`: wrap spoken lines in `[HIGHLIGHT]…[/HIGHLIGHT]`, emit citations as `[N]` in
  order, optionally emit the Style Bible note. Additive text only — no backend/schema impact.

---

## 9. Build status (update as you go)

Branch: `notion-ui-redesign`.

- ✅ **Phase 0 — design system**: Notion tokens in `globals.css`, `theme-toggle`, pre-paint
  script, Notion underline tab strip. (commit "Phase 0")
- ✅ **Phase 1 — Script (robust editor)**: `BlockEditor` single surface, highlights+chips on the
  rendered view, select-to-highlight toolbar, accents neutralized. (commit "Phase 1")
- 🔧 **Phase 1b — Script (live Tiptap)**: `script-format.ts` (done, tested) + Tiptap deps
  installed. `RichBlockEditor` and the swap into `script-tab` are the next step.
- ⬜ **Phase 2 — Storyboard**: `NotionTable` + Style Bible + mapping; remove popups.
- ⬜ **Phase 3 — Visual Plans**: `AssetDock` (live iframe + image + video) + `/api/assets` route;
  per-shot previews.
- ⬜ **Phase 4 — Research**: tree + views + hover handles.
- ⬜ **Phase 5 — Shell**: `CommandPalette`, optional left outline rail.

## 10. How to continue building

1. Work in `content-app/`. Install deps with the **project store**:
   `pnpm add <pkg> --store-dir "runtime/pnpm/store"` — the default store path fails with
   `ERR_PNPM_UNEXPECTED_STORE`.
2. After each change run the typecheck and check only our code:
   `npx tsc --noEmit 2>&1 | grep "src/"` — it should print nothing. (Ignore errors under
   `runtime/Microsoft/Edge/...`; that's a committed browser-profile folder tsc happens to scan,
   unrelated to our work — a good cleanup task is to exclude it in `tsconfig`.)
3. Keep changes frontend + prompts only. Do not touch `src/app/api/**` (except adding the one
   `/api/assets` route), `src/lib/**` engine files, `prisma/schema.prisma`, `start.bat`,
   `tools/**`.
4. Commit per phase; keep the visual language pure-neutral (§1–§3). Test each tab after pulling.

## 11. Gotchas

- pnpm store path (see §10.1).
- AI video files need the `/api/assets` route to display; until then `VideoPreview` shows a
  placeholder.
- Live-highlight uses Tiptap; the serialization round-trip in `script-format.ts` is the
  data-safety boundary — keep it tested.
