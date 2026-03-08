'use strict';
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json','utf8'));
const nodes = {};
for (const n of wf.nodes) nodes[n.name] = n;
const C = wf.connections;
function outs(name) { return C[name] ? C[name].main.map(arr => arr.map(c => c.node)) : []; }

// IF Render Mode condition
const irm = nodes['IF Render Mode'];
console.log('IF Render Mode conditions:', JSON.stringify(irm?.parameters?.conditions?.conditions, null, 2));
console.log('IF Render Mode OUT:', JSON.stringify(outs('IF Render Mode')));

// Send Design Paywall CTA - FULL params
const sdpc = nodes['Send Design Paywall CTA'];
console.log('\nSend Design Paywall CTA FULL params:', JSON.stringify(sdpc?.parameters, null, 2));

// Send Design Done - FULL params
const sdd = nodes['Send Design Done'];
console.log('\nSend Design Done FULL params:', JSON.stringify(sdd?.parameters, null, 2));

// Build Concept Fallback Text - what does it output?
const bcft = nodes['Build Concept Fallback Text'];
const code = bcft?.parameters?.jsCode || bcft?.parameters?.functionCode || '';
console.log('\nBuild Concept Fallback Text code:', code.substring(0, 1000));
console.log('Build Concept Fallback Text OUT:', JSON.stringify(outs('Build Concept Fallback Text')));

// Send Concept Text Fallback - FULL params
const sctf = nodes['Send Concept Text Fallback'];
console.log('\nSend Concept Text Fallback FULL params:', JSON.stringify(sctf?.parameters, null, 2).substring(0, 1500));
console.log('Send Concept Text Fallback OUT:', JSON.stringify(outs('Send Concept Text Fallback')));

// IMG nodes - FULL params
for (const n of wf.nodes.filter(nd => nd.name.startsWith('IMG:'))) {
  console.log(`\n${n.name} FULL params:`, JSON.stringify(n.parameters, null, 2).substring(0, 600));
  console.log(`${n.name} OUT:`, JSON.stringify(outs(n.name)));
}
