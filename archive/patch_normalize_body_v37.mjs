import { readFileSync, writeFileSync } from 'fs';

const INPUT = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json';
const OUTPUT = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7_patched.json';

const wf = JSON.parse(readFileSync(INPUT, 'utf8'));

const targetId = '61a47940-d960-4e89-98d4-e642c8a49544'; // Build Normalize Body
const node = wf.nodes.find(n => n.id === targetId);

if (!node) {
  console.error('Node "Build Normalize Body" not found!');
  process.exit(1);
}

console.log('Found node:', node.name);

// New fixed jsCode:
// 1. response_format removed when image present (incompatible with vision on most OpenRouter models)
// 2. image truncated to max 500KB base64 to avoid request size errors
const newCode = `const j = $json;
const marketplace = (j.marketplace || '').toString().trim();
const category = (j.category || '').toString().trim();
const title = (j.title || '').toString().trim();
const benefits = (j.benefits || '').toString().trim();
const clarifications_answers = (j.clarifications_answers || '').toString().trim();

// Limit base64 to ~500KB to avoid OpenRouter request size errors
const rawBase64 = (j.image_base64_clean || '').toString().trim();
const MAX_B64 = 680000; // ~500KB original image
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

// IMPORTANT: response_format: json_object is INCOMPATIBLE with vision (image_url) requests
// on most OpenRouter models — causes 500 Internal Server Error.
// Use response_format only when there is NO image.
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

node.parameters.jsCode = newCode;

writeFileSync(OUTPUT, JSON.stringify(wf, null, 2), 'utf8');
console.log(`\nPatched! Saved to: ${OUTPUT}`);
console.log('\nChanges:');
console.log('  1. response_format: json_object removed when image is present (vision incompatibility fix)');
console.log('  2. base64 image truncated to max ~500KB to avoid request size errors');
