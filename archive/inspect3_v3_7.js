'use strict';
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json','utf8'));
const nodes = {};
for (const n of wf.nodes) nodes[n.name] = n;
const C = wf.connections;

function incomingTo(target) {
  const res = [];
  for (const [src, con] of Object.entries(C)) {
    for (let port = 0; port < (con.main || []).length; port++) {
      for (const edge of (con.main[port] || [])) {
        if (edge.node === target) res.push(`${src}[port${port}]`);
      }
    }
  }
  return res;
}

// Trace generation pipeline
const pipeline = ['Session: Save photo','IF has saved photo','TG: GetFile','Extract from File',
  'Sanitize base64','IF Sanitize Error','Build Normalize Body','GEN: OpenRouter Normalize',
  'Parse Normalize','IF Need Clarifications','Compose item','Parse Benefits (Deterministic)',
  'Build Strategy Body','GEN: OpenRouter Strategy','Parse Strategy','Format Result',
  'Split Result Parts','Send Result','IF Last Part','Session: Done','Send Design CTA',
  'IMG: Generating','Send Card Progress'];

console.log('=== Pipeline connections ===');
for (const t of pipeline) {
  const inc = incomingTo(t);
  const out = C[t] ? C[t].main.map(arr => arr.map(c => c.node)) : [];
  const nd = nodes[t];
  const type = nd ? nd.type.replace('n8n-nodes-base.','') : 'MISSING';
  console.log(`${t} [${type}]: IN=[${inc.join(', ')}] OUT=${JSON.stringify(out)}`);
}

// IF Generate conditions
const ifg = nodes['IF Generate'];
if (ifg) console.log('\nIF Generate conditions:', JSON.stringify(ifg.parameters?.conditions?.conditions, null, 2));

// Back Router
const br = nodes['Back Router'];
if (br) {
  const code = br.parameters?.jsCode || br.parameters?.functionCode || '';
  console.log('\n=== Back Router ===');
  console.log(code.substring(0, 2000));
}
