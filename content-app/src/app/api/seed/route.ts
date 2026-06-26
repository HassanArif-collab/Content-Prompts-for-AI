import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  // Wipe and reseed
  await db.task.deleteMany()
  await db.scriptSection.deleteMany()
  await db.scene.deleteMany()
  await db.source.deleteMany()
  await db.researchNote.deleteMany()
  await db.project.deleteMany()

  const project = await db.project.create({
    data: {
      title: 'The Forgotten Cartographers',
      logline: 'How a secret team of women mapmakers redrew the world during WWII — and were erased from history.',
      description: 'A 45-minute long-form documentary tracing the lives of the Military Topographic Institute\'s women cartographers (1941–1945), the maps they produced under fire, and why their names vanished from the archives.',
      status: 'scripting',
      targetRuntime: 45,
      narrationWpm: 150,
      coverColor: 'amber',
    },
  })

  // Research notes
  await db.researchNote.createMany({
    data: [
      {
        projectId: project.id,
        title: 'Archive location confirmed',
        content: 'The National Archives confirmed they hold 312 cartographic sheets from the M.T.I. women\'s section (1942–1945). Request #A-2291. Lead archivist: Dr. Helberg. Allow 10 business days for retrieval.',
        category: 'archival',
        tags: 'archive,permissions,lead',
        pinned: true,
      },
      {
        projectId: project.id,
        title: 'Interview: Ingrid Vass, granddaughter',
        content: 'Ingrid (78) has her grandmother\'s field notebook from 1943. Says the family kept it hidden because of post-war reprisals. Open to interview on camera. Lives outside Oslo. Suggested filming window: late September.',
        category: 'interview',
        tags: 'interview,primary-source,norway',
        pinned: true,
      },
      {
        projectId: project.id,
        title: 'Map projection anomaly',
        content: 'Three sheets from 1943 use a non-standard Mercator variant — possibly to confuse enemy intelligence if captured. Cross-reference with Dr. Aaltonen\'s 1998 paper (Source S-02).',
        category: 'fact-check',
        tags: 'projection,analysis',
      },
      {
        projectId: project.id,
        title: 'Historical context: women in wartime cartography',
        content: 'Across all Allied nations, ~70% of wartime cartographic staff were women by 1944. The M.T.I. was unusual in giving them署名权 (attribution) — until 1944 when a policy reversal erased them from the published records.',
        category: 'context',
        tags: 'gender,context,statistics',
      },
      {
        projectId: project.id,
        title: 'Narrative thesis',
        content: 'This isn\'t a "hidden figures" retread. The thesis is: their erasure was a deliberate bureaucratic act, not an accident of history. The maps outlived the names. We follow one specific map (Sheet 47-B) and one specific cartographer (M. Lindqvist) to make this concrete.',
        category: 'general',
        tags: 'thesis,narrative,angle',
        pinned: true,
      },
    ],
  })

  // Sources
  await db.source.createMany({
    data: [
      {
        projectId: project.id,
        type: 'book',
        title: 'Lines in the Snow: Wartime Cartography 1939–1945',
        author: 'Aaltonen, M.',
        publisher: 'Helsinki University Press',
        publicationDate: '1998',
        citation: 'Aaltonen, M. (1998). Lines in the Snow: Wartime Cartography 1939–1945. Helsinki University Press.',
        notes: 'The seminal academic work. Chapter 7 covers the M.T.I. women specifically.',
        credibility: 5,
      },
      {
        projectId: project.id,
        type: 'paper',
        title: 'Erased by Decree: Attribution Reversals in Wartime Technical Bureaus',
        author: 'Brennan, J. & Okafor, P.',
        publisher: 'Journal of Historical Geography, Vol. 41',
        publicationDate: '2015',
        citation: 'Brennan, J. & Okafor, P. (2015). Erased by Decree. Journal of Historical Geography, 41(2), 88–104.',
        notes: 'Provides the bureaucratic mechanism — Directive 14-C — that triggered the erasure.',
        credibility: 5,
      },
      {
        projectId: project.id,
        type: 'archival',
        title: 'M.T.I. Field Notebook — Lindqvist, M. (1943)',
        author: 'Lindqvist, M.',
        publicationDate: '1943',
        citation: 'Lindqvist, M. (1943). Personal field notebook [Facsimile, in possession of family].',
        notes: 'Held by granddaughter Ingrid Vass. The single most important primary source for the film.',
        credibility: 5,
      },
      {
        projectId: project.id,
        type: 'interview',
        title: 'Interview with Dr. Helberg (Lead Archivist)',
        author: 'Helberg, S. (interviewee)',
        publicationDate: '2025',
        citation: 'Helberg, S. (2025). Interview by filmmaker [Recording pending].',
        notes: 'Scheduled for week 3 of production. Has names not yet in any published source.',
        credibility: 4,
      },
      {
        projectId: project.id,
        type: 'video',
        title: 'BBC Timewatch: Mapping the Front (2007)',
        author: 'BBC',
        url: 'https://example.com/bbc-mapping',
        publicationDate: '2007',
        citation: 'BBC. (2007). Mapping the Front. Timewatch series.',
        notes: 'Useful reference but gets the M.T.I. attribution story wrong — we will explicitly correct it.',
        credibility: 3,
      },
    ],
  })

  // Scenes
  await db.scene.createMany({
    data: [
      {
        projectId: project.id,
        order: 0,
        title: 'Cold open: Sheet 47-B',
        shotType: 'Archival',
        location: 'Archive (extreme close-up)',
        description: 'Slow push-in on Sheet 47-B in the archive reading room. Dust motes in a shaft of light. Hands in white cotton gloves turning the sheet over to reveal the cartographer\'s signature in the corner: M. Lindqvist.',
        narration: 'This is a map. It was drawn in 1943, in a basement, by a woman whose name does not appear in any published record of the war. This film is about how that happened — and why it matters now.',
        duration: 45,
        brollNotes: 'Macro lens. Cotton gloves visible. Sound design: paper, breath, distant city.',
        status: 'planned',
      },
      {
        projectId: project.id,
        order: 1,
        title: 'Act I — The basement of the institute',
        shotType: 'B-roll',
        location: 'Oslo (modern building that was the original institute)',
        description: 'Exterior of the building that housed the M.T.I. from 1940–1945. Today it is a normal office building; pedestrians walk past without knowing.',
        narration: 'In 1941, this building held a secret. Three floors up, behind blackout curtains, forty-two women were drawing the maps that would guide the war in the north.',
        duration: 60,
        brollNotes: 'Slow tracking shot of facade. Cut to pedestrians. Drone at golden hour.',
        status: 'planned',
      },
      {
        projectId: project.id,
        order: 2,
        title: 'Act I — Interview: Ingrid Vass',
        shotType: 'Interview',
        location: 'Ingrid\'s home, outside Oslo',
        description: 'Ingrid on camera, holding her grandmother\'s notebook. She turns to a specific page.',
        narration: 'Ingrid Vass grew up with a notebook in her grandmother\'s drawer. She did not know what it meant until she was forty-six years old.',
        duration: 90,
        brollNotes: 'Two-camera setup (medium + close-up). Natural window light. Lavalier + boom.',
        status: 'planned',
      },
      {
        projectId: project.id,
        order: 3,
        title: 'Act II — Directive 14-C',
        shotType: 'Archival',
        location: 'Archive (document photography)',
        description: 'Documentary photography of Directive 14-C, the 1944 order that removed women\'s attributions from published M.T.I. maps.',
        narration: 'In March 1944, a single-page directive landed on the director\'s desk. It ordered that all cartographic sheets thenceforth be published under the institute\'s name, not the cartographer\'s. The reason given was "operational security." The real reason was simpler.',
        duration: 75,
        brollNotes: 'Macro of typed text. Subtle Ken Burns motion. Animate the signature.',
        status: 'planned',
      },
      {
        projectId: project.id,
        order: 4,
        title: 'Act III — The map outlives the name',
        shotType: 'Animation',
        location: 'Studio',
        description: 'Animated sequence: Sheet 47-B is overlaid on modern satellite imagery of the same coastline. They match almost perfectly. The cartographer\'s name fades out; the map stays.',
        narration: 'Eighty years later, the coastline is the same. The map is still right. The name is still wrong.',
        duration: 50,
        brollNotes: 'After Effects composite. Subtle. No music — only ambient sound.',
        status: 'planned',
      },
      {
        projectId: project.id,
        order: 5,
        title: 'Outro — Ingrid at the archive',
        shotType: 'B-roll',
        location: 'National Archives reading room',
        description: 'Ingrid holds the original Sheet 47-B in person for the first time. She finds her grandmother\'s signature.',
        narration: 'In March 2025, Ingrid Vass held the map her grandmother drew. Eighty-two years after it was made. The signature was still there. So was the war. So was the silence.',
        duration: 60,
        brollNotes: 'Single-camera, handheld, intimate. Cotton gloves. Sound: paper, breath.',
        status: 'planned',
      },
    ],
  })

  // Script sections
  await db.scriptSection.createMany({
    data: [
      {
        projectId: project.id,
        order: 0,
        type: 'hook',
        heading: 'COLD OPEN',
        content: 'This is a map. It was drawn in 1943, in a basement, by a woman whose name does not appear in any published record of the war. Her name was Margit Lindqvist. She drew it under candlelight while the city above her burned. For eighty years, her name was missing from history. This film is about how that happened — and about the bureaucratic decree that made it disappear.',
      },
      {
        projectId: project.id,
        order: 1,
        type: 'act',
        heading: 'ACT I — THE BASEMENT',
        content: 'In 1941, the Military Topographic Institute moved its cartographic operations into the basement of a civilian building in central Oslo. The choice was practical: the basement had survived the bombing of April 1940, and it had its own generator. The institute hired women — not out of progressive ideals, but because most of the men were at the front. By 1942, forty-two women were working in that basement. They drew the maps that guided northern operations for the rest of the war. They signed every sheet they produced.\n\nMargit Lindqvist was twenty-three when she started. She had been an art student. Her handwriting — small, precise, slightly left-leaning — appears on three hundred and twelve surviving sheets. She was, by every contemporary account, the most talented cartographer in the room. She was also, by the end of 1943, the only one who knew the projection she had invented was being used to confuse enemy intelligence.',
      },
      {
        projectId: project.id,
        order: 2,
        type: 'transition',
        heading: 'TRANSITION',
        content: 'For three years, the maps went out under the cartographers\' names. Then, on March 12th, 1944, a single page changed everything.',
      },
      {
        projectId: project.id,
        order: 3,
        type: 'act',
        heading: 'ACT II — DIRECTIVE 14-C',
        content: 'Directive 14-C was not long. It was not dramatic. It was a single page, typed on institute letterhead, signed by the director. It ordered that all cartographic sheets produced from that date forward be published under the institute\'s name, not the individual cartographer\'s. The stated reason was operational security. The real reason, as we now know from Dr. Brennan\'s archival work in 2015, was simpler: the director was posturing for a post-war political career, and he wanted the institute\'s work — all of it — to be seen as his institute\'s work.\n\nThe women kept drawing. They kept signing their sheets — but the signatures were now confined to the bottom-right corner of the original, in pencil, and were not reproduced when the sheets were published. Margit Lindqvist\'s name disappeared from three hundred and twelve maps in a single afternoon.',
      },
      {
        projectId: project.id,
        order: 4,
        type: 'act',
        heading: 'ACT III — THE MAP OUTLIVES THE NAME',
        content: 'Margit Lindqvist died in 1971. She never spoke publicly about her wartime work. Her granddaughter, Ingrid Vass, found the notebook in 1989 — and did not understand what it was until she read Dr. Aaltonen\'s book in 2007.\n\nIn March 2025, Ingrid held Sheet 47-B in person for the first time. The map was eighty-two years old. The coastline it depicted had not changed. The signature in the corner was still there — small, precise, slightly left-leaning. The map was still right. The official record was still wrong.\n\nThis is the part of the story that is hardest to tell, and most important: the erasure did not happen because anyone hated Margit Lindqvist. It happened because a man wanted a promotion. The system that allowed it is the same system that lets similar erasures happen today, in different forms, in different countries, to different people. The mechanism is bureaucratic. The damage is total.',
      },
      {
        projectId: project.id,
        order: 5,
        type: 'outro',
        heading: 'OUTRO',
        content: 'Margit Lindqvist drew three hundred and twelve maps that we know of. She signed all of them. Eighty-two years later, three hundred and twelve maps are still in use. Her name is on none of them.\n\nThis film is one small attempt to put it back.\n\n[Title card: THE FORGOTTEN CARTOGRAPHERS]',
      },
    ],
  })

  // Tasks
  await db.task.createMany({
    data: [
      { projectId: project.id, title: 'Confirm archive access window (Sep–Oct)', category: 'research', status: 'done', priority: 'high', dueDate: '2025-08-15' },
      { projectId: project.id, title: 'Pre-interview Ingrid Vass (Zoom)', category: 'research', status: 'in-progress', priority: 'high', dueDate: '2025-09-01' },
      { projectId: project.id, title: 'License Aaltonen book excerpts', category: 'licensing', status: 'todo', priority: 'medium', dueDate: '2025-09-20' },
      { projectId: project.id, title: 'Schedule Dr. Helberg on-camera interview', category: 'research', status: 'todo', priority: 'high', dueDate: '2025-09-10' },
      { projectId: project.id, title: 'Filming: Oslo exterior (2 days)', category: 'filming', status: 'todo', priority: 'high', dueDate: '2025-09-25' },
      { projectId: project.id, title: 'Filming: Ingrid Vass interview (1 day)', category: 'filming', status: 'todo', priority: 'high', dueDate: '2025-09-28' },
      { projectId: project.id, title: 'Archive photography: Sheet 47-B macro', category: 'filming', status: 'todo', priority: 'medium', dueDate: '2025-10-05' },
      { projectId: project.id, title: 'After Effects: map-to-satellite composite', category: 'graphics', status: 'todo', priority: 'medium', dueDate: '2025-10-20' },
      { projectId: project.id, title: 'Sound design pass 1', category: 'sound', status: 'todo', priority: 'low', dueDate: '2025-11-01' },
      { projectId: project.id, title: 'Rough cut v1', category: 'editing', status: 'todo', priority: 'high', dueDate: '2025-11-15' },
      { projectId: project.id, title: 'Thumbnail concepts (3 options)', category: 'graphics', status: 'todo', priority: 'low', dueDate: '2025-11-20' },
      { projectId: project.id, title: 'Final color & sound mix', category: 'editing', status: 'todo', priority: 'high', dueDate: '2025-12-01' },
    ],
  })

  return NextResponse.json({ ok: true, projectId: project.id })
}
