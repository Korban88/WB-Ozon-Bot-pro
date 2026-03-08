'use strict';
/**
 * fix_v3_8.js — patches v3_7 → v3_8
 *
 * Fixes:
 *  1. Sequential Send Card Progress (IMG: Generating → Send Card Progress → IF has saved photo)
 *  2. LLM system prompt: emoji, real keywords, no fake specs
 *  3. Format Result: emoji formatting, no word-splitting fallback for keywords, better specs filter
 *  4. Send Concept Text Fallback: use prompt_text (from Build Design Concepts) not fallback_text
 *  5. IMG env var names: IMG_WELCOME not IMG_IMG__WELCOME
 *  6. continueOnFail on all IMG nodes
 *  7. Visual button flow validation
 */

const fs = require('fs');
const SRC = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json';
const DST = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json';

const wf = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const nodes = {};
for (const n of wf.nodes) nodes[n.name] = n;
const C = wf.connections;

// ─── helpers ──────────────────────────────────────────────────────────────────
function edge(node) { return { node, type: 'main', index: 0 }; }
function log(msg) { console.log('[FIX] ' + msg); }
function must(name) { if (!nodes[name]) throw new Error('Node not found: ' + name); return nodes[name]; }

// ─── FIX 1: Sequential chain: Session: Save photo → IMG: Generating → Send Card Progress → IF has saved photo
//   Remove the parallel fork; make it a linear chain so progress arrives before the LLM call
{
  // Session: Save photo → only IMG: Generating
  C['Session: Save photo'] = { main: [[edge('IMG: Generating')]] };

  // IMG: Generating → Send Card Progress
  must('IMG: Generating').parameters.additionalFields = { appendAttribution: false };
  must('IMG: Generating').onError = 'continueErrorOutput'; // continueOnFail
  C['IMG: Generating'] = { main: [[edge('Send Card Progress')], [edge('Send Card Progress')]] };
  // Note: both true and error output go to Send Card Progress so message always sends

  // Send Card Progress → IF has saved photo
  must('Send Card Progress').onError = 'continueErrorOutput';
  C['Send Card Progress'] = { main: [[edge('IF has saved photo')], [edge('IF has saved photo')]] };

  log('Sequential chain: Session:Save photo → IMG:Generating → Send Card Progress → IF has saved photo');
}

// ─── FIX 2: continueOnFail on all IMG nodes + fix env var names
{
  const envMap = {
    'IMG: Welcome':      ['IMG_WELCOME',       'https://image.pollinations.ai/p/futuristic%20AI%20ecommerce%20bot%20holographic%20cards%20WB%20OZON%20dark%20premium%20ultra%20quality?model=flux&width=1200&height=600&seed=1001&nologo=true&enhance=true'],
    'IMG: Help':         ['IMG_HELP',          'https://image.pollinations.ai/p/5-step%20workflow%20glowing%20nodes%20dark%20blue%20neon%20cyan%20infographic%20futuristic?model=flux&width=1200&height=600&seed=1002&nologo=true&enhance=true'],
    'IMG: Marketplace':  ['IMG_MARKETPLACE',   'https://image.pollinations.ai/p/WB%20Wildberries%20OZON%20marketplace%20abstract%20premium%20duotone%20coral%20purple%20dark?model=flux&width=1200&height=600&seed=1003&nologo=true&enhance=true'],
    'IMG: Category':     ['IMG_CATEGORY',      'https://image.pollinations.ai/p/holographic%20category%20icons%20grid%20floating%20dark%20iridescent%20premium?model=flux&width=1200&height=600&seed=1004&nologo=true&enhance=true'],
    'IMG: Title':        ['IMG_TITLE',         'https://image.pollinations.ai/p/SEO%20product%20naming%20glowing%20text%20cursor%20dark%20premium%20interface%20neon%20blue?model=flux&width=1200&height=600&seed=1005&nologo=true&enhance=true'],
    'IMG: Benefits':     ['IMG_BENEFITS',      'https://image.pollinations.ai/p/structured%20benefits%20checklist%20neon%20green%20checkmarks%20dark%20premium%20UI?model=flux&width=1200&height=600&seed=1006&nologo=true&enhance=true'],
    'IMG: Photo Upload': ['IMG_PHOTO_UPLOAD',  'https://image.pollinations.ai/p/AR%20camera%20scanning%20frame%20product%20blue%20neon%20scan%20lines%20dark%20tech?model=flux&width=1200&height=600&seed=1007&nologo=true&enhance=true'],
    'IMG: Generating':   ['IMG_GENERATING',    'https://image.pollinations.ai/p/neural%20network%20AI%20processing%20glowing%20nodes%20dark%20space%20data%20streams?model=flux&width=1200&height=600&seed=1008&nologo=true&enhance=true'],
  };
  for (const [name, [envKey, fallback]] of Object.entries(envMap)) {
    const nd = nodes[name];
    if (!nd) { console.warn('WARN: ' + name + ' not found'); continue; }
    nd.parameters.file = `={{ $env['${envKey}'] || '${fallback}' }}`;
    nd.onError = 'continueErrorOutput';
    log(`${name}: env var = ${envKey}, continueOnFail set`);
  }
}

