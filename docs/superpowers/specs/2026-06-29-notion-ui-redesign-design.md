# Notion-style UI redesign — design spec

Date: 2026-06-29
Status: Awaiting user review
Scope: Frontend (`content-app/src/components/studio/**`, `globals.css`) + prompt text (`prompts/script-v5`, `prompts/visual-v7-glm`). **No backend logic, no DB schema changes** — plus one minimal, additive, read-only asset-serving route (approved — see §9).

---

## 1. Goal

Turn the documentary studio into a Notion-faithful workspace: inline editing (no popups), restraint-first visuals, multiple views per tab, and a UI molded to the research → script → visual workflow. The four tabs stay as separate tabs (user requirement).

## 2. Locked decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Visual language | Notion-faithful, **pure neutral / zero brand color** |
| 2 | Theme | Light + dark, with a header toggle |
| 3 | Animation preview | Live-render the shot's HTML/GSAP code in-browser (for feedback) **+** show AI-generated images and videos inline per shot |
| 4 | Prompts | May edit `script-v5` and `visual-v7-glm` to add fields (stored in existing columns) |
| 5 | Rollout | All four tabs, order: Script → Storyboard → Visual → Research |
| 6 | Tabs | Keep the top tab strip; left rail is only an in-page outline, not competing nav |
| 7 | Dependencies | Reuse the 5 components already on `main`; **no heavy new deps** (no Tiptap, no @remotion/player, no drag lib) |

## 3. Design language (Notion tokens)

Add these as CSS variables in `globals.css` and drive everything from them. Exact values pulled from Notion.

**Dark**
- page `#191919` · panel/tag `#252525` · hover-block `#1E1E1E`
- text `#D4D4D4` · muted `#9B9B9B` · faint `#6E6E6E` · handle `#5A5A5A`
- border hairline `#2C2C2C`
- spoken-highlight bg `#372E20` (text stays `#D4D4D4`)

**Light**
- page `#FFFFFF` · panel/tag `#EFEFED` · hover-block `#F7F7F5`
- text `#373530` · muted `#787774` · faint `#9B9A97`
- border hairline `#ECECEA`
- spoken-highlight bg `#FAF3DD` (text stays `#373530`)

**Type / spacing / borders**
- Font: existing sans (Inter-class). Two weights only: 400 body, 500 labels/headings.
- Body 15–16px, line-height ~1.75. Section heading 16px/500. Meta 12px muted.
- 4px spacing scale. Hairline 1px borders only — no heavy dividers, no shadows, no gradients.

**Interaction patterns (apply everywhere)**
- Inline editing only. Click text → edit in place → blur saves. No dialogs for content.
- Block hover handle: `+` and six-dot grip appear on row hover, to the left, in handle-gray.
- Slash menu: `/` at line start opens a block-insert menu.
- Command palette: `⌘K` / `Ctrl+K` to jump to any section/shot and run AI actions.
- Selection/hover states are subtle (one step off the surface color), never saturated.

## 4. App shell

- `globals.css`: add the dark/light token sets; wire a `data-theme` (or `.dark`) toggle. Use whatever theme mechanism is already present; if none, a class toggle persisted to `localStorage`.
- Header (`project-workspace.tsx`): add a light/dark toggle button next to AI provider / Settings. Restyle the tab strip to the Notion pattern (active = default-text + 2px neutral underline sitting on the divider; inactive = muted). No colored tab pills.
- Optional in-page left **outline rail** (collapsible) inside Script and Storyboard: a table-of-contents of that tab's sections. Pure navigation aid; does not replace the top tabs.

## 5. Per-tab specs

### 5.1 Script
- Kill the "raw markup box + separate preview box" pattern. One surface only.
- New `BlockEditor` (highlight-overlay technique, ~50 lines, no deps): a textarea layered over a styled backdrop so spoken text shows yellow **live as you type**, and `[N]` render as subtle superscript chips — no second box.
- Storage unchanged: `[HIGHLIGHT]…[/HIGHLIGHT]` and `[N]` stay as plain text in `ScriptSection.content`.
- Select text → small floating toolbar: "Highlight" (toggle spoken) and "Add footnote". Writes/removes the markers.
- Footnote `[N]` → opens existing `SourceSidebar`, mapped to the Nth source in the Sources tab (citation order). Sidebar lists all links, can open the page and AI-summarize (already built).
- Slash menu to add a section (Hook / Act / Transition / Outro). Runtime dashboard slimmed to one line.
- Remove the `Sparkles`/expand panel clutter; keep AI-expand as an inline affordance via the handle menu.

### 5.2 Storyboard
- Replace `SceneDialog` / `VisualDialog` popups with a **Notion-style table + expandable rows**.
- Columns: Scene · Aesthetic · Visual style · Animation type · Presenter (you on screen) · Duration · Status. Click a row to expand inline (description, narration, b-roll, linked shots).
- A **Style Bible** block pinned at the top (global aesthetic for the video).
- Each row maps to its script line(s) and to its visual-plan shots (see §6 Mapping rail, §7 storage).
- New per-shot fields (aesthetic, visualStyle, animationType, presenter, linkedSceneId, linkedScriptRef) come from the edited visual prompt and live in `VisualPlan.shotsJson` — no schema change.

