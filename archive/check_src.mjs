import { readFileSync } from 'fs';
const BASE = 'C:\\Claude Code Projects\\WB-Ozon-Bot-pro\\';

const v8 = JSON.parse(readFileSync(BASE + 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json', 'utf8'));
const bdc = v8.nodes.find(n => n.name === 'Build Design Concepts');
const hasImagePrompt = bdc.parameters.jsCode.includes('image_prompt');
console.log('v3_8 name:', v8.name);
console.log('nodes:', v8.nodes.length);
console.log('BDC has image_prompt:', hasImagePrompt);

// Check current v3_9 in repo
const v9 = JSON.parse(readFileSync(BASE + 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_9.json', 'utf8'));
const genNode = v9.nodes.find(n => n.name === 'GEN: Together AI Image');
const bdcV9 = v9.nodes.find(n => n.name === 'Build Design Concepts');
const hasImagePromptV9 = bdcV9.parameters.jsCode.includes('image_prompt');
console.log('\nv3_9 in repo name:', v9.name);
console.log('GEN node exists:', !!genNode);
console.log('v3_9 BDC has image_prompt:', hasImagePromptV9);
console.log('v3_9 total nodes:', v9.nodes.length);
