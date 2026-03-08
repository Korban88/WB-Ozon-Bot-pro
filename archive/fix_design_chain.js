const fs = require('fs');
const FILE = 'C:/Claude Code Projects/WB-Ozon-Bot-pro/WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const nodes = data.nodes;
const fixes = [];

// FIX 1: IF Last Concept
// $json after Telegram send nodes is Telegram API response — has no concept_index.
// Reference upstream context nodes instead.
const ifLast = nodes.find(n => n.name === 'IF Last Concept');
if (ifLast) {
  const cond = ifLast.parameters.conditions.conditions[0];
  cond.leftValue = "={{ Number($node[\"Build Concept Fallback Text\"].json.concept_index || $node[\"Merge Design Download Context\"].json.ctx_concept_index || 0) }}";
  cond.rightValue = "={{ Number($node[\"Build Concept Fallback Text\"].json.concept_total || $node[\"Merge Design Download Context\"].json.ctx_concept_total || 5) }}";
  fixes.push('FIX 1: IF Last Concept — reference upstream context nodes');
}

// FIX 2: IF Render Mode
// $json at this point is Telegram response — render_mode is lost.
// TEXT mode accidentally worked ('' != 'DRAW'), but DRAW mode was broken.
const ifRender = nodes.find(n => n.name === 'IF Render Mode');
if (ifRender) {
  const cond = ifRender.parameters.conditions.conditions[0];
  cond.leftValue = "={{ ($json.render_mode || $node[\"Merge Design Download Context\"].json.render_mode || $node[\"Build Concept Fallback Text\"].json.render_mode || '').toString().toUpperCase() }}";
  fixes.push('FIX 2: IF Render Mode — restore render_mode from upstream context');
}

// FIX 3: Send Design Paywall CTA — add Session: Pick fallback for chat_id
const sendPaywall = nodes.find(n => n.name === 'Send Design Paywall CTA');
if (sendPaywall) {
  sendPaywall.parameters.chatId = "={{ $json.ctx_chat_id || $json.chat_id || $node[\"Session: Pick\"].json.chat_id || $(\"Normalize\").first().json.chat_id }}";
  fixes.push('FIX 3: Send Design Paywall CTA — add Session: Pick fallback for chat_id');
}

// FIX 4: Send Design Done — add chat_id fallbacks for DRAW mode
const sendDone = nodes.find(n => n.name === 'Send Design Done');
if (sendDone) {
  sendDone.parameters.chatId = "={{ $json.chat_id || $json.ctx_chat_id || $node[\"Session: Pick\"].json.chat_id || $(\"Normalize\").first().json.chat_id }}";
  fixes.push('FIX 4: Send Design Done — add chat_id fallbacks');
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
console.log('=== FIXES APPLIED ===');
fixes.forEach(f => console.log('  ' + f));
console.log('Saved: ' + FILE);