// ─── FIX 3: LLM system prompt — emoji, real keywords, no fake specs
{
  const bsb = must('Build Strategy Body');
  bsb.parameters.jsCode = `
const j = $json;
const normalized = j.normalized || {};
const b64 = (j.image_base64_clean || '').toString().trim();

const inputData = {
  marketplace: (j.marketplace || '').toString().trim(),
  category: (j.category || '').toString().trim(),
  title: (j.title || '').toString().trim(),
  benefits: (j.benefits || '').toString().trim(),
  clarifications_answers: (j.clarifications_answers || '').toString().trim(),
  facts: Array.isArray(normalized.facts) ? normalized.facts : [],
  unknowns: Array.isArray(normalized.unknowns) ? normalized.unknowns : [],
};

const system = \`
Ты — топовый e-commerce копирайтер и продуктовый маркетолог для WB и Ozon.

СТРОГИЕ ПРАВИЛА:
1. Используй ТОЛЬКО факты из входных данных и фото. Никогда не придумывай: мощность, вес, объём, размеры, материал, цвет — если они не упомянуты пользователем или не видны на фото.
2. Если параметр неизвестен — вставь его в specs с value "не указано" и добавь в service.warnings.
3. keywords — это РЕАЛЬНЫЕ поисковые фразы из 2–4 слов, которые покупатели вводят на WB/Ozon. Пример: "электрический чайник нержавеющий", "беспроводные наушники ANC". Не разбивай на отдельные слова. Минимум 10 фраз, максимум 20.
4. short_description — живой, продающий текст с 1–2 эмодзи. Не сухой список, а эмоциональный pitch 2–3 предложения.
5. benefits — короткие буллеты с эмодзи в начале. До 6 штук.
6. specs — только реально известные характеристики. Если не знаешь — "не указано".
7. cover_headlines — 5 конкретных заголовков для обложки с эмодзи, упор на главную выгоду.
8. slide_blocks — 8–10 блоков. Каждый: { title, text, bullets[] }. Разные углы: выгода, использование, сравнение, качество, CTA.

Верни ТОЛЬКО JSON без markdown-обёрток:
{
  "card": {
    "title": "SEO-название товара с ключевым словом в начале",
    "short_description": "Продающее описание 2–3 предложения с эмодзи",
    "benefits": ["✅ Преимущество 1", "⚡ Преимущество 2"],
    "specs": [{"key": "Параметр", "value": "значение или 'не указано'"}],
    "keywords": ["поисковая фраза 1", "поисковая фраза 2"]
  },
  "marketing": {
    "segments": [{"name": "", "pain": "", "promise": ""}],
    "usp_line": "Короткая USP-строка",
    "cover_headlines": ["🔥 Заголовок для обложки 1"],
    "slide_blocks": [{"title": "Заголовок слайда", "text": "Текст", "bullets": ["пункт"]}]
  },
  "service": {
    "notes": [],
    "warnings": ["Что нужно уточнить у продавца"]
  }
}
\`.trim();

const body = {
  model: $env.OPENROUTER_TEXT_MODEL || 'openai/gpt-4o-mini',
  temperature: 0.4,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: system },
    {
      role: 'user',
      content: [
        { type: 'text', text: \`Входные данные:\\n\${JSON.stringify(inputData, null, 2)}\` },
        ...(b64 ? [{ type: 'image_url', image_url: { url: \`data:image/jpeg;base64,\${b64}\` } }] : []),
      ],
    },
  ],
};

return { json: { ...j, openrouter_body: body } };
`.trim();
  log('Build Strategy Body: LLM prompt updated (emoji, real keywords, no fake specs)');
}

