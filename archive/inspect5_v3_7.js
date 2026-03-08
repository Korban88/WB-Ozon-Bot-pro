'use strict';
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json','utf8'));
const nodes = {};
for (const n of wf.nodes) nodes[n.name] = n;
const C = wf.connections;

function outs(name) { return C[name] ? C[name].main.map(arr => arr.map(c => c.node)) : []; }
function incomingTo(target) {
  const res = [];
  for (const [src, con] of Object.entries(C)) {
    for (let port = 0; port < (con.main||[]).length; port++)
      for (const edge of (con.main[port]||[]))
        if (edge.node === target) res.push(`${src}[${port}]`);
  }
  return res;
}

const names = ['IF Draw Design Paid','IF Draw Flow Item','Send Design Progress',
  'Send Draw Progress','Set Render Mode TEXT','Set Render Mode DRAW',
  'Send Design Done','Send Design Paywall CTA','IF Last Concept',
  'IF Concept Image Downloaded','Merge Design Download Context','Design Context Keeper',
  'Download Design Concept Image'];

for (const name of names) {
  const nd = nodes[name];
  const inc = incomingTo(name);
  const o = outs(name);
  const conds = nd?.parameters?.conditions?.conditions;
  const cSummary = conds ? conds.map(c=>`"${c.leftValue}" ${c.operator?.operation} "${c.rightValue}"`).join(' OR ') : '';
  const code = nd?.parameters?.jsCode || nd?.parameters?.functionCode || '';
  const text = nd?.parameters?.text?.value || nd?.parameters?.text || nd?.parameters?.message?.text || '';
  const markup = nd?.parameters?.replyMarkup || nd?.parameters?.inlineKeyboard || '';
  console.log(`\n=== ${name} [${nd?.type?.replace('n8n-nodes-base.','')||'?'}] ===`);
  console.log(`  IN: [${inc.join(', ')}]`);
  console.log(`  OUT: ${JSON.stringify(o)}`);
  if (cSummary) console.log(`  COND: ${cSummary}`);
  if (code) console.log(`  CODE: ${code.substring(0,300)}`);
  if (text) console.log(`  TEXT: ${String(text).substring(0,300)}`);
  if (markup && typeof markup === 'object') console.log(`  MARKUP: ${JSON.stringify(markup).substring(0,200)}`);
}

// Full Build Design Concepts code
console.log('\n\n=== Build Design Concepts (full) ===');
console.log(nodes['Build Design Concepts']?.parameters?.jsCode || '');
