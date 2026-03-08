'use strict';
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json','utf8'));
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

const checks = [
  // Sequential chain
  ['Session: Save photo connections', () => JSON.stringify(outs('Session: Save photo'))],
  ['IMG: Generating connections', () => JSON.stringify(outs('IMG: Generating'))],
  ['Send Card Progress connections', () => JSON.stringify(outs('Send Card Progress'))],
  ['IF has saved photo incoming', () => incomingTo('IF has saved photo').join(', ')],

  // IMG env vars
  ['IMG: Welcome file param', () => nodes['IMG: Welcome']?.parameters?.file?.substring(0, 50)],
  ['IMG: Generating file param', () => nodes['IMG: Generating']?.parameters?.file?.substring(0, 50)],

  // LLM prompt contains keyword instruction
  ['Build Strategy Body has keyword instruction', () => {
    const code = nodes['Build Strategy Body']?.parameters?.jsCode || '';
    return code.includes('поисковые фразы') ? 'YES' : 'NO';
  }],

  // Format Result has no word-splitting
  ['Format Result has no word-splitting', () => {
    const code = nodes['Format Result']?.parameters?.jsCode || '';
    return !code.includes("split(/\\s+/)") ? 'OK (no word split)' : 'FAIL (still splits)';
  }],

  // Send Concept Text Fallback uses prompt_text
  ['Send Concept Text Fallback text field', () => nodes['Send Concept Text Fallback']?.parameters?.text],

  // IF Last Concept condition
  ['IF Last Concept condition', () => {
    const c = nodes['IF Last Concept']?.parameters?.conditions?.conditions?.[0];
    return c ? `${c.leftValue} ${c.operator?.operation} ${c.rightValue}` : 'NOT SET';
  }],

  // Send Design Paywall CTA has button
  ['Send Design Paywall CTA has GENERATE_VISUALS_5 button', () => {
    const p = nodes['Send Design Paywall CTA']?.parameters;
    const btns = p?.inlineKeyboard?.rows?.[0]?.row?.buttons?.[0]?.additionalFields?.callback_data;
    return btns || 'NO BUTTON';
  }],

  // Session: Done → Send Design CTA
  ['Session: Done → Send Design CTA', () => JSON.stringify(outs('Session: Done'))],

  // Send Menu → Send Persistent Nav
  ['Send Menu → Send Persistent Nav', () => JSON.stringify(outs('Send Menu'))],
];

let allOk = true;
for (const [label, fn] of checks) {
  try {
    const val = fn();
    console.log(`✅ ${label}:\n   ${val}\n`);
  } catch(e) {
    console.log(`❌ ${label}: ERROR: ${e.message}\n`);
    allOk = false;
  }
}
console.log(allOk ? '\n✅ All checks passed' : '\n⚠️  Some checks need attention');
console.log(`Total nodes: ${wf.nodes.length}`);