// ─── FIX 4: Format Result — emoji formatting, no word-splitting keywords, better specs
{
  const fr = must('Format Result');
  fr.parameters.jsCode = `
const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const j = $json || {};
const card = j.card || {};
const marketing = j.marketing || {};
const service = j.service || {};
const normalized = j.normalized || {};
const uniq = (arr=[]) => [...new Set(arr.map(x=>String(x||'').trim()).filter(Boolean))];

// ── Keywords: use LLM keywords ONLY — no word splitting
let keywords = uniq(Array.isArray(card.keywords) ? card.keywords : []);
// Only gentle fallback if absolutely nothing provided — keep phrases, not single words
if (keywords.length === 0) {
  const kRaw = [j.title, j.category].filter(Boolean).join(' / ');
  if (kRaw) keywords = [kRaw];
}

// ── Cover headlines
const cover = uniq(Array.isArray(marketing.cover_headlines) ? marketing.cover_headlines : []).slice(0,5);

// ── Slide blocks
const rawSlides = Array.isArray(marketing.slide_blocks) ? marketing.slide_blocks : [];
const slides = rawSlides.map((s) => {
  if (typeof s === 'string') return s.trim();
  if (s && typeof s === 'object') {
    const ttl = String(s.title || s.name || '').trim();
    const txt = String(s.text || s.description || s.copy || '').trim();
    const buls = Array.isArray(s.bullets) ? s.bullets.map(b=>String(b||'').trim()).filter(Boolean) : [];
    const base = [ttl, txt].filter(Boolean).join(': ');
    if (buls.length) return base ? base + '\\n  ' + buls.map(b=>'▸ '+b).join('\\n  ') : buls.map(b=>'▸ '+b).join('\\n  ');
    return base;
  }
  return String(s||'').trim();
}).filter(Boolean).slice(0,10);

// ── Benefits
const benefits = uniq(Array.isArray(card.benefits) ? card.benefits : []).slice(0,6);

// ── Specs: show all from LLM (including "не указано") — do NOT over-filter
const rawSpecs = Array.isArray(card.specs) ? card.specs : [];
const specs = rawSpecs.filter(s => {
  const key = String((s&&s.key)||'').trim();
  const val = String((s&&s.value)||'').trim();
  return (key.length > 0) && (val.length > 0);
}).slice(0,12);

// ── Warnings
const warnings = uniq([
  ...(Array.isArray(service.warnings) ? service.warnings : []),
  ...(Array.isArray(normalized.unknowns) ? normalized.unknowns : []),
]).slice(0,8);

// ── Build output
const lines = [];

lines.push('🏷 <b>SEO-название для поиска</b>');
lines.push(esc(card.title || j.title || 'не указано'));

lines.push('');
lines.push('✨ <b>Преимущества товара</b>');
if (benefits.length) {
  for (const b of benefits) lines.push(esc(b));
} else lines.push('• не указано');

lines.push('');
lines.push('📝 <b>Описание для покупателя</b>');
lines.push(esc(card.short_description || 'не указано'));

if (specs.length) {
  lines.push('');
  lines.push('📦 <b>Характеристики</b>');
  for (const s of specs) {
    lines.push(\`• <b>\${esc(s.key)}:</b> \${esc(s.value)}\`);
  }
}

if (keywords.length) {
  lines.push('');
  lines.push('🔍 <b>Ключевые слова для поиска</b>');
  lines.push('<i>' + esc(keywords.join(', ')) + '</i>');
}

if (cover.length || slides.length) {
  lines.push('');
  lines.push('🎨 <b>Идеи для карточки на маркетплейсе</b>');
  if (cover.length) {
    lines.push('');
    lines.push('<i>📸 Варианты заголовка обложки</i>');
    for (const h of cover) lines.push(\`• \${esc(h)}\`);
  }
  if (slides.length) {
    lines.push('');
    lines.push('<i>🖼 Слайды карточки</i>');
    for (let i=0; i<slides.length; i++) {
      lines.push(\`\${i+1}. \${esc(slides[i])}\`);
    }
  }
}

if (warnings.length) {
  lines.push('');
  lines.push('⚠️ <b>Важно уточнить</b>');
  for (const w of warnings) lines.push(\`• \${esc(w)}\`);
}

const text = lines.join('\\n').trim() || 'Не удалось собрать карточку. Добавьте описание или загрузите другое фото.';

// Split into chunks of 3900 chars
const limit = 3900;
const chunks = [];
let remaining = text;
while (remaining.length > limit) {
  let cut = remaining.lastIndexOf('\\n', limit);
  if (cut < 1000) cut = limit;
  chunks.push(remaining.slice(0, cut).trim());
  remaining = remaining.slice(cut).trim();
}
if (remaining) chunks.push(remaining);

return { json: { ...j, result_text_formatted: text, parts: chunks.length ? chunks : [text] } };
`.trim();
  log('Format Result: emoji formatting, no word-splitting keywords, better specs filter');
}

