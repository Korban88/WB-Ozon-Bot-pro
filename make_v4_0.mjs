import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join } from 'path';

const BASE = '.';
const ARCHIVE = join(BASE, 'archive');

// ── 1. Create v4_0 from v3_9 with the OpenRouter fix ──────────────────────
const src = JSON.parse(readFileSync('WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_9.json', 'utf8'));

const BUILD_NORMALIZE_ID = '61a47940-d960-4e89-98d4-e642c8a49544';
const node = src.nodes.find(n => n.id === BUILD_NORMALIZE_ID);
if (!node) { console.error('Build Normalize Body not found'); process.exit(1); }

node.parameters.jsCode = `const j = $json;
const marketplace = (j.marketplace || '').toString().trim();
const category = (j.category || '').toString().trim();
const title = (j.title || '').toString().trim();
const benefits = (j.benefits || '').toString().trim();
const clarifications_answers = (j.clarifications_answers || '').toString().trim();

// Limit base64 to ~500 KB original to avoid OpenRouter request size errors
const rawBase64 = (j.image_base64_clean || '').toString().trim();
const MAX_B64 = 680000;
const imageBase64 = rawBase64.length > MAX_B64 ? rawBase64.slice(0, MAX_B64) : rawBase64;

const system = \`
Ты анализируешь карточку товара для WB/Ozon. Возвращай только факты из входных данных и фото.
Нельзя выдумывать характеристики, материалы, объёмы, мощность, комплектацию и любые числовые параметры.
Если данных не хватает для безопасной генерации карточки, ставь need_clarifications=true и задай до 5 коротких вопросов.
Верни строго JSON-объект.
\`;

const userData = {
  marketplace, category, title, benefits, clarifications_answers,
  image_present: !!imageBase64
};

const prompt = \`Верни JSON структуры:
{
  "need_clarifications": boolean,
  "clarifications_questions": string[],
  "facts": string[],
  "unknowns": string[]
}

Данные:
\${JSON.stringify(userData, null, 2)}\`;

// FIX v4.0: response_format:json_object is incompatible with vision (image_url) on OpenRouter
// — causes 500 Internal Server Error. Use it only when no image is present.
const body = {
  model: $env.OPENROUTER_TEXT_MODEL || 'openai/gpt-4o-mini',
  temperature: 0.2,
  ...(imageBase64 ? {} : { response_format: { type: 'json_object' } }),
  messages: [
    { role: 'system', content: system.trim() },
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...(imageBase64 ? [{ type: 'image_url', image_url: { url: \`data:image/jpeg;base64,\${imageBase64}\` } }] : []),
      ],
    },
  ],
};

return { json: { ...j, openrouter_body: body } };`;

// Update workflow name
src.name = 'WB_Ozon_Card_Core_n8n_2.4.7_v4_0';

const OUTPUT = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v4_0.json';
writeFileSync(OUTPUT, JSON.stringify(src, null, 2), 'utf8');
console.log(`✓ Created ${OUTPUT} (${src.nodes.length} nodes)`);

// ── 2. Archive all old versions ────────────────────────────────────────────
if (!existsSync(ARCHIVE)) mkdirSync(ARCHIVE);

const toArchive = [
  'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_1.json',
  'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_2.json',
  'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_3.json',
  'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_4.json',
  'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_5.json',
  'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_6.json',
  'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json',
  'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7_patched.json',
  'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json',
  'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_9.json',
];

for (const f of toArchive) {
  if (existsSync(join(BASE, f))) {
    renameSync(join(BASE, f), join(ARCHIVE, f));
    console.log(`  archived: ${f}`);
  }
}

console.log('\nDone. Repository now contains only v4_0 as the active workflow.');