### 5.3 Visual Plans
- All shots stay expanded (already are). Per shot, a new **AssetDock** shows, inline, whichever apply:
  - **(a) Live animation** — render the shot's HTML/GSAP `remotionCode` in a sandboxed `<iframe srcdoc>` so it actually plays; you can replay and give feedback. Frontend-only.
  - **(b) AI image** — Dreamina image (base64 if the existing `dreamina-image` endpoint returns it; confirm in impl).
  - **(c) AI video** — Dreamina/Flow `.mp4` via `VideoPreview` (depends on §9).
- Keep the 4 views (List / Board / Gallery / Timeline). Fix Gallery/Timeline to use **per-shot** previews, not one plan-level image.
- Keep per-shot feedback + approve (already built).

### 5.4 Research
- Notion hierarchical tree: inline title/content editing, hover `+` (add child) and `⋯`, link chips that open `SourceSidebar`.
- Add a view switcher: Tree (default) and Board (by category).

### 5.5 Sources (supporting)
- Stays a tab; `SourceSidebar` is the shared slide-in used by Script and Research. No popups for editing — inline rows.

## 6. Components (reuse first)

Reuse: `InlineEditor`, `SourceSidebar`, `ShotBlock`, `ViewSwitcher`, `VideoPreview`.

New (small, no deps):
- `BlockEditor` — highlight-overlay script editor (§5.1).
- `SlashMenu` — `/` block insert.
- `CommandPalette` — `⌘K` jump + AI actions.
- `AssetDock` — live-iframe + image + video per shot (§5.3); wraps `VideoPreview`.
- `MappingRail` — thin connector visualizing script line → scene → shot.
- `ThemeToggle` — light/dark switch.
- `NotionTable` — table + expandable rows for Storyboard.

## 7. Data storage strategy (no schema changes)

| New concept | Stored in (existing) |
|---|---|
| Spoken highlight | `[HIGHLIGHT]…[/HIGHLIGHT]` in `ScriptSection.content` |
| Footnotes | `[N]` in `ScriptSection.content` → Nth `Source` (citation order) |
| Per-shot aesthetic / visualStyle / animationType / presenter / links | `VisualPlan.shotsJson` (already free JSON) |
| Global Style Bible | a reserved pinned `ResearchNote` (e.g. `category: "style-bible"`) via existing research API |
| Script line ↔ scene ↔ shot mapping | `linkedScriptRef` / `linkedSceneId` inside `shotsJson`; Storyboard is a join view |

## 8. Prompt changes

- `prompts/visual-v7-glm`: add to each shot's JSON output: `aesthetic`, `visualStyle`, `animationType`, `presenter` (on-screen vs VO), `linkedSceneId`, `linkedScriptRef`, `previewType` (animation|image|video). Stored in `shotsJson` — UI reads them directly.
- `prompts/script-v5`: emit spoken lines wrapped in `[HIGHLIGHT]…[/HIGHLIGHT]` and citations as `[N]` in citation order; optionally emit a global Style Bible note.
- These are additive text changes; they do not require any backend or schema change.

## 9. Honest constraints / open dependency

- ✅ Live animation, theme toggle, inline editing, sidebar, storyboard table, prompt fields, AI **image** display (if base64) — all pure frontend/prompts.
- ⚠️ **AI video (`.mp4`) display:** Dreamina assets are written to a local tool folder; `public/` holds only `logo.svg`, so video files are **not browser-reachable today.** **Decision: APPROVED — add one minimal, additive, read-only route** (e.g. `GET /api/assets/[...path]`) that streams a downloaded asset file by path, scoped to the known download directory only (no writes, no deletes, path-traversal-guarded). This is the single backend addition in the whole project; it touches nothing existing.

## 10. Execution sequence (testable increments)

0. Design system: Notion tokens in `globals.css` + `ThemeToggle` + tab restyle. (Low risk, foundational.)
1. Script: `BlockEditor` + slash menu + footnote→sidebar; remove double-box.
2. Storyboard: `NotionTable` + Style Bible + mapping; remove popups. (+ visual prompt fields)
3. Visual Plans: add the read-only `GET /api/assets/[...path]` route (§9); `AssetDock` (live iframe + image + video); per-shot previews.
4. Research: tree + views + hover handles.
5. Shell polish: `CommandPalette`, left outline rail.

Each phase is a separate, pull-and-test increment to suit the fragile-tunnel workflow.

## 11. Do NOT touch (backend protection)

`src/app/api/**` (existing routes), `src/lib/**` (tunnel, ai, remotion-renderer, tool-runner), `prisma/schema.prisma`, `start.bat`, `tools/**`. Sole addition: the new read-only `GET /api/assets/[...path]` route in §9 — additive, no existing file modified.

## 12. Out of scope / deferred

- True exported MP4 of the whole video (needs a backend render route; deps exist but excluded here).
- Drag-and-drop reordering (kept as up/down arrows; revisit if needed).
- Rich text beyond highlight/footnote (bold/italic/etc.) — add Tiptap later only if requested.
