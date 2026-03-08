'use strict';
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json','utf8'));
const nodes = {};
for (const n of wf.nodes) nodes[n.name] = n;
const C = wf.connections;
function outs(name) { return C[name] ? C[name].main.map(arr => arr.map(c => c.node)) : []; }

// Set Render Mode TEXT/DRAW params
['Set Render Mode TEXT','Set Render Mode DRAW'].forEach(name => {
  const nd = nodes[name];
  console.log(`\n=== ${name} ===`);
  console.log(JSON.stringify(nd?.parameters, null, 2));
  console.log('OUT:', JSON.stringify(outs(name)));
});

// Build Concept Fallback Text FULL code
console.log('\n=== Build Concept Fallback Text (FULL) ===');
console.log(nodes['Build Concept Fallback Text']?.parameters?.jsCode || '');

// What does Session: Save photo connect to?
console.log('\n=== Session: Save photo connections ===');
console.log(JSON.stringify(C['Session: Save photo']?.main, null, 2));

// Format Result full code (already seen but need chars 1500-3000)
const fr = nodes['Format Result'];
const frcode = fr?.parameters?.jsCode || '';
console.log('\n=== Format Result code chars 1000-3000 ===');
console.log(frcode.substring(1000, 3000));
