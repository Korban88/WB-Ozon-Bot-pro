// Восстанавливаем правильные v3_8 и v3_9 из бэкапа v3_9
// v3_8 = v3_9 backup минус нод "GEN: Together AI Image"
// v3_9 = v3_9 backup (уже готов)
import { readFileSync, writeFileSync } from 'fs';

const BASE   = 'C:\\Claude Code Projects\\WB-Ozon-Bot-pro\\';
const BACKUP = 'C:\\tmp\\v3_9_backup.json';

const v9bk = JSON.parse(readFileSync(BACKUP, 'utf8'));
console.log('Backup v3_9 name:', v9bk.name);
console.log('Backup v3_9 nodes:', v9bk.nodes.length);

const genNode = v9bk.nodes.find(n => n.name === 'GEN: Together AI Image');
console.log('GEN node id:', genNode?.id);

// ── Reconstruct v3_8 (= v3_9 minus GEN node, with original connections) ──────
const v8 = JSON.parse(JSON.stringify(v9bk)); // deep copy
// Remove GEN node
v8.nodes = v8.nodes.filter(n => n.name !== 'GEN: Together AI Image');
// Restore original connection: Build Design Concepts → IF Draw Flow Item
v8.connections['Build Design Concepts'] = {
  main: [[{ node: 'IF Draw Flow Item', type: 'main', index: 0 }]],
};
// Remove GEN connections
delete v8.connections['GEN: Together AI Image'];
// Restore name
v8.name = 'WB/Ozon Card Core n8n 2.4.7 FIXED v3.8';

// ── v3_9 = backup as-is ───────────────────────────────────────────────────────
// Just copy backup

writeFileSync(BASE + 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json',
              JSON.stringify(v8, null, 2), 'utf8');
writeFileSync(BASE + 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_9.json',
              JSON.stringify(v9bk, null, 2), 'utf8');

// Verify
const bdc8 = v8.nodes.find(n => n.name === 'Build Design Concepts');
const bdc9 = v9bk.nodes.find(n => n.name === 'Build Design Concepts');
console.log('\n✓ v3_8 saved:', v8.name, '| nodes:', v8.nodes.length,
            '| BDC has image_prompt:', bdc8.parameters.jsCode.includes('image_prompt'));
console.log('✓ v3_9 saved:', v9bk.name, '| nodes:', v9bk.nodes.length,
            '| GEN node:', !!v9bk.nodes.find(n => n.name === 'GEN: Together AI Image'),
            '| BDC has image_prompt:', bdc9.parameters.jsCode.includes('image_prompt'));

// Verify chain in v3_9
const bdc_conn = v9bk.connections['Build Design Concepts']?.main?.[0]?.[0]?.node;
const gen_conn = v9bk.connections['GEN: Together AI Image']?.main?.[0]?.[0]?.node;
console.log('\nChain v3_9: Build Design Concepts →', bdc_conn, '→', gen_conn);
