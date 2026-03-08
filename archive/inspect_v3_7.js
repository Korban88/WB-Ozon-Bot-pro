'use strict';
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json','utf8'));
const nodes = {};
for (const n of wf.nodes) nodes[n.name] = n;
const C = wf.connections;

const names = ['Format Result','Split Result Parts','Send Result','Send Card Progress',
  'Build Design Concepts','IF Last Concept','Send Design CTA','IF Design Concept',
  'Send Design Progress','Session: Done'];

for (const name of names) {
  const nd = nodes[name];
  if (!nd) { console.log(name + ': NOT FOUND\n'); continue; }
  const code = nd.parameters && (nd.parameters.jsCode || nd.parameters.functionCode
    || (nd.parameters.text && nd.parameters.text.value)
    || (nd.parameters.message && nd.parameters.message.text)
    || nd.parameters.text
    || '(no text/code)');
  console.log('=== ' + name + ' [' + nd.type + '] ===');
  const s = typeof code === 'object' ? JSON.stringify(code) : String(code);
  console.log(s.substring(0, 2500));
  // connections out
  const con = C[name];
  if (con) console.log('  OUT:', JSON.stringify(con.main.map(arr => arr.map(c => c.node))));
  console.log('');
}
