// Patch v3_9: make IF Last Concept condition robust
// TEXT mode: check is_last_concept via item pairing (Build Concept Fallback Text)
// DRAW mode: check $json.caption contains "5/5" (Telegram photo response caption)
// Both conditions with OR — at least one will fire correctly

import { readFileSync, writeFileSync } from 'fs';

const FILE = 'C:\\Claude Code Projects\\WB-Ozon-Bot-pro\\WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_9.json';
const wf = JSON.parse(readFileSync(FILE, 'utf8'));

const ilc = wf.nodes.find(n => n.name === 'IF Last Concept');
if (!ilc) { console.error('IF Last Concept not found!'); process.exit(1); }

console.log('Before:', JSON.stringify(ilc.parameters.conditions, null, 2));

// Replace with robust OR-based condition
ilc.parameters.conditions = {
  options: {
    caseSensitive: false,
    leftValue: '',
    typeValidation: 'loose',
    version: 2,
  },
  conditions: [
    {
      // TEXT mode: item pairing reads is_last_concept from Build Concept Fallback Text
      // Try-catch handles DRAW mode where that node wasn't in the execution path
      id: 'check-is-last-via-item-pairing',
      leftValue: "={{ (() => { try { return !!$('Build Concept Fallback Text').item?.json?.is_last_concept; } catch(e) { return false; } })() }}",
      rightValue: true,
      operator: {
        type: 'boolean',
        operation: 'equals',
      },
    },
    {
      // DRAW mode: Telegram sendPhoto response has $json.caption = "Концепт 5/5 — ..."
      // TEXT mode fallback: Telegram sendMessage response has $json.text = "КОНЦЕПТ 5/5 — ..."
      id: 'check-5-5-in-telegram-response',
      leftValue: "={{ ($json.caption || $json.text || '').toString() }}",
      rightValue: '5/5',
      operator: {
        type: 'string',
        operation: 'contains',
      },
    },
  ],
  combinator: 'or',
};

console.log('\nAfter:', JSON.stringify(ilc.parameters.conditions, null, 2));

writeFileSync(FILE, JSON.stringify(wf, null, 2), 'utf8');
console.log('\n✓ IF Last Concept patched with OR conditions');
console.log('  Condition 1: item pairing → is_last_concept (TEXT mode)');
console.log('  Condition 2: caption/text contains "5/5" (DRAW mode + fallback)');
