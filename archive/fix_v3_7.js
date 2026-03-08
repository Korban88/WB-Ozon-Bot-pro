/**
 * fix_v3_7.js — v3_6 → v3_7
 * Запуск: node fix_v3_7.js
 *
 * Что делает:
 * 1. Чинит IF Last Concept (is_last_concept никогда не ставился → CTA не появлялся)
 * 2. Подключает Session: Done → Send Design CTA
 * 3. Подключает Send Menu → Send Persistent Nav
 * 4. Добавляет кнопки к Send Help
 * 5. Переписывает тексты всех сообщений бота (красивый HTML)
 * 6. Улучшает промпты в Build Design Concepts (детальные ТЗ + лучшие промпты для image-модели)
 * 7. Добавляет step-images (sendPhoto) перед каждым ключевым шагом
 * 8. Обновляет Send Card Progress с прогресс-текстом
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const DIR  = path.dirname(__filename);
const SRC  = path.join(DIR, 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_6.json');
const DEST = path.join(DIR, 'WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_7.json');

const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const C    = data.connections;

const findById   = (id)   => data.nodes.find(n => n.id   === id);
const findByName = (name) => data.nodes.find(n => n.name === name);
const log = (m)  => console.log('[FIX]', m);

const CRED = { telegramApi: { id: '__REPLACE_TELEGRAM_CREDENTIAL__', name: '__REPLACE_TELEGRAM_CREDENTIAL__' } };

// Pollinations.ai helper — стабильный seed чтобы одно и то же изображение каждый раз
const pollUrl = (prompt, seed, w = 1200, h = 600) =>
  `https://image.pollinations.ai/p/${encodeURIComponent(prompt)}?model=flux&width=${w}&height=${h}&seed=${seed}&nologo=true&enhance=true`;

// ─────────────────────────────────────────────
// FIX 1 — IF Last Concept: условие теперь по concept_index >= concept_total
//          (поле is_last_concept никогда не устанавливалось → CTA не появлялся)
// ─────────────────────────────────────────────
{
  const node = findById('d353e1a8-1dd9-4d4c-a0da-c18c7eb1842a'); // IF Last Concept
  if (node) {
    node.parameters.conditions.conditions = [{
      id: 'fix-last-concept-01',
      leftValue:  '={{ Number($json.concept_index || 0) }}',
      rightValue: '={{ Number($json.concept_total || 5) }}',
      operator: { type: 'number', operation: 'equals' }
    }];
    log('IF Last Concept: condition fixed (concept_index === concept_total)');
  }
}

// ─────────────────────────────────────────────
// FIX 2 — Build Concept Fallback Text: добавляем is_last_concept
// ─────────────────────────────────────────────
{
  const node = findById('022ef161-426e-462b-9178-b0d61e5fa1dd');
  if (node) {
    // Вставляем is_last_concept: idx === total в return
    node.parameters.jsCode = node.parameters.jsCode.replace(
      'const fallback_text = lines.join',
      'const is_last_concept = (idx >= total);\nconst fallback_text = lines.join'
    ).replace(
      'return { json: { ...j, chat_id, concept_index: idx, concept_total: total, fallback_text } };',
      'return { json: { ...j, chat_id, concept_index: idx, concept_total: total, is_last_concept, fallback_text } };'
    );
    log('Build Concept Fallback Text: is_last_concept added');
  }
}

// ─────────────────────────────────────────────
// FIX 3 — Session: Done → Send Design CTA
// ─────────────────────────────────────────────
C['Session: Done'] = {
  main: [[{ node: 'Send Design CTA', type: 'main', index: 0 }]]
};
log('Session: Done → Send Design CTA connected');

// ─────────────────────────────────────────────
// FIX 4 — Send Menu → Send Persistent Nav (постоянная reply-клавиатура)
// ─────────────────────────────────────────────
{
  // Обновляем текст Send Persistent Nav — делаем его минимальным и полезным
  const node = findById('9b224fe6-8227-433e-9feb-b021b2d25e34');
  if (node) {
    node.parameters.text = '<i>Быстрые команды:</i>';
    node.parameters.additionalFields = node.parameters.additionalFields || {};
    node.parameters.additionalFields.appendAttribution = false;
    node.parameters.additionalFields.parse_mode = 'HTML';
  }
  C['Send Menu'] = {
    main: [[{ node: 'Send Persistent Nav', type: 'main', index: 0 }]]
  };
  C['Send Persistent Nav'] = { main: [[]] };
  log('Send Menu → Send Persistent Nav connected');
}

// ─────────────────────────────────────────────
// FIX 5 — Send Help: добавляем кнопки
// ─────────────────────────────────────────────
{
  const node = findById('008d00a4-c2d9-459d-93c9-d87a5405b137');
  if (node) {
    node.parameters.replyMarkup = 'inlineKeyboard';
    node.parameters.inlineKeyboard = {
      rows: [
        { row: { buttons: [
          { text: '🚀 Сгенерировать карточку', additionalFields: { callback_data: 'GEN' } },
          { text: '◀ В меню',                 additionalFields: { callback_data: 'start' } }
        ]}}
      ]
    };
    log('Send Help: buttons added');
  }
}

// ─────────────────────────────────────────────
// FIX 6 — Переписываем все тексты сообщений (красивый HTML)
// ─────────────────────────────────────────────

// 6a. Приветствие
{
  const node = findById('ae70e5e3-1452-4dbd-98f9-bc84b12703c1');
  if (node) {
    node.parameters.text = [
      '🚀 <b>WB / Ozon Card PRO</b>',
      '<code>━━━━━━━━━━━━━━━━━━━━━━━━</code>',
      '',
      'Генерирую <b>продающие карточки товара</b> под маркетплейсы за <b>3–5 минут.</b>',
      '',
      '<b>Что ты получишь:</b>',
      '▸ SEO-название под поисковые запросы',
      '▸ Продающие буллеты и описание без воды',
      '▸ Характеристики и ключевые слова',
      '▸ 5 вариантов заголовков для обложки',
      '▸ 10 идей для слайдов карточки',
      '▸ 5 визуальных дизайн-концептов',
      '',
      '<i>Выбери действие 👇</i>'
    ].join('\n');
    node.parameters.additionalFields.parse_mode = 'HTML';
    log('Send Menu text updated');
  }
}

// 6b. Помощь
{
  const node = findById('008d00a4-c2d9-459d-93c9-d87a5405b137');
  if (node) {
    node.parameters.text = [
      '📖 <b>Как это работает</b>',
      '<code>━━━━━━━━━━━━━━━━━━━━━━━━</code>',
      '',
      '<b>1.</b> Выбираешь маркетплейс — WB или Ozon',
      '<b>2.</b> Указываешь категорию товара',
      '<b>3.</b> Вводишь название товара',
      '<b>4.</b> Описываешь преимущества и характеристики',
      '<b>5.</b> Отправляешь фото товара',
      '',
      'Далее бот анализирует данные, при необходимости задаёт уточняющие вопросы и формирует готовую карточку.',
      '',
      '<b>На выходе:</b>',
      '▸ SEO-название · описание · буллеты',
      '▸ Характеристики и ключевые слова',
      '▸ 5 текстовых ТЗ для дизайна обложки',
      '▸ 5 готовых визуальных концептов',
      '',
      '<i>В среднем занимает 3–5 минут.</i>'
    ].join('\n');
    log('Send Help text updated');
  }
}

// 6c. Выбор маркетплейса
{
  const node = findById('4684ec46-c321-4126-9f56-957795e60e49');
  if (node) {
    node.parameters.text = [
      '🏪 <b>Шаг 1 / 5 — Маркетплейс</b>',
      '<code>━━━━━━━━━━━━━━━━━━━━━━━━</code>',
      '',
      'На какой площадке будет продаваться товар?'
    ].join('\n');
    log('Send: Choose marketplace text updated');
  }
}

// 6d. Выбор категории
{
  const node = findById('3841c1e2-b34e-4ae9-848c-4b157672d10e');
  if (node) {
    node.parameters.text = [
      '🗂 <b>Шаг 2 / 5 — Категория</b>',
      '<code>━━━━━━━━━━━━━━━━━━━━━━━━</code>',
      '',
      'Выбери категорию товара:'
    ].join('\n');
    log('Send: Choose category text updated');
  }
}

// 6e. Название товара
{
  const node = findById('97cd1955-7d9c-4bb1-ace6-dfc4d676150a');
  if (node) {
    node.parameters.text = [
      '✏️ <b>Шаг 3 / 5 — Название товара</b>',
      '<code>━━━━━━━━━━━━━━━━━━━━━━━━</code>',
      '',
      'Напиши название товара так, как оно будет в карточке.',
      '',
      '<i>Пример: «Кроссовки мужские кожаные белые, размер 40–46»</i>'
    ].join('\n');
    log('Send: Ask title text updated');
  }
}

// 6f. Преимущества
{
  const node = findById('f54d12cf-16b6-4bd4-be1b-91c7e0fbf7e3');
  if (node) {
    node.parameters.text = [
      '📋 <b>Шаг 4 / 5 — Описание товара</b>',
      '<code>━━━━━━━━━━━━━━━━━━━━━━━━</code>',
      '',
      'Опиши товар: материал, размер, комплектацию, особенности, цвет.',
      '',
      '<i>Можно одним текстом, списком или через запятую — бот разберётся.</i>'
    ].join('\n');
    log('Send: Ask benefits text updated');
  }
}

// 6g. Фото
{
  const node = findById('148d193b-fe51-4d32-ad7f-e35fbc108843');
  if (node) {
    node.parameters.text = [
      '📸 <b>Шаг 5 / 5 — Фото товара</b>',
      '<code>━━━━━━━━━━━━━━━━━━━━━━━━</code>',
      '',
      'Отправь одно фото товара.',
      '',
      '<i>Лучше всего: чистый светлый фон, без надписей, хорошее освещение.</i>'
    ].join('\n');
    log('Send: Ask photo text updated');
  }
}

// 6h. Повторный запрос фото
{
  const node = findById('c1f4af53-cf46-4c68-b33b-47b74e398955');
  if (node) {
    node.parameters.text = [
      '📸 <b>Шаг 5 / 5 — Фото товара</b>',
      '<code>━━━━━━━━━━━━━━━━━━━━━━━━</code>',
      '',
      'Пожалуйста, отправь фото товара — именно изображение, не текст.',
      '',
      '<i>Подойдёт любое фото на чистом фоне.</i>'
    ].join('\n');
    log('Send: Ask photo (repeat) text updated');
  }
}

// 6i. Прогресс генерации
{
  const node = findById('95f2f040-466b-44b1-a0d3-3646475391cb');
  if (node) {
    node.parameters.text = [
      '⚙️ <b>Генерирую карточку...</b>',
      '',
      'Анализирую фото и данные, формирую контент.',
      '<i>Обычно занимает 20–40 секунд.</i>'
    ].join('\n');
    log('Send Card Progress text updated');
  }
}

// 6j. Send Design CTA (после готовой карточки)
{
  const node = findById('acfa45ff-acca-4322-812b-e012d18403e1');
  if (node) {
    node.parameters.text = [
      '✅ <b>Карточка готова!</b>',
      '',
      'Хочешь получить <b>5 визуальных дизайн-концептов</b> для обложки и слайдов?'
    ].join('\n');
    node.parameters.additionalFields = node.parameters.additionalFields || {};
    node.parameters.additionalFields.parse_mode = 'HTML';
    node.parameters.additionalFields.appendAttribution = false;
    log('Send Design CTA text updated');
  }
}

// 6k. Send Design Paywall CTA (после текстовых концептов)
{
  const node = findById('158263ee-66f7-4ff3-809b-59f301a44c50');
  if (node) {
    node.parameters.text = [
      '📐 <b>5 текстовых ТЗ сформированы!</b>',
      '',
      'Нажми кнопку ниже — и я нарисую <b>5 визуальных вариантов дизайна</b> карточки.'
    ].join('\n');
    node.parameters.additionalFields = node.parameters.additionalFields || {};
    node.parameters.additionalFields.parse_mode = 'HTML';
    node.parameters.additionalFields.appendAttribution = false;
    log('Send Design Paywall CTA text updated');
  }
}

// 6l. Send Design Done
{
  const node = findById('772aca0c-dc2c-49cd-a6a5-50547a70c097');
  if (node) {
    node.parameters.text = [
      '🎨 <b>Готово!</b>',
      '',
      'Выше — 5 визуальных концептов карточки. Выбери понравившийся стиль и передай его дизайнеру.',
      '',
      '<i>Нажми «Сгенерировать карточку» чтобы начать заново.</i>'
    ].join('\n');
    node.parameters.additionalFields = node.parameters.additionalFields || {};
    node.parameters.additionalFields.parse_mode = 'HTML';
    node.parameters.additionalFields.appendAttribution = false;
    log('Send Design Done text updated');
  }
}

// 6m. Send Design Progress (текстовые ТЗ)
{
  const node = findById('7846ad9c-f01f-4c2f-97bd-c33f7111b0f2');
  if (node) {
    node.parameters.text = [
      '📐 <b>Генерирую 5 текстовых ТЗ для дизайна...</b>',
      '<i>Секунд через 15–30 отправлю готовые концепты.</i>'
    ].join('\n');
    node.parameters.additionalFields = node.parameters.additionalFields || {};
    node.parameters.additionalFields.parse_mode = 'HTML';
    log('Send Design Progress text updated');
  }
}

// 6n. Send Draw Progress (визуальная генерация)
{
  const node = findById('9f4d5004-0402-41ac-8574-0218e25dddb0');
  if (node) {
    node.parameters.text = [
      '🖼 <b>Рисую 5 визуальных концептов...</b>',
      '<i>Это займёт 1–2 минуты — каждое изображение генерируется отдельно.</i>'
    ].join('\n');
    node.parameters.additionalFields = node.parameters.additionalFields || {};
    node.parameters.additionalFields.parse_mode = 'HTML';
    log('Send Draw Progress text updated');
  }
}

// ─────────────────────────────────────────────
// FIX 7 — Build Design Concepts: детальные промпты
// ─────────────────────────────────────────────
{
  const node = findById('c43a9966-8935-480d-b70c-910190caf21e');
  if (node) {
    node.parameters.jsCode = `// mode: runOnceForAllItems
const j = $input.first().json || {};
const pick = (...vals) => { for (const v of vals) { if (v !== undefined && v !== null && \`\${v}\`.trim() !== '') return v; } return null; };
const norm = ($node['Normalize'] && $node['Normalize'].json) ? $node['Normalize'].json : {};
const sess = ($node['Session: Pick'] && $node['Session: Pick'].json) ? $node['Session: Pick'].json : {};

const chat_id = Number(pick(j.chat_id, sess.chat_id, norm.chat_id) || 0);
const title = (pick(j.title, sess.title) || 'товар').toString();
const category = (pick(j.category, sess.category) || 'категория').toString();
const marketplace = (pick(j.marketplace, sess.marketplace) || 'маркетплейс').toString();
const benefits = (pick(j.benefits, sess.benefits) || '').toString();
const render_mode = ((j.render_mode || 'TEXT') + '').trim().toUpperCase() === 'DRAW' ? 'DRAW' : 'TEXT';

const variants = [
  {
    style: 'Минимализм Premium',
    palette: 'Белый #FFFFFF · Тёмно-синий #1A237E · Акцент золотой #FFD700',
    background: 'Студийный белый с мягкими тенями',
    layout: 'Товар по центру 70%, 3 буллета снизу в карточках, типографика Montserrat Bold',
    typography: 'Заголовок: Montserrat Bold 72px, цвет #1A237E\\nПодписи: Medium 28px\\nАкценты: #FFD700',
    composition: 'Центральная ось, симметрия, product hero, safe zone 8%',
    image_prompt: \`ultra-premium minimalist product card, \${title}, white studio background, soft shadows, dark navy blue typography, golden accent lines, Montserrat font style, clean symmetric composition, luxury e-commerce photography, 4k quality, no watermarks, professional lighting\`
  },
  {
    style: 'Контраст Dark',
    palette: 'Графит #1C1C1E · Оранжевый #FF6B35 · Белый #FFFFFF',
    background: 'Тёмный градиент #1C1C1E → #2D2D30',
    layout: 'Диагональная композиция 30°, товар слева, плашки с преимуществами справа',
    typography: 'Заголовок: SF Pro Display Bold 68px, белый\\nАкцент: оранжевый #FF6B35\\nПодписи: Regular 26px',
    composition: 'Диагональ 30°, динамика, высокий контраст, энергичный ритм',
    image_prompt: \`high contrast dark background graphite gradient, \${title}, orange coral accent colors, diagonal composition, bold white typography, modern aggressive style, premium e-commerce product card, professional photography, 4k quality, no text watermarks\`
  },
  {
    style: 'Инфографика',
    palette: 'Светло-серый #F5F5F7 · Красный #E03131 · Тёмный #1C1C1E',
    background: 'Геометрический паттерн на светло-сером',
    layout: 'Товар слева 50%, характеристики в иконках справа, строгая сетка 4 колонки',
    typography: 'Заголовок: Bold 64px\\nХарактеристики: иконки 32px + текст 24px\\nСтрогое выравнивание по сетке',
    composition: '2-колоночный грид, выравнивание по левому краю, структурированный info-блок',
    image_prompt: \`clean infographic product card, \${title}, light gray background geometric pattern, red accent color, specifications icons layout, structured grid design, two columns product and info, corporate professional style, e-commerce infographic, 4k quality, no watermarks\`
  },
  {
    style: 'Лайфстайл Органик',
    palette: 'Тёплый беж #F5E6D3 · Глубокий зелёный #2D5016 · Крем #FFF8F0',
    background: 'Контекстный интерьерный или природный фон',
    layout: 'Товар крупно в контексте, выноски с преимуществами в баблах',
    typography: 'Заголовок: Playfair Display Bold 66px\\nПодписи в баблах: Lato 26px\\nТёплые натуральные цвета',
    composition: 'Правило третей, золотое сечение, контекст + продукт, живая эмоциональная подача',
    image_prompt: \`lifestyle product photography, \${title}, warm beige cream background, natural environment context, deep green organic accents, product in use scene, warm natural lighting, rule of thirds composition, organic aesthetic, high quality photography, 4k, no watermarks\`
  },
  {
    style: 'Премиум Dark Luxury',
    palette: 'Чёрный #0A0A0A · Золотой #C9A84C · Белый #FFFFFF',
    background: 'Тёмный бархатный градиент с бликами и отражениями',
    layout: 'Товар по центру на тёмном фоне, золотые акценты симметрично, воздух и пространство',
    typography: 'Заголовок: Cormorant Garamond Bold 70px\\nАкценты: золотой #C9A84C\\nПространство и воздух',
    composition: 'Симметрия, центрирование, luxury whitespace, premium minimalism',
    image_prompt: \`ultra luxury dark product photography, \${title}, black velvet background, gold metallic accents, symmetric placement, premium brand visual, high-end fashion e-commerce aesthetic, elegant typography space, reflections and bokeh, cinematic lighting, 4k ultra quality, no watermarks\`
  }
];

return variants.map((v, i) => {
  const idx = i + 1;
  const total = 5;
  const is_last_concept = idx === total;

  const poll_url = 'https://image.pollinations.ai/p/' +
    encodeURIComponent(v.image_prompt.slice(0, 400)) +
    '?model=flux&width=1280&height=1280&seed=' + (10000 + idx) + '&nologo=true&enhance=true';

  const prompt_text = [
    \`<b>КОНЦЕПТ \${idx}/\${total} — «\${v.style}»</b>\`,
    '<code>━━━━━━━━━━━━━━━━━━━━━━━━</code>',
    \`<b>Товар:</b> \${title}\`,
    \`<b>Маркетплейс:</b> \${marketplace} · <b>Категория:</b> \${category}\`,
    '',
    '<b>🎨 Цветовая палитра</b>',
    v.palette,
    '',
    '<b>🔤 Типографика</b>',
    ...v.typography.split('\\n').map(l => l.trim()).filter(Boolean),
    '',
    '<b>🧩 Композиция</b>',
    v.composition,
    '<b>Фон:</b> ' + v.background,
    '<b>Компоновка:</b> ' + v.layout,
    '',
    '<b>📋 Контент-блоки карточки</b>',
    '▸ Зона 1: главный визуал товара (hero shot)',
    '▸ Зона 2: SEO-заголовок / оффер',
    '▸ Зона 3: 3–5 буллетов с ключевыми выгодами',
    '▸ Зона 4: USP-строка или призыв к действию',
    '',
    '<b>📐 Технические требования</b>',
    '▸ Формат: 1:1 (1000×1000px) или 3:4 (700×900px)',
    '▸ Safe zone: 8–10% от краёв',
    '▸ Текст читается на мобильном с первого взгляда',
    \`▸ Паттерн топ-карточек \${marketplace} в категории «\${category}»\`,
  ].join('\\n');

  const caption = \`Концепт \${idx}/\${total} — \${v.style}\`;

  return {
    json: {
      ...j,
      chat_id,
      marketplace,
      category,
      title,
      benefits,
      concept_index: idx,
      concept_total: total,
      is_last_concept,
      style: v.style,
      palette: v.palette,
      background: v.background,
      layout_notes: v.layout,
      prompt_text,
      image_prompt: v.image_prompt,
      caption,
      photo_url: poll_url,
      image_url: poll_url,
      current_url: poll_url,
      ctx_chat_id: chat_id,
      ctx_concept_index: idx,
      ctx_concept_total: total,
      ctx_prompt_text: prompt_text,
      ctx_caption: caption,
      ctx_image_url: poll_url,
      render_mode,
    }
  };
});`;
    log('Build Design Concepts: detailed prompts updated');
  }
}

// ─────────────────────────────────────────────
// FIX 8 — Добавляем step-image ноды (sendPhoto перед каждым шагом)
//          continueOnFail: true — если картинка не загрузится, текст всё равно придёт
// ─────────────────────────────────────────────

// Фабрика sendPhoto-ноды
const mkPhoto = (id, name, chatExpr, pollPrompt, seed, pos) => ({
  parameters: {
    resource:     'message',
    operation:    'sendPhoto',
    chatId:       chatExpr,
    binaryData:   false,
    file: `={{ $env['${('IMG_' + name.toUpperCase().replace(/[^A-Z0-9]/g,'_'))}'] || '${pollUrl(pollPrompt, seed)}' }}`,
    additionalFields: { appendAttribution: false }
  },
  id,
  name,
  type:        'n8n-nodes-base.telegram',
  typeVersion: 1.2,
  position:    pos,
  continueOnFail: true,
  credentials: CRED
});

const NC = '$node["Normalize"].json.chat_id';

// IMG 1: перед Welcome (вставляем между Session: Reset и Send Menu)
const ID_IMG_WELCOME = 'img01-welcome-000000000000000001';
data.nodes.push(mkPhoto(
  ID_IMG_WELCOME,
  'IMG: Welcome',
  `={{ ${NC} }}`,
  'futuristic AI ecommerce product card generator bot, dark deep space background, holographic product cards floating 3D, WB wildberries coral red and OZON blue purple glow, premium UI interface, cyberpunk minimal, no text, ultra quality',
  1001, [1904, 48]
));

// IMG 2: перед Help
const ID_IMG_HELP = 'img02-help-0000000000000000002';
data.nodes.push(mkPhoto(
  ID_IMG_HELP,
  'IMG: Help',
  `={{ ${NC} }}`,
  'abstract 5-step workflow visualization, glowing connected nodes, dark deep blue background, neon cyan accent lines, premium infographic design, no text, futuristic minimal',
  1002, [1904, 240]
));

// IMG 3: перед Choose marketplace
const ID_IMG_MARKETPLACE = 'img03-marketplace-00000000003';
data.nodes.push(mkPhoto(
  ID_IMG_MARKETPLACE,
  'IMG: Marketplace',
  `={{ ${NC} }}`,
  'WB wildberries vs OZON marketplace abstract split screen, coral red left deep purple right, geometric premium brand visual, dark background, no logos no text, luxury duotone',
  1003, [2384, 240]
));

// IMG 4: перед Choose category
const ID_IMG_CATEGORY = 'img04-category-000000000000004';
data.nodes.push(mkPhoto(
  ID_IMG_CATEGORY,
  'IMG: Category',
  `={{ ${NC} }}`,
  'holographic product category icons grid floating, electronics fashion sports home beauty kids, dark background iridescent colors, premium UI e-commerce categories, no text, futuristic glow',
  1004, [2384, 432]
));

// IMG 5: перед Ask title
const ID_IMG_TITLE = 'img05-title-00000000000000005';
data.nodes.push(mkPhoto(
  ID_IMG_TITLE,
  'IMG: Title',
  `={{ ${NC} }}`,
  'abstract SEO product naming UI visualization, glowing text cursor, dark premium interface, neon blue typography animation, minimal clean design, no readable text, futuristic',
  1005, [2384, 576]
));

// IMG 6: перед Ask benefits
const ID_IMG_BENEFITS = 'img06-benefits-0000000000006';
data.nodes.push(mkPhoto(
  ID_IMG_BENEFITS,
  'IMG: Benefits',
  `={{ ${NC} }}`,
  'structured benefits checklist visualization abstract, neon green glowing checkmarks, dark background, premium data list UI, organized bullet points glow, no readable text, futuristic minimal',
  1006, [1904, 800]
));

// IMG 7: перед Ask photo
const ID_IMG_PHOTO = 'img07-photo-00000000000000007';
data.nodes.push(mkPhoto(
  ID_IMG_PHOTO,
  'IMG: Photo Upload',
  `={{ ${NC} }}`,
  'AR augmented reality camera scanning frame overlay, product scanning animation, blue neon scan lines, dark background premium tech visualization, no text, futuristic high-tech',
  1007, [1904, 960]
));

// IMG 8: перед Card Progress (генерация)
const ID_IMG_GENERATING = 'img08-generating-00000000008';
data.nodes.push(mkPhoto(
  ID_IMG_GENERATING,
  'IMG: Generating',
  `={{ ${NC} }}`,
  'neural network AI data processing visualization, glowing nodes and connections, dark deep space background, data streams flowing, artificial intelligence computation, no text, premium futuristic',
  1008, [3160, 1080]
));

log('Step image nodes added (8 nodes)');

// ─────────────────────────────────────────────
// FIX 9 — Перестыкуем соединения: вставляем IMG-ноды в цепочки
// ─────────────────────────────────────────────

// 9a. Session: Reset → IMG: Welcome → Send Menu
C['Session: Reset'] = {
  main: [[{ node: 'IMG: Welcome', type: 'main', index: 0 }]]
};
C['IMG: Welcome'] = {
  main: [[{ node: 'Send Menu', type: 'main', index: 0 }]]
};

// 9b. IF Help TRUE → IMG: Help → Send Help
C['IF Help'] = {
  main: [
    [{ node: 'IMG: Help', type: 'main', index: 0 }],
    [{ node: 'IF Generate', type: 'main', index: 0 }]
  ]
};
C['IMG: Help'] = {
  main: [[{ node: 'Send Help', type: 'main', index: 0 }]]
};

// 9c. Session: Stage select_marketplace → IMG: Marketplace → Send: Choose marketplace
C['Session: Stage select_marketplace'] = {
  main: [[{ node: 'IMG: Marketplace', type: 'main', index: 0 }]]
};
C['IMG: Marketplace'] = {
  main: [[{ node: 'Send: Choose marketplace', type: 'main', index: 0 }]]
};

// 9d. Session: Set marketplace WB/OZON → IMG: Category → Send: Choose category
C['Session: Set marketplace WB'] = {
  main: [[{ node: 'IMG: Category', type: 'main', index: 0 }]]
};
C['Session: Set marketplace OZON'] = {
  main: [[{ node: 'IMG: Category', type: 'main', index: 0 }]]
};
C['IMG: Category'] = {
  main: [[{ node: 'Send: Choose category', type: 'main', index: 0 }]]
};

// 9e. Session: Set category → IMG: Title → Send: Ask title
C['Session: Set category'] = {
  main: [[{ node: 'IMG: Title', type: 'main', index: 0 }]]
};
C['IMG: Title'] = {
  main: [[{ node: 'Send: Ask title', type: 'main', index: 0 }]]
};

// 9f. Session: Set title → IMG: Benefits → Send: Ask benefits
C['Session: Set title'] = {
  main: [[{ node: 'IMG: Benefits', type: 'main', index: 0 }]]
};
C['IMG: Benefits'] = {
  main: [[{ node: 'Send: Ask benefits', type: 'main', index: 0 }]]
};

// 9g. Session: Set benefits → IMG: Photo Upload → Send: Ask photo
C['Session: Set benefits'] = {
  main: [[{ node: 'IMG: Photo Upload', type: 'main', index: 0 }]]
};
C['IMG: Photo Upload'] = {
  main: [[{ node: 'Send: Ask photo', type: 'main', index: 0 }]]
};

// 9h. Session: Save photo → IMG: Generating (параллельно с Send Card Progress и IF has saved photo)
//     Исходный: Session: Save photo → [Send Card Progress, IF has saved photo]
//     Добавляем IMG: Generating в ту же пачку
C['Session: Save photo'] = {
  main: [[
    { node: 'IMG: Generating',   type: 'main', index: 0 },
    { node: 'Send Card Progress', type: 'main', index: 0 },
    { node: 'IF has saved photo', type: 'main', index: 0 }
  ]]
};
C['IMG: Generating'] = { main: [[]] }; // terminal (параллельно, не блокирует)

log('Step image connections wired');

// ─────────────────────────────────────────────
// FIX 10 — Send Concept Text Fallback: добавляем HTML caption
// ─────────────────────────────────────────────
{
  const node = findById('ad1913d1-eb42-45ec-b914-671adb623246');
  if (node) {
    node.parameters.text = '={{$json.fallback_text || ""}}';
    node.parameters.additionalFields = node.parameters.additionalFields || {};
    node.parameters.additionalFields.parse_mode = 'HTML';
    node.parameters.additionalFields.appendAttribution = false;
    log('Send Concept Text Fallback: HTML mode enabled');
  }
}

// ─────────────────────────────────────────────
// Финал
// ─────────────────────────────────────────────
data.name = 'WB/Ozon Card Core n8n 2.4.7 FIXED v3.7';

const out = JSON.stringify(data, null, 2);
fs.writeFileSync(DEST, out, 'utf8');
console.log(`\nDone! → ${DEST}`);
console.log(`Size: ${(out.length / 1024).toFixed(1)} KB, nodes: ${data.nodes.length}`);
