/**
 * patch_v4_3.mjs — надёжная отправка фото через binary
 *
 * Проблема: Telegram не может скачать изображение с pollinations.ai / Together AI
 * (блокирует IP, редирект, нет доступа) → "there is no photo in the request"
 *
 * Решение:
 * 1. Добавить ноду "Download Concept Image" (HTTP Request GET → binary)
 * 2. "Send Concept Photo URL" переключить в binary mode (читает скачанный файл)
 * 3. Перевязать: Ensure Photo URL → Download Concept Image → Send Concept Photo URL
 */

import { readFileSync, writeFileSync } from 'fs';

const INPUT  = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v4_2.json';
const OUTPUT = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v4_3.json';

const wf = JSON.parse(readFileSync(INPUT, 'utf8'));

function findNode(name) {
  const n = wf.nodes.find(x => x.name === name);
  if (!n) throw new Error(`Node not found: "${name}"`);
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Add "Download Concept Image" — HTTP Request GET → binary
// ─────────────────────────────────────────────────────────────────────────────
const downloadNode = {
  id: 'download-concept-image-v43',
  name: 'Download Concept Image',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4,
  position: [7060, 760],
  parameters: {
    method: 'GET',
    url: '={{$json.current_url}}',
    options: {
      response: {
        response: {
          responseFormat: 'file',
          outputPropertyName: 'data',
        },
      },
    },
  },
  onError: 'continueErrorOutput',  // don't stop if one image fails
};

wf.nodes.push(downloadNode);
console.log('✓ Added "Download Concept Image" node');

// ─────────────────────────────────────────────────────────────────────────────
// 2. Update "Send Concept Photo URL" → binary mode
// ─────────────────────────────────────────────────────────────────────────────
const sendNode = findNode('Send Concept Photo URL');
sendNode.position = [7320, 760];

sendNode.parameters = {
  resource: 'message',
  operation: 'sendPhoto',
  chatId: sendNode.parameters.chatId ||
    "={{$json.ctx_chat_id || $json.chat_id || $('Normalize').first().json.chat_id}}",
  binaryData: true,
  binaryPropertyName: 'data',
  additionalFields: {
    caption: "={{$json.caption || ''}}",
    parse_mode: 'HTML',
  },
};

// Keep existing credentials
console.log('✓ Updated "Send Concept Photo URL" to binary mode');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Rewire connections
// ─────────────────────────────────────────────────────────────────────────────
const conns = wf.connections;

// Ensure Photo URL → Download Concept Image (was → Send Concept Photo URL)
if (conns['Ensure Photo URL']) {
  conns['Ensure Photo URL'].main = conns['Ensure Photo URL'].main.map(branch =>
    branch.map(edge =>
      edge.node === 'Send Concept Photo URL'
        ? { ...edge, node: 'Download Concept Image' }
        : edge
    )
  );
  console.log('✓ Rewired: Ensure Photo URL → Download Concept Image');
}

// Download Concept Image → Send Concept Photo URL (output 0 = success)
conns['Download Concept Image'] = {
  main: [
    [{ node: 'Send Concept Photo URL', type: 'main', index: 0 }],  // success
    [],  // error output (continueErrorOutput) — leave unconnected, item drops
  ],
};
console.log('✓ Wired: Download Concept Image → Send Concept Photo URL');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Reposition Ensure Photo URL to make space
// ─────────────────────────────────────────────────────────────────────────────
const ensureNode = findNode('Ensure Photo URL');
ensureNode.position = [6800, 760];

// ─────────────────────────────────────────────────────────────────────────────
// 5. Write output
// ─────────────────────────────────────────────────────────────────────────────
wf.name = 'WB_Ozon_Card_Core_n8n_2.4.7_v4_3';
writeFileSync(OUTPUT, JSON.stringify(wf, null, 2), 'utf8');

console.log(`\n✓ Saved ${OUTPUT} (${wf.nodes.length} nodes)`);
console.log('\nFlow:');
console.log('  Ensure Photo URL → Download Concept Image (HTTP GET binary) → Send Concept Photo URL (binary)');
