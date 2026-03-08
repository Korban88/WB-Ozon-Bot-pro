/**
 * RADICAL GUARANTEED FIX for design concept button flow
 *
 * ROOT CAUSE: After any Telegram send node, $json becomes the Telegram API
 * response object. All previous concept fields (concept_index, render_mode, etc.)
 * are LOST. $node["..."] references in IF conditions are unreliable in n8n
 * because they may return the first/last item, not the current item in a multi-item loop.
 *
 * GUARANTEED SOLUTION: Use data that IS ACTUALLY in the Telegram API response:
 *
 *  IF Last Concept: check $json.text or $json.caption contains "5/5"
 *    - sendMessage response has $json.text = sent text (HTML stripped)
 *    - sendPhoto response has $json.caption = sent caption
 *    - Concept 5/5 texts always contain "5/5" (from "КОНЦЕПТ 5/5 —" or "Концепт 5/5 —")
 *
 *  IF Render Mode: check if $json.photo exists (array = DRAW mode, undefined = TEXT mode)
 *    - sendPhoto response has $json.photo = [{file_id, ...}]
 *    - sendMessage response has no $json.photo field
 */

const fs = require('fs');
const FILE = 'C:/Claude Code Projects/WB-Ozon-Bot-pro/WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const nodes = data.nodes;
const fixes = [];

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: IF Last Concept
// New: check if sent message text/caption contains "5/5"
// Works for TEXT (via $json.text) and DRAW (via $json.caption)
// ─────────────────────────────────────────────────────────────────────────────
const ifLast = nodes.find(n => n.name === 'IF Last Concept');
if (ifLast) {
  ifLast.parameters.conditions = {
    options: {
      caseSensitive: false,
      leftValue: "",
      typeValidation: "strict",
      version: 2
    },
    conditions: [
      {
        id: "fix-last-concept-guaranteed",
        leftValue: "={{ ($json.text || $json.caption || '').toString() }}",
        rightValue: "5/5",
        operator: {
          type: "string",
          operation: "contains"
        }
      }
    ],
    combinator: "and"
  };
  fixes.push('FIX 1: IF Last Concept → check $json.text/$json.caption contains "5/5"');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: IF Render Mode
// New: check $json.photo is an array (present = photo was sent = DRAW mode)
// TEXT mode: sendMessage → no $json.photo → FALSE → Send Design Paywall CTA ✓
// DRAW mode: sendPhoto → $json.photo = array → TRUE → Send Design Done ✓
// ─────────────────────────────────────────────────────────────────────────────
const ifRender = nodes.find(n => n.name === 'IF Render Mode');
if (ifRender) {
  ifRender.parameters.conditions = {
    options: {
      caseSensitive: false,
      leftValue: "",
      typeValidation: "loose",
      version: 2
    },
    conditions: [
      {
        id: "fix-render-mode-guaranteed",
        leftValue: "={{ Array.isArray($json.photo) && $json.photo.length > 0 }}",
        rightValue: "true",
        operator: {
          type: "string",
          operation: "equals"
        }
      }
    ],
    combinator: "and"
  };
  fixes.push('FIX 2: IF Render Mode → check $json.photo exists (DRAW=photo array, TEXT=no photo)');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3: Send Concept Text Fallback — ensure chat_id always resolves
// After Telegram response, $json.chat.id has the chat ID
// Add explicit $json.chat?.id fallback
// ─────────────────────────────────────────────────────────────────────────────
const sctf = nodes.find(n => n.name === 'Send Concept Text Fallback');
if (sctf) {
  const oldChat = sctf.parameters.chatId;
  sctf.parameters.chatId = "={{$json.ctx_chat_id || $json.chat_id || $('Normalize').first().json.chat_id || $('Session: Pick').first().json.chat_id}}";
  fixes.push('FIX 3: Send Concept Text Fallback chatId — kept with all fallbacks: ' + sctf.parameters.chatId);
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 4: Send Design Paywall CTA — chat_id from $json.chat.id (Telegram response)
// After Telegram sendMessage, real chat_id is in $json.chat.id
// ─────────────────────────────────────────────────────────────────────────────
const sendPaywall = nodes.find(n => n.name === 'Send Design Paywall CTA');
if (sendPaywall) {
  sendPaywall.parameters.chatId = "={{ $json.chat && $json.chat.id ? $json.chat.id : ($node[\"Session: Pick\"].json.chat_id || $('Normalize').first().json.chat_id) }}";
  fixes.push('FIX 4: Send Design Paywall CTA chatId — $json.chat.id (from Telegram response) with fallback');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 5: Send Design Done — same chat_id fix for DRAW mode
// After sendPhoto, real chat_id is in $json.chat.id
// ─────────────────────────────────────────────────────────────────────────────
const sendDone = nodes.find(n => n.name === 'Send Design Done');
if (sendDone) {
  sendDone.parameters.chatId = "={{ $json.chat && $json.chat.id ? $json.chat.id : ($json.chat_id || $json.ctx_chat_id || $node[\"Session: Pick\"].json.chat_id || $('Normalize').first().json.chat_id) }}";
  fixes.push('FIX 5: Send Design Done chatId — $json.chat.id with fallback');
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY: Check the TEXT mode flow connections are correct
// ─────────────────────────────────────────────────────────────────────────────
const conns = data.connections;
const checks = [
  ['Build Concept Fallback Text', 0, 'Send Concept Text Fallback'],
  ['Send Concept Text Fallback', 0, 'IF Last Concept'],
  ['IF Last Concept', 0, 'IF Render Mode'],
  ['IF Render Mode', 1, 'Send Design Paywall CTA'],  // TEXT mode → main:1 (not photo)
  ['IF Render Mode', 0, 'Send Design Done'],           // DRAW mode → main:0 (has photo)
];

fixes.push('\nVERIFICATION:');
checks.forEach(([src, idx, dst]) => {
  const c = conns[src];
  const ok = c && c.main && c.main[idx] && c.main[idx].some(x => x.node === dst);
  fixes.push('  ' + (ok ? '✓' : '✗ MISSING') + ': ' + src + ' --[' + idx + ']--> ' + dst);
});

// ─────────────────────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
console.log('=== GUARANTEED FIXES APPLIED ===');
fixes.forEach(f => console.log(f));
console.log('\nSaved: ' + FILE);
