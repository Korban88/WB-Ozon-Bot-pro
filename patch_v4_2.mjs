/**
 * patch_v4_2.mjs — точечный фикс Send Concept Photo URL
 *
 * Проблема: в n8n Telegram node TypeVersion 1.2 операция sendPhoto (без binary)
 * читает параметр "fileId" (не "photo"). У нас было "photo" → нода игнорировала его
 * и отправляла запрос без photo → Telegram: "there is no photo in the request".
 *
 * Фикс: переименовать параметр "photo" → "fileId" в ноде Send Concept Photo URL.
 */

import { readFileSync, writeFileSync } from 'fs';

const INPUT  = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v4_1.json';
const OUTPUT = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v4_2.json';

const wf = JSON.parse(readFileSync(INPUT, 'utf8'));

const node = wf.nodes.find(n => n.name === 'Send Concept Photo URL');
if (!node) { console.error('Node not found'); process.exit(1); }

console.log('Before:', JSON.stringify(node.parameters, null, 2));

// Rename photo → fileId (correct parameter name for TypeVersion 1.2 sendPhoto without binary)
if (node.parameters.photo !== undefined) {
  node.parameters.fileId = node.parameters.photo;
  delete node.parameters.photo;
  console.log('\n✓ Renamed parameter: photo → fileId');
} else if (node.parameters.fileId !== undefined) {
  console.log('\n✓ fileId already set:', node.parameters.fileId);
} else {
  // Set it explicitly as fallback
  node.parameters.fileId = '={{$json.current_url || $json.ctx_image_url || $json.photo_url}}';
  console.log('\n✓ Added fileId parameter');
}

// Make sure binaryData is explicitly false
node.parameters.binaryData = false;

console.log('\nAfter:', JSON.stringify(node.parameters, null, 2));

wf.name = 'WB_Ozon_Card_Core_n8n_2.4.7_v4_2';
writeFileSync(OUTPUT, JSON.stringify(wf, null, 2), 'utf8');
console.log(`\n✓ Saved ${OUTPUT}`);
