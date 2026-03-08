/**
 * patch_v4_1.mjs — creates v4_1 from v4_0
 *
 * Fixes:
 * 1. Build Design Concepts — product-specific image_prompt using facts from OpenRouter
 * 2. Prepare Image URLs    — use image_prompt (not HTML prompt_text) for pollinations fallback
 * 3. GEN: Together AI Image — cleaner fallback chain
 * 4. Add "Ensure Photo URL" Code node before Send Concept Photo URL
 * 5. Rewire: Prepare Image URLs → Ensure Photo URL → Send Concept Photo URL
 */

import { readFileSync, writeFileSync } from 'fs';

const INPUT  = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v4_0.json';
const OUTPUT = 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v4_1.json';

const wf = JSON.parse(readFileSync(INPUT, 'utf8'));

function findNode(name) {
  const n = wf.nodes.find(x => x.name === name);
  if (!n) throw new Error(`Node not found: "${name}"`);
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BUILD DESIGN CONCEPTS — product-specific prompts using facts
// ─────────────────────────────────────────────────────────────────────────────
const bdc = findNode('Build Design Concepts');
bdc.parameters.jsCode = [
  "// mode: runOnceForAllItems",
  "const j = $input.first().json || {};",
  "const pick = (...vals) => { for (const v of vals) { if (v !== undefined && v !== null && `${v}`.trim() !== '') return v; } return null; };",
  "const norm = ($node['Normalize']  && $node['Normalize'].json)      ? $node['Normalize'].json      : {};",
  "const sess = ($node['Session: Pick'] && $node['Session: Pick'].json) ? $node['Session: Pick'].json : {};",
  "",
  "const chat_id     = Number(pick(j.chat_id, sess.chat_id, norm.chat_id) || 0);",
  "const title       = (pick(j.title, sess.title)             || 'товар').toString();",
  "const category    = (pick(j.category, sess.category)       || 'категория').toString();",
  "const marketplace = (pick(j.marketplace, sess.marketplace) || 'маркетплейс').toString();",
  "const benefits    = (pick(j.benefits, sess.benefits)       || '').toString();",
  "const render_mode = ((j.render_mode || 'TEXT') + '').trim().toUpperCase() === 'DRAW' ? 'DRAW' : 'TEXT';",
  "",
  "// Facts from OpenRouter analysis — make image prompts product-specific",
  "const rawFacts = Array.isArray(j.facts) ? j.facts : (Array.isArray(sess.facts) ? sess.facts : []);",
  "const factsStr = rawFacts.slice(0, 6).join(', ').slice(0, 250);",
  "",
  "// User product photo (for future img2img support)",
  "const user_product_b64 = (pick(j.image_base64_clean, sess.image_base64_clean, j.image_base64, sess.image_base64) || '').toString().trim();",
  "const has_product_photo = user_product_b64.length > 500;",
  "",
  "// Short product descriptor for prompts",
  "const productDesc = [title, category, factsStr].filter(Boolean).join(', ');",
  "const mktLabel = marketplace.toUpperCase().includes('OZON') ? 'Ozon' : 'Wildberries';",
  "",
  "const variants = [",
  "  {",
  "    style: 'Минимализм Premium',",
  "    palette: 'Белый #FFFFFF · Тёмно-синий #1A237E · Акцент золотой #FFD700',",
  "    background: 'Студийный белый с мягкими тенями',",
  "    layout: 'Товар по центру 70%, 3 буллета снизу в карточках, типографика Montserrat Bold',",
  "    typography: 'Заголовок: Montserrat Bold 72px, цвет #1A237E\\nПодписи: Medium 28px\\nАкценты: #FFD700',",
  "    composition: 'Центральная ось, симметрия, product hero, safe zone 8%',",
  "    get image_prompt() { return `professional ${mktLabel} marketplace product card for ${productDesc}, clean white studio background, soft natural drop shadows, dark navy #1A237E headline, gold #FFD700 accent lines and icons, Montserrat Bold typography, product hero centered 70% canvas, 3 benefit bullets below product, symmetric premium composition, 8% safe zone margins, luxury e-commerce photography, 4k sharp, no watermarks, professional lighting`; },",
  "  },",
  "  {",
  "    style: 'Контраст Dark',",
  "    palette: 'Графит #1C1C1E · Оранжевый #FF6B35 · Белый #FFFFFF',",
  "    background: 'Тёмный градиент #1C1C1E → #2D2D30',",
  "    layout: 'Диагональная композиция 30°, товар слева, плашки с преимуществами справа',",
  "    typography: 'Заголовок: SF Pro Display Bold 68px, белый\\nАкцент: оранжевый #FF6B35\\nПодписи: Regular 26px',",
  "    composition: 'Диагональ 30°, динамика, высокий контраст, энергичный ритм',",
  "    get image_prompt() { return `bold dark graphite gradient #1C1C1E to #2D2D30 ${mktLabel} product card for ${productDesc}, product on left side diagonal 30 degree composition, bright orange #FF6B35 accent badges and benefit callouts on right, bold white SF Pro Display Bold headlines, high contrast dynamic energy, info panels, aggressive modern style, professional e-commerce photography, 4k, no watermarks`; },",
  "  },",
  "  {",
  "    style: 'Инфографика',",
  "    palette: 'Светло-серый #F5F5F7 · Красный #E03131 · Тёмный #1C1C1E',",
  "    background: 'Геометрический паттерн на светло-сером',",
  "    layout: 'Товар слева 50%, характеристики в иконках справа, строгая сетка 4 колонки',",
  "    typography: 'Заголовок: Bold 64px\\nХарактеристики: иконки 32px + текст 24px\\nСтрогое выравнивание по сетке',",
  "    composition: '2-колоночный грид, выравнивание по левому краю, структурированный info-блок',",
  "    get image_prompt() { return `clean infographic ${mktLabel} product card for ${productDesc}, light gray #F5F5F7 background subtle geometric pattern, product image left side 50% canvas, red #E03131 accent icons and spec labels right side, 4-column grid layout, key specifications with icons, two-column product-and-info design, corporate professional style, e-commerce product sheet, 4k sharp, no watermarks`; },",
  "  },",
  "  {",
  "    style: 'Лайфстайл Органик',",
  "    palette: 'Тёплый беж #F5E6D3 · Глубокий зелёный #2D5016 · Крем #FFF8F0',",
  "    background: 'Контекстный интерьерный или природный фон',",
  "    layout: 'Товар крупно в контексте, выноски с преимуществами в баблах',",
  "    typography: 'Заголовок: Playfair Display Bold 66px\\nПодписи в баблах: Lato 26px\\nТёплые натуральные цвета',",
  "    composition: 'Правило третей, золотое сечение, контекст + продукт, живая эмоциональная подача',",
  "    get image_prompt() { return `warm organic lifestyle ${mktLabel} product card for ${productDesc}, warm beige cream #F5E6D3 background natural interior context, product in real-life use setting, deep green #2D5016 botanical accents, Playfair Display Bold serif headlines, speech bubble callouts with benefits, rule of thirds golden ratio composition, emotional authentic lifestyle aesthetic, warm natural daylight, e-commerce high quality photography, 4k, no watermarks`; },",
  "  },",
  "  {",
  "    style: 'Премиум Dark Luxury',",
  "    palette: 'Чёрный #0A0A0A · Золотой #C9A84C · Белый #FFFFFF',",
  "    background: 'Тёмный бархатный градиент с бликами и отражениями',",
  "    layout: 'Товар по центру на тёмном фоне, золотые акценты симметрично, воздух и пространство',",
  "    typography: 'Заголовок: Cormorant Garamond Bold 70px\\nАкценты: золотой #C9A84C\\nПространство и воздух',",
  "    composition: 'Симметрия, центрирование, luxury whitespace, premium minimalism',",
  "    get image_prompt() { return `ultra luxury premium ${mktLabel} product card for ${productDesc}, deep black #0A0A0A velvet gradient background light reflections bokeh, product perfectly centered symmetric, gold metallic #C9A84C decorative lines and accents, Cormorant Garamond elegant serif headlines, generous luxury whitespace, cinematic dramatic studio lighting, high-end brand aesthetic, reflective surface, 4k ultra quality, no watermarks`; },",
  "  },",
  "];",
  "",
  "return variants.map((v, i) => {",
  "  const idx   = i + 1;",
  "  const total = 5;",
  "  const is_last_concept = idx === total;",
  "",
  "  const poll_url = 'https://image.pollinations.ai/p/' +",
  "    encodeURIComponent(v.image_prompt.slice(0, 500)) +",
  "    '?model=flux&width=1024&height=1024&seed=' + (10000 + idx) + '&nologo=true&enhance=true';",
  "",
  "  const prompt_text = [",
  "    `<b>КОНЦЕПТ ${idx}/${total} — «${v.style}»</b>`,",
  "    '<code>━━━━━━━━━━━━━━━━━━━━━━━━</code>',",
  "    `<b>Товар:</b> ${title}`,",
  "    `<b>Маркетплейс:</b> ${marketplace} · <b>Категория:</b> ${category}`,",
  "    '',",
  "    '<b>🎨 Цветовая палитра</b>',",
  "    v.palette,",
  "    '',",
  "    '<b>🔤 Типографика</b>',",
  "    ...v.typography.split('\\n').map(l => l.trim()).filter(Boolean),",
  "    '',",
  "    '<b>🧩 Композиция</b>',",
  "    v.composition,",
  "    '<b>Фон:</b> ' + v.background,",
  "    '<b>Компоновка:</b> ' + v.layout,",
  "    '',",
  "    '<b>📋 Контент-блоки карточки</b>',",
  "    '▸ Зона 1: главный визуал товара (hero shot)',",
  "    '▸ Зона 2: SEO-заголовок / оффер',",
  "    '▸ Зона 3: 3–5 буллетов с ключевыми выгодами',",
  "    '▸ Зона 4: USP-строка или призыв к действию',",
  "    '',",
  "    '<b>📐 Технические требования</b>',",
  "    '▸ Формат: 1:1 (1000×1000px) или 3:4 (700×900px)',",
  "    '▸ Safe zone: 8–10% от краёв',",
  "    '▸ Текст читается на мобильном с первого взгляда',",
  "    `▸ Паттерн топ-карточек ${marketplace} в категории «${category}»`,",
  "  ].join('\\n');",
  "",
  "  const caption = `Концепт ${idx}/${total} — ${v.style}`;",
  "",
  "  return {",
  "    json: {",
  "      ...j,",
  "      chat_id,",
  "      marketplace,",
  "      category,",
  "      title,",
  "      benefits,",
  "      concept_index:     idx,",
  "      concept_total:     total,",
  "      is_last_concept,",
  "      style:             v.style,",
  "      palette:           v.palette,",
  "      background:        v.background,",
  "      layout_notes:      v.layout,",
  "      prompt_text,",
  "      image_prompt:      v.image_prompt,",
  "      caption,",
  "      photo_url:         poll_url,",
  "      image_url:         poll_url,",
  "      current_url:       poll_url,",
  "      ctx_chat_id:       chat_id,",
  "      ctx_concept_index: idx,",
  "      ctx_concept_total: total,",
  "      ctx_prompt_text:   prompt_text,",
  "      ctx_caption:       caption,",
  "      ctx_image_url:     poll_url,",
  "      render_mode,",
  "      user_product_b64,",
  "      has_product_photo,",
  "    },",
  "  };",
  "});",
].join("\n");
console.log('✓ Build Design Concepts patched');

// ─────────────────────────────────────────────────────────────────────────────
// 2. PREPARE IMAGE URLS — use image_prompt (not HTML prompt_text) for fallback
// ─────────────────────────────────────────────────────────────────────────────
const piu = findNode('Prepare Image URLs');
piu.parameters.jsCode = [
  "const j = $json || {};",
  "const pick = (...v) => { for (const x of v) { if (x !== undefined && x !== null && `${x}` !== '') return x; } return null; };",
  "const chatRaw       = pick(j.ctx_chat_id, j.chat_id);",
  "const chat_id       = chatRaw === null ? null : Number(chatRaw);",
  "const concept_index = Number(pick(j.ctx_concept_index, j.concept_index, 1));",
  "",
  "// Use image_prompt for URL construction (proper English, no HTML tags)",
  "const image_prompt = (pick(j.image_prompt) || '').toString();",
  "const prompt_text  = (pick(j.ctx_prompt_text, j.prompt_text) || `Концепт ${concept_index}/5`).toString();",
  "const caption      = (pick(j.ctx_caption, j.caption) || `Концепт ${concept_index}/5`).toString();",
  "",
  "// Primary URL from GEN node (Together AI or pollinations from Build Design Concepts)",
  "const main = (pick(j.ctx_image_url, j.current_url, j.photo_url, j.image_url) || '').toString();",
  "",
  "const seed = concept_index + '-' + (chat_id ?? 'u');",
  "",
  "// Fallback 1: pollinations using image_prompt (clean English, not HTML)",
  "const promptForImg = (image_prompt || prompt_text.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim()).slice(0, 500);",
  "const altPoll = 'https://image.pollinations.ai/p/' +",
  "  encodeURIComponent(promptForImg) +",
  "  '?model=flux&width=1024&height=1024&seed=' + seed + '&nologo=true&enhance=true';",
  "",
  "// Fallback 2: picsum (reliable placeholder)",
  "const altPicsum = 'https://picsum.photos/seed/' + seed + '/1024/1024';",
  "",
  "const urls = [main, altPoll, altPicsum].filter(x => x && x.startsWith('http'));",
  "",
  "return {",
  "  json: {",
  "    ...j,",
  "    chat_id,",
  "    concept_index,",
  "    image_prompt,",
  "    prompt_text,",
  "    caption,",
  "    urls,",
  "    try_index:         Number(j.try_index || 0),",
  "    current_url:       urls[0] || altPoll,",
  "    provider:          main ? 'primary' : (image_prompt ? 'pollinations' : 'picsum'),",
  "    download_errors:   Array.isArray(j.download_errors) ? j.download_errors : [],",
  "    ctx_chat_id:       chat_id,",
  "    ctx_concept_index: concept_index,",
  "    ctx_concept_total: Number(pick(j.ctx_concept_total, j.concept_total, 5)),",
  "    ctx_prompt_text:   prompt_text,",
  "    ctx_caption:       caption,",
  "    ctx_image_url:     urls[0] || altPoll,",
  "  },",
  "};",
].join("\n");
console.log('✓ Prepare Image URLs patched');

// ─────────────────────────────────────────────────────────────────────────────
// 3. GEN: TOGETHER AI IMAGE — cleaner code, better fallback
// ─────────────────────────────────────────────────────────────────────────────
const gen = findNode('GEN: Together AI Image');
gen.parameters.jsCode = [
  "// GEN: Together AI Image",
  "// Text-to-image via Together AI (FLUX.1-schnell-Free, free tier).",
  "// Requires: TOGETHER_API_KEY in n8n Settings → Variables.",
  "// Fallback: pollinations URL already set by Build Design Concepts.",
  "",
  "const API_KEY = (typeof $env !== 'undefined' ? ($env.TOGETHER_API_KEY || '') : '').toString().trim();",
  "const MODEL   = 'black-forest-labs/FLUX.1-schnell-Free';",
  "",
  "const items = $input.all();",
  "const out   = [];",
  "",
  "for (const item of items) {",
  "  const j = item.json;",
  "  let togetherUrl = '';",
  "  let genError    = '';",
  "",
  "  const basePrompt = String(j.image_prompt || '').trim();",
  "  const title      = String(j.title || 'product').slice(0, 80);",
  "  const market     = String(j.marketplace || '').toUpperCase().includes('OZON') ? 'Ozon' : 'Wildberries';",
  "  const category   = String(j.category || '').slice(0, 60);",
  "",
  "  const prompt = basePrompt ||",
  "    `professional ${market} marketplace product card for ${title} ${category}, e-commerce photography, 4k, no watermarks`;",
  "",
  "  if (API_KEY) {",
  "    try {",
  "      const resp = await $helpers.httpRequest({",
  "        method: 'POST',",
  "        url: 'https://api.together.xyz/v1/images/generations',",
  "        headers: {",
  "          'Authorization': 'Bearer ' + API_KEY,",
  "          'Content-Type':  'application/json',",
  "        },",
  "        body: JSON.stringify({",
  "          model:           MODEL,",
  "          prompt:          prompt.slice(0, 1500),",
  "          width:           1024,",
  "          height:          1024,",
  "          steps:           4,",
  "          n:               1,",
  "          response_format: 'url',",
  "        }),",
  "      });",
  "",
  "      const url = resp && resp.data && resp.data[0] && resp.data[0].url",
  "                    ? resp.data[0].url : '';",
  "      if (url) {",
  "        togetherUrl = url;",
  "      } else {",
  "        genError = 'Together AI: no URL in response — ' + JSON.stringify(resp || {}).slice(0, 200);",
  "      }",
  "    } catch (e) {",
  "      genError = String((e && e.message) ? e.message : e).slice(0, 300);",
  "    }",
  "  } else {",
  "    genError = 'TOGETHER_API_KEY not set — using pollinations fallback';",
  "  }",
  "",
  "  // Prefer Together AI; fallback to pollinations URL from Build Design Concepts",
  "  const photo_url = togetherUrl || j.photo_url || '';",
  "",
  "  out.push({",
  "    json: {",
  "      ...j,",
  "      photo_url,",
  "      image_url:      photo_url,",
  "      current_url:    photo_url,",
  "      ctx_image_url:  photo_url,",
  "      together_url:   togetherUrl,",
  "      together_error: genError,",
  "      gen_provider:   togetherUrl ? 'together_ai' : 'pollinations_fallback',",
  "    },",
  "  });",
  "}",
  "",
  "return out;",
].join("\n");
console.log('✓ GEN: Together AI Image patched');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Add "Ensure Photo URL" node — guarantees non-empty URL before Telegram
// ─────────────────────────────────────────────────────────────────────────────
const ensureNode = {
  id: 'ensure-photo-url-v41',
  name: 'Ensure Photo URL',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [7060, 760],
  parameters: {
    mode: 'runOnceForEachItem',
    jsCode: [
      "// Guarantee current_url is a non-empty valid HTTP URL before Telegram sendPhoto.",
      "const j = $json;",
      "const isUrl = x => x && typeof x === 'string' && x.startsWith('http');",
      "const pick  = (...v) => { for (const x of v) { if (isUrl(x)) return x; } return null; };",
      "",
      "// Build clean pollinations fallback from image_prompt (no HTML)",
      "const raw = (j.image_prompt || j.title || 'product card').toString()",
      "  .replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 400);",
      "const seed = (j.concept_index || 1) + '-' + (j.chat_id || 'u');",
      "const pollinationsFallback = 'https://image.pollinations.ai/p/' +",
      "  encodeURIComponent(raw) +",
      "  '?model=flux&width=1024&height=1024&seed=' + seed + '&nologo=true&enhance=true';",
      "",
      "const finalUrl = pick(j.current_url, j.ctx_image_url, j.photo_url, j.image_url) || pollinationsFallback;",
      "",
      "return { json: { ...j, current_url: finalUrl } };",
    ].join("\n"),
  },
};

// Reposition Send Concept Photo URL
findNode('Send Concept Photo URL').position = [7320, 760];
ensureNode.position = [7060, 760];

wf.nodes.push(ensureNode);
console.log('✓ Added "Ensure Photo URL" node');

// ─────────────────────────────────────────────────────────────────────────────
// 5. Rewire: Prepare Image URLs → Ensure Photo URL → Send Concept Photo URL
// ─────────────────────────────────────────────────────────────────────────────
const conns = wf.connections;

if (conns['Prepare Image URLs']) {
  conns['Prepare Image URLs'].main = conns['Prepare Image URLs'].main.map(branch =>
    branch.map(edge =>
      edge.node === 'Send Concept Photo URL'
        ? { ...edge, node: 'Ensure Photo URL' }
        : edge
    )
  );
  console.log('✓ Rewired: Prepare Image URLs → Ensure Photo URL');
}

conns['Ensure Photo URL'] = {
  main: [[{ node: 'Send Concept Photo URL', type: 'main', index: 0 }]],
};
console.log('✓ Wired: Ensure Photo URL → Send Concept Photo URL');

// ─────────────────────────────────────────────────────────────────────────────
// 6. Write output
// ─────────────────────────────────────────────────────────────────────────────
wf.name = 'WB_Ozon_Card_Core_n8n_2.4.7_v4_1';
writeFileSync(OUTPUT, JSON.stringify(wf, null, 2), 'utf8');

console.log(`\n✓ Saved ${OUTPUT} (${wf.nodes.length} nodes)`);
console.log('\nSummary:');
console.log('  1. Build Design Concepts — product-specific image_prompt with facts from OpenRouter');
console.log('  2. Prepare Image URLs    — image_prompt fallback URL (not HTML prompt_text)');
console.log('  3. GEN: Together AI      — cleaner fallback chain');
console.log('  4. Ensure Photo URL      — guarantees non-empty URL before Telegram');
console.log('  5. Rewired connections');
