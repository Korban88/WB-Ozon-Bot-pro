const fs = require('fs');
const FILE = 'C:/Claude Code Projects/WB-Ozon-Bot-pro/WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const nodes = data.nodes;

// Send Concept Text Fallback
const sctf = nodes.find(n => n.name === 'Send Concept Text Fallback');
console.log('=== Send Concept Text Fallback ===');
console.log('text:', sctf.parameters.text);
console.log('chatId:', sctf.parameters.chatId);

// Send Design Concept Photo Binary
const sdcpb = nodes.find(n => n.name === 'Send Design Concept Photo Binary');
console.log('\n=== Send Design Concept Photo Binary ===');
console.log(JSON.stringify(sdcpb.parameters, null, 2));

// IF Last Concept current
const ifLast = nodes.find(n => n.name === 'IF Last Concept');
console.log('\n=== IF Last Concept CURRENT ===');
console.log(JSON.stringify(ifLast.parameters.conditions, null, 2));

// IF Render Mode current
const ifRender = nodes.find(n => n.name === 'IF Render Mode');
console.log('\n=== IF Render Mode CURRENT ===');
console.log(JSON.stringify(ifRender.parameters.conditions, null, 2));

// Build Design Concepts - first few lines of prompt_text format
const bdc = nodes.find(n => n.name === 'Build Design Concepts');
// Find prompt_text line
const lines = bdc.parameters.jsCode.split('\n');
const ptLine = lines.find(l => l.includes('КОНЦЕПТ'));
console.log('\nBuild Design Concepts prompt_text first line format:', ptLine ? ptLine.trim() : 'not found');
