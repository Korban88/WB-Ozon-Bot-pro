// Patch v3_9: Fix DRAW mode sending photos by URL instead of downloading binary.
//
// Root cause: Download retry chain (Design Context Keeper → Download → Merge → IF Concept Image Downloaded)
// doesn't work reliably — Merge node with combineByPosition fails in a looping context.
// All 3 URL attempts exhaust → fallback to text → user sees text instead of images.
//
// Fix: Add "Send Concept Photo URL" node that sends photos directly via Telegram's
// sendPhoto-with-URL (no binary download needed). Insert it between Prepare Image URLs
// and IF Last Concept, replacing Design Context Keeper as the first step in DRAW path.
//
// After: Prepare Image URLs → Send Concept Photo URL → IF Last Concept
// Old download chain (Design Context Keeper, Download, Merge, IF Concept Image Downloaded,
// IF Has Next URL, Next URL Try) remains in place but is no longer wired from Prepare Image URLs.

import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

const FILE = 'C:\\Claude Code Projects\\WB-Ozon-Bot-pro\\WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_9.json';
const wf = JSON.parse(readFileSync(FILE, 'utf8'));

// ── Verify key nodes exist ─────────────────────────────────────────────────
const prep = wf.nodes.find(n => n.name === 'Prepare Image URLs');
const dck  = wf.nodes.find(n => n.name === 'Design Context Keeper');
const ilc  = wf.nodes.find(n => n.name === 'IF Last Concept');
const cred  = wf.nodes.find(n => n.type === 'n8n-nodes-base.telegram' && n.credentials?.telegramApi);

if (!prep) { console.error('Prepare Image URLs not found'); process.exit(1); }
if (!ilc)  { console.error('IF Last Concept not found'); process.exit(1); }

console.log('Prepare Image URLs position:', prep.position);
console.log('Design Context Keeper position:', dck?.position);
console.log('IF Last Concept position:', ilc.position);

const TELEGRAM_CRED = cred?.credentials?.telegramApi
  ?? { id: '__REPLACE_TELEGRAM_CREDENTIAL__', name: '__REPLACE_TELEGRAM_CREDENTIAL__' };

// ── New node: Send Concept Photo URL ──────────────────────────────────────
// Position: between Prepare Image URLs [6780, 1100] and IF Last Concept [7280, 440]
const NEW_ID = randomUUID();
const newNode = {
  id: NEW_ID,
  name: 'Send Concept Photo URL',
  type: 'n8n-nodes-base.telegram',
  typeVersion: 1.2,
  position: [7060, 760],
  parameters: {
    resource: 'message',
    operation: 'sendPhoto',
    chatId: '={{$json.ctx_chat_id || $json.chat_id || $(\`Normalize\`).first().json.chat_id}}',
    photo: '={{$json.current_url || $json.ctx_image_url || $json.photo_url}}',
    additionalFields: {
      caption: '={{$json.caption || ""}}',
      parse_mode: 'HTML',
      appendAttribution: false,
    },
  },
  credentials: { telegramApi: TELEGRAM_CRED },
};

wf.nodes.push(newNode);
console.log('\nAdded node:', newNode.name, '| id:', NEW_ID);

// ── Rewire connections ─────────────────────────────────────────────────────
// OLD: Prepare Image URLs → Design Context Keeper (index 0 in main[0])
// NEW: Prepare Image URLs → Send Concept Photo URL
//      (Design Context Keeper remains but no longer receives from Prepare Image URLs)

const piuConn = wf.connections['Prepare Image URLs'];
if (!piuConn) {
  console.error('No connections FROM Prepare Image URLs!');
  process.exit(1);
}
console.log('\nPrepare Image URLs connections BEFORE:');
piuConn.main.forEach((b, i) => console.log(' ', i, '->', b.map(t => t.node).join(', ')));

// Replace Design Context Keeper target with new node in output 0
piuConn.main[0] = piuConn.main[0].map(target => {
  if (target.node === 'Design Context Keeper') {
    return { node: 'Send Concept Photo URL', type: 'main', index: 0 };
  }
  return target;
});
// If Design Context Keeper wasn't in the list, add the new node
if (!piuConn.main[0].find(t => t.node === 'Send Concept Photo URL')) {
  piuConn.main[0].push({ node: 'Send Concept Photo URL', type: 'main', index: 0 });
}

console.log('\nPrepare Image URLs connections AFTER:');
piuConn.main.forEach((b, i) => console.log(' ', i, '->', b.map(t => t.node).join(', ')));

// Connect: Send Concept Photo URL → IF Last Concept
wf.connections['Send Concept Photo URL'] = {
  main: [[{ node: 'IF Last Concept', type: 'main', index: 0 }]],
};
console.log('\nSend Concept Photo URL → IF Last Concept ✓');

// ── Save ───────────────────────────────────────────────────────────────────
writeFileSync(FILE, JSON.stringify(wf, null, 2), 'utf8');
console.log('\n✓ Saved', FILE);
console.log('\nDRAW path now:');
console.log('  IF Draw Flow Item (TRUE) → Prepare Image URLs → Send Concept Photo URL → IF Last Concept');
console.log('  (Old download chain is preserved but disconnected from this path)');
console.log('\nWhen user clicks button:');
console.log('  GEN: Together AI Image generates URL (or falls back to pollinations)');
console.log('  Prepare Image URLs picks best URL → current_url');
console.log('  Telegram sendPhoto sends image directly by URL (no download!)');
console.log('  Total nodes:', wf.nodes.length);
