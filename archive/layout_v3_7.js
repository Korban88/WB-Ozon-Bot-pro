'use strict';
const fs = require('fs');
const SRC = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json';

const H = 220; // vertical step
const V = 260; // horizontal step

// positions[name] = [x, y]
const P = {
  // ── A: Entry & session ──────────────────────────────────────────────
  'Telegram Trigger':              [   0,    0],
  'Normalize':                     [ 260,    0],
  'IF Is callback':                [ 520,  -220],
  'Answer Query a callback':       [ 780,  -220],
  'Edit Fields':                   [1040,  -220],
  'Edit Fields1':                  [ 780,    0],
  'Session: Get':                  [1040,    0],
  'IF Session exists':             [1300,    0],
  'Session: Create':               [1560, -110],
  'Session: Pick':                 [1560,  110],
  'Code in JavaScript1':           [1040,  220],

  // ── B: Back / stage dispatcher ──────────────────────────────────────
  'IF Back Command':               [1820,    0],
  'Back Router':                   [2080,    0],
  'Session: Step back':            [2340,  220],
  'Send Back Info':                [2600,  220],
  'IF Stage Generating':           [2080, -220],
  'Send Please Wait':              [2340, -220],
  'IF Clarification text is command': [1820, 440],
  'IF stage == clarifications':    [2080,  440],
  'Session: Save clarifications answers': [2340, 440],
  'Send Clarifications':           [2600,  440],
  'Session: Set stage = clarifications': [2600, 660],

  // ── C: Start / Help / Generate ──────────────────────────────────────
  'IF Start':                      [2080, -660],
  'Session: Reset':                [2340, -660],
  'IMG: Welcome':                  [2600, -660],
  'Send Menu':                     [2860, -660],
  'Send Persistent Nav':           [3120, -660],
  'IF Help':                       [2340, -440],
  'IMG: Help':                     [2600, -440],
  'Send Help':                     [2860, -440],
  'IF Generate':                   [2340, -220],
  'Session: Stage select_marketplace': [2600, -220],
  'IMG: Marketplace':              [2860, -220],
  'Send: Choose marketplace':      [3120, -220],

  // ── D: Marketplace → Category ───────────────────────────────────────
  'IF Marketplace chosen':         [2080,  880],
  'IF MP_WB':                      [2340,  770],
  'Session: Set marketplace WB':   [2600,  770],
  'IF MP_OZON':                    [2340,  990],
  'Session: Set marketplace OZON': [2600,  990],
  'IMG: Category':                 [2860,  880],
  'Send: Choose category':         [3120,  880],
  'IF Category chosen':            [2080, 1100],
  'Map category':                  [2340, 1100],
  'Session: Set category':         [2600, 1100],
  'IMG: Title':                    [2860, 1100],
  'Send: Ask title':               [3120, 1100],

  // ── E: Title → Benefits → Photo ─────────────────────────────────────
  'IF Title input':                [2080, 1320],
  'Session: Set title':            [2340, 1320],
  'IMG: Benefits':                 [2600, 1320],
  'Send: Ask benefits':            [2860, 1320],
  'IF Benefits input':             [2080, 1540],
  'Session: Set benefits':         [2340, 1540],
  'IMG: Photo Upload':             [2600, 1540],
  'Send: Ask photo':               [2860, 1540],
  'IF Photo received':             [2080, 1760],
  'Send: Ask photo(repeat)':       [2340, 1980],
  'Session: Save photo':           [2340, 1760],

  // ── F: Generation pipeline ──────────────────────────────────────────
  'IF has saved photo':            [2600, 1760],
  'TG: GetFile':                   [2860, 1870],
  'Extract from File':             [3120, 1870],
  'Sanitize base64':               [3380, 1870],
  'IF Sanitize Error':             [3640, 1870],
  'Send Photo Error':              [3900, 1870],
  'IMG: Generating':               [2600, 1980],
  'Send Card Progress':            [2860, 1980],
  'Build Normalize Body':          [3120, 1760],
  'GEN: OpenRouter Normalize':     [3380, 1760],
  'Parse Normalize':               [3640, 1760],
  'IF Need Clarifications':        [3900, 1760],
  'Compose item':                  [3900, 1540],
  'Parse Benefits (Deterministic)':[3640, 1540],
  'Build Strategy Body':           [4160, 1760],
  'GEN: OpenRouter Strategy':      [4420, 1760],
  'Parse Strategy':                [4680, 1760],
  'Format Result':                 [4940, 1760],
  'Split Result Parts':            [5200, 1760],
  'IF Last Part':                  [5460, 1760],
  'Send Result':                   [5460, 1540],
  'Session: Done':                 [5720, 1760],
  'Send Design CTA':               [5980, 1760],

  // ── G: Design concept flow ──────────────────────────────────────────
  'IF Design Concept':             [6240,  880],
  'IF Design Feature Enabled':     [6500,  880],
  'Send Design Disabled':          [6760, 1100],
  'Build Design Concepts':         [6760,  660],
  'Design Context Keeper':         [7020,  660],
  'Merge Design Download Context': [7020,  880],
  'Download Design Concept Image': [7020, 1100],
  'IF Concept Image Downloaded':   [7280, 1100],
  'Send Design Concept Photo Binary': [7540,  880],
  'Send Concept Text Fallback':    [7540, 1100],
  'Prepare Image URLs':            [7280, 1320],
  'IF Has Next URL':               [7540, 1320],
  'Next URL Try':                  [7800, 1320],
  'Build Concept Fallback Text':   [7800, 1540],
  'IF Last Concept':               [7280,  440],
  'Send Design Progress':          [7540,  660],
  'Send Design Done':              [7540,  220],

  // ── H: Render / Draw flow ───────────────────────────────────────────
  'IF Render Mode':                [6240, 1320],
  'Set Render Mode TEXT':          [6500, 1100],
  'Set Render Mode DRAW':          [6500, 1540],
  'IF Draw Flow Item':             [6760, 1320],
  'IF Draw Design Paid':           [7020, 1540],
  'Send Draw Progress':            [7280, 1540],
  'Send Design Paywall CTA':       [7280, 1760],
};

const wf = JSON.parse(fs.readFileSync(SRC, 'utf8'));
let moved = 0;
const missed = [];

for (const node of wf.nodes) {
  if (P[node.name]) {
    node.position = P[node.name];
    moved++;
  } else {
    missed.push(node.name);
  }
}

fs.writeFileSync(SRC, JSON.stringify(wf, null, 2));
console.log(`Positioned ${moved}/${wf.nodes.length} nodes.`);
if (missed.length) console.log('NOT positioned (kept original):', missed.join(', '));
