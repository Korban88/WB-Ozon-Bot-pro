'use strict';
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json','utf8'));
const nodes = {};
for (const n of wf.nodes) nodes[n.name] = n;
const C = wf.connections;

// Show all incoming connections to a node
function incomingTo(target) {
  const res = [];
  for (const [src, con] of Object.entries(C)) {
    for (let port = 0; port < (con.main || []).length; port++) {
      for (const edge of (con.main[port] || [])) {
        if (edge.node === target) res.push(`${src}[${port}]`);
      }
    }
  }
  return res;
}

const targets = ['Send Card Progress','Build Strategy Body','GEN: OpenRouter Strategy',
  'IF Last Part','Session: Done','Send Design CTA','IF Design Concept','IF Last Concept',
  'IF Render Mode','Send Design Done','Build Design Concepts','IMG: Generating',
  'Parse Benefits (Deterministic)'];

for (const t of targets) {
  const nd = nodes[t];
  const inc = incomingTo(t);
  const out = C[t] ? C[t].main.map(arr => arr.map(c => c.node)) : [];
  console.log(`${t}: IN=[${inc.join(', ')}] OUT=${JSON.stringify(out)}`);
}

// Also show IF Last Concept conditions
const ilc = nodes['IF Last Concept'];
if (ilc) {
  console.log('\nIF Last Concept conditions:', JSON.stringify(ilc.parameters?.conditions?.conditions, null, 2));
}

// IF Design Concept conditions
const idc = nodes['IF Design Concept'];
if (idc) {
  console.log('\nIF Design Concept conditions:', JSON.stringify(idc.parameters?.conditions?.conditions, null, 2));
}

// Send Design CTA - full params
const sdcta = nodes['Send Design CTA'];
if (sdcta) {
  console.log('\nSend Design CTA params:', JSON.stringify(sdcta.parameters, null, 2).substring(0, 2000));
}

// Format Result - full code
const fr = nodes['Format Result'];
if (fr) {
  console.log('\n=== Format Result FULL ===');
  console.log(fr.parameters.jsCode || fr.parameters.functionCode || '');
}
