'use strict';
const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json','utf8'));
const nodes = {};
for (const n of wf.nodes) nodes[n.name] = n;
const C = wf.connections;

function outs(name) {
  return C[name] ? C[name].main.map(arr => arr.map(c => c.node)) : [];
}
function getCode(nd) {
  return nd.parameters && (nd.parameters.jsCode || nd.parameters.functionCode || '');
}
function getText(nd) {
  return nd.parameters && (nd.parameters.text?.value || nd.parameters.text || nd.parameters.message?.text || '');
}

// Routing chain
const routingNodes = ['Normalize','IF Is callback','Answer Query a callback','Edit Fields',
  'Edit Fields1','IF Back Command','IF Stage Generating','IF Clarification text is command',
  'IF stage == clarifications','IF Start','IF Help','IF Generate','IF Design Concept',
  'IF Design Feature Enabled','IF Marketplace chosen','IF MP_WB','IF MP_OZON',
  'IF Category chosen','IF Title input','IF Benefits input','IF Photo received'];

console.log('=== Routing chain ===');
for (const name of routingNodes) {
  const nd = nodes[name];
  const o = outs(name);
  const conds = nd?.parameters?.conditions?.conditions;
  if (conds && conds.length) {
    const summary = conds.map(c => `"${c.leftValue}" ${c.operator?.operation} "${c.rightValue}"`).join(' OR ');
    console.log(`${name}: cond=[${summary}] OUT=${JSON.stringify(o)}`);
  } else {
    console.log(`${name}: OUT=${JSON.stringify(o)}`);
  }
}

// Normalize code
console.log('\n=== Normalize ===');
console.log(getCode(nodes['Normalize']).substring(0, 3000));

// Edit Fields (callback)
console.log('\n=== Edit Fields ===');
const ef = nodes['Edit Fields'];
console.log(JSON.stringify(ef?.parameters, null, 2).substring(0, 1500));

// IF Design Feature Enabled
console.log('\n=== IF Design Feature Enabled ===');
const idfe = nodes['IF Design Feature Enabled'];
console.log('conds:', JSON.stringify(idfe?.parameters?.conditions?.conditions, null, 2));
console.log('OUT:', JSON.stringify(outs('IF Design Feature Enabled')));