// ─── FIX 5: Send Concept Text Fallback — use prompt_text from Build Design Concepts
{
  const sctf = must('Send Concept Text Fallback');
  // prompt_text is set by Build Design Concepts and preserved through Build Concept Fallback Text (via ...j spread)
  sctf.parameters.text = '={{ $json.prompt_text || $json.fallback_text || "" }}';
  log('Send Concept Text Fallback: text uses prompt_text (rich format from Build Design Concepts)');
}

// ─── FIX 6: Ensure IF Last Concept properly checks concept_index vs concept_total
// (already fixed in v3_7, just verify it's still correct)
{
  const ilc = must('IF Last Concept');
  const conds = ilc.parameters.conditions.conditions;
  const ok = conds.some(c =>
    c.leftValue.includes('concept_index') && c.rightValue.includes('concept_total')
  );
  if (ok) log('IF Last Concept: condition OK (concept_index === concept_total)');
  else {
    ilc.parameters.conditions.conditions = [{
      id: 'v38-last-concept',
      leftValue: '={{ Number($json.concept_index || 0) }}',
      rightValue: '={{ Number($json.concept_total || 5) }}',
      operator: { type: 'number', operation: 'equals' }
    }];
    log('IF Last Concept: condition re-applied');
  }
}

// ─── FIX 7: Send Design CTA — rename button label to be clearer, keep DESIGN_CONCEPT callback
{
  const sdcta = must('Send Design CTA');
  sdcta.parameters.text = '✅ <b>Карточка готова!</b>\n\n🎨 Хочешь получить <b>5 дизайн-концептов</b> для обложки карточки?\n\nНажми кнопку — получишь ТЗ для дизайнера по каждому стилю.';
  log('Send Design CTA: text updated');
}

// ─── FIX 8: Send Design Paywall CTA — verify it has GENERATE_VISUALS_5 button
{
  const sdpc = must('Send Design Paywall CTA');
  sdpc.parameters.text = '📐 <b>5 текстовых ТЗ для дизайнера готовы!</b>\n\n🖼 Нажми кнопку — и я сгенерирую <b>5 реальных изображений</b> в каждом стиле.';
  sdpc.parameters.replyMarkup = 'inlineKeyboard';
  sdpc.parameters.inlineKeyboard = {
    rows: [{
      row: {
        buttons: [{
          text: '🖼 Сгенерировать 5 визуальных концептов',
          additionalFields: { callback_data: 'GENERATE_VISUALS_5' }
        }]
      }
    }]
  };
  sdpc.parameters.additionalFields = { appendAttribution: false, parse_mode: 'HTML' };
  log('Send Design Paywall CTA: button GENERATE_VISUALS_5 confirmed');
}

// ─── FIX 9: Send Design Done — add "start over" button
{
  const sdd = must('Send Design Done');
  sdd.parameters.text = '🎨 <b>Готово! 5 визуальных концептов карточки готовы.</b>\n\nВыбери понравившийся стиль и передай ТЗ дизайнеру.\n\n<i>Нажми «Сгенерировать карточку» чтобы начать заново.</i>';
  sdd.parameters.replyMarkup = 'inlineKeyboard';
  sdd.parameters.inlineKeyboard = {
    rows: [{
      row: {
        buttons: [{
          text: '🔄 Сгенерировать новую карточку',
          additionalFields: { callback_data: 'GEN' }
        }]
      }
    }]
  };
  sdd.parameters.additionalFields = { appendAttribution: false, parse_mode: 'HTML' };
  log('Send Design Done: added restart button');
}

// ─── FIX 10: Send Design Progress — better text
{
  const sdp = must('Send Design Progress');
  sdp.parameters.text = '📐 <b>Генерирую 5 текстовых ТЗ для дизайна...</b>\n\n<i>Получишь подробное ТЗ для каждого стиля — передай дизайнеру или оцени сам. Обычно 15–30 секунд.</i>';
  log('Send Design Progress: text updated');
}

// ─── Write output ─────────────────────────────────────────────────────────────
fs.writeFileSync(DST, JSON.stringify(wf, null, 2));
const stat = fs.statSync(DST);
console.log(`\nDone! → ${DST}`);
console.log(`Size: ${(stat.size / 1024).toFixed(1)} KB, nodes: ${wf.nodes.length}`);
