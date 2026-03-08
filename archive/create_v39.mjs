import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

const DIR = 'C:\\Claude Code Projects\\WB-Ozon-Bot-pro\\';
const SRC = DIR + 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json';
const DST = DIR + 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_9.json';

const wf = JSON.parse(readFileSync(SRC, 'utf8'));

// ─── JS-код нового нода ────────────────────────────────────────────────────────
// Вставляется МЕЖДУ "Build Design Concepts" и "IF Draw Flow Item".
// Берёт image_prompt (уже готовый английский промпт) из Build Design Concepts,
// вызывает Together AI FLUX.1-schnell-Free, обновляет photo_url / current_url.
// При ошибке оставляет исходный pollinations URL — остальная цепочка не меняется.

const TOGETHER_JS = `// GEN: Together AI Image
// Вызывает Together AI (FLUX.1-schnell-Free) для каждого концепта.
// Требует: переменная окружения TOGETHER_API_KEY в n8n Settings → Variables.
// Если ключ не задан или запрос упал — оставляет pollinations URL без изменений.

const API_KEY = (typeof $env !== 'undefined' ? ($env.TOGETHER_API_KEY || '') : '').toString().trim();
const MODEL   = 'black-forest-labs/FLUX.1-schnell-Free';

const items = $input.all();
const out   = [];

for (const item of items) {
  const j = item.json;
  let togetherUrl = '';
  let genError    = '';

  // image_prompt — готовый английский промпт из Build Design Concepts
  // promptEn — альтернативное поле (другие версии workflow)
  const basePrompt = String(j.image_prompt || j.promptEn || '').trim();
  const title      = String(j.title || 'product').slice(0, 80);
  const styleEn    = String(j.styleEn || j.style || 'minimalist');
  const market     = String(j.marketplace || '').toUpperCase().includes('OZON') ? 'Ozon' : 'Wildberries';

  // Используем готовый промпт; если пустой — собираем из полей
  const prompt = basePrompt ||
    [styleEn + ' product card for ' + title, market,
     'ecommerce product card, professional photography, 4k, no watermarks'].join(', ');

  if (API_KEY) {
    try {
      const resp = await $helpers.httpRequest({
        method: 'POST',
        url:    'https://api.together.xyz/v1/images/generations',
        headers: {
          'Authorization': 'Bearer ' + API_KEY,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          model:           MODEL,
          prompt:          prompt.slice(0, 1500),
          width:           1024,
          height:          1024,
          steps:           4,
          n:               1,
          response_format: 'url',
        }),
      });

      const url = resp && resp.data && resp.data[0] && resp.data[0].url
                    ? resp.data[0].url : '';
      if (url) {
        togetherUrl = url;
      } else {
        genError = 'Together AI: нет URL в ответе — ' + JSON.stringify(resp || {}).slice(0, 200);
      }
    } catch (e) {
      genError = String((e && e.message) ? e.message : e).slice(0, 300);
    }
  } else {
    genError = 'TOGETHER_API_KEY не задан в переменных окружения n8n';
  }

  // Together AI URL или исходный pollinations URL (fallback)
  const photo_url = togetherUrl || j.photo_url || '';

  out.push({
    json: {
      ...j,
      // Обновляем все поля, которые используются в Prepare Image URLs
      photo_url,
      image_url:     photo_url,
      current_url:   photo_url,
      ctx_image_url: photo_url,
      // Диагностика
      together_url:   togetherUrl,
      together_error: genError,
      gen_provider:   togetherUrl ? 'together_ai' : 'pollinations_fallback',
    },
  });
}

return out;
`;

// ─── Новый нод ─────────────────────────────────────────────────────────────────
const NEW_ID = randomUUID();
const newNode = {
  id:          NEW_ID,
  name:        'GEN: Together AI Image',
  type:        'n8n-nodes-base.code',
  typeVersion: 2,
  // Позиция: между Build Design Concepts (1680,520) и IF Draw Flow Item (1860,520)
  // Чуть выше — чтобы нод был визуально читаемым отдельно
  position:    [1775, 410],
  parameters: {
    mode:   'runOnceForAllItems',
    jsCode: TOGETHER_JS,
  },
};

wf.nodes.push(newNode);

// ─── Связи: один хирургический разрез ────────────────────────────────────────
// БЫЛО:   Build Design Concepts ──→ IF Draw Flow Item
// СТАЛО:  Build Design Concepts ──→ GEN: Together AI Image ──→ IF Draw Flow Item
wf.connections['Build Design Concepts'] = {
  main: [[{ node: 'GEN: Together AI Image', type: 'main', index: 0 }]],
};
wf.connections['GEN: Together AI Image'] = {
  main: [[{ node: 'IF Draw Flow Item', type: 'main', index: 0 }]],
};

// ─── Имя ──────────────────────────────────────────────────────────────────────
wf.name = 'WB/Ozon Card Core n8n 2.4.7 FIX (v3.9 Together AI)';

// ─── Сохранение ───────────────────────────────────────────────────────────────
writeFileSync(DST, JSON.stringify(wf, null, 2), 'utf8');
console.log('v3_9 saved →', DST);
console.log('New node id:', NEW_ID);
console.log('Chain: Build Design Concepts → GEN: Together AI Image → IF Draw Flow Item');
console.log('Total nodes:', wf.nodes.length);
