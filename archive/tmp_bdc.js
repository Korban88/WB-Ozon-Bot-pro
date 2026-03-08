// mode: runOnceForAllItems
const j = $input.first().json || {};
const pick = (...vals) => { for (const v of vals) { if (v !== undefined && v !== null && `${v}`.trim() !== '') return v; } return null; };
const norm = ($node['Normalize'] && $node['Normalize'].json) ? $node['Normalize'].json : {};
const sess = ($node['Session: Pick'] && $node['Session: Pick'].json) ? $node['Session: Pick'].json : {};

const chat_id = Number(pick(j.chat_id, sess.chat_id, norm.chat_id) || 0);
const title = (pick(j.title, sess.title) || 'С‚РѕРІР°СЂ').toString();
const category = (pick(j.category, sess.category) || 'РєР°С‚РµРіРѕСЂРёСЏ').toString();
const marketplace = (pick(j.marketplace, sess.marketplace) || 'РјР°СЂРєРµС‚РїР»РµР№СЃ').toString();
const benefits = (pick(j.benefits, sess.benefits) || '').toString();
const render_mode = ((j.render_mode || 'TEXT') + '').trim().toUpperCase() === 'DRAW' ? 'DRAW' : 'TEXT';

const variants = [
  {
    style: 'РњРёРЅРёРјР°Р»РёР·Рј Premium',
    palette: 'Р‘РµР»С‹Р№ #FFFFFF В· РўС‘РјРЅРѕ-СЃРёРЅРёР№ #1A237E В· РђРєС†РµРЅС‚ Р·РѕР»РѕС‚РѕР№ #FFD700',
    background: 'РЎС‚СѓРґРёР№РЅС‹Р№ Р±РµР»С‹Р№ СЃ РјСЏРіРєРёРјРё С‚РµРЅСЏРјРё',
    layout: 'РўРѕРІР°СЂ РїРѕ С†РµРЅС‚СЂСѓ 70%, 3 Р±СѓР»Р»РµС‚Р° СЃРЅРёР·Сѓ РІ РєР°СЂС‚РѕС‡РєР°С…, С‚РёРїРѕРіСЂР°С„РёРєР° Montserrat Bold',
    typography: 'Р—Р°РіРѕР»РѕРІРѕРє: Montserrat Bold 72px, С†РІРµС‚ #1A237E\nРџРѕРґРїРёСЃРё: Medium 28px\nРђРєС†РµРЅС‚С‹: #FFD700',
    composition: 'Р¦РµРЅС‚СЂР°Р»СЊРЅР°СЏ РѕСЃСЊ, СЃРёРјРјРµС‚СЂРёСЏ, product hero, safe zone 8%',
    image_prompt: `ultra-premium minimalist product card, ${title}, white studio background, soft shadows, dark navy blue typography, golden accent lines, Montserrat font style, clean symmetric composition, luxury e-commerce photography, 4k quality, no watermarks, professional lighting`
  },
  {
    style: 'РљРѕРЅС‚СЂР°СЃС‚ Dark',
    palette: 'Р“СЂР°С„РёС‚ #1C1C1E В· РћСЂР°РЅР¶РµРІС‹Р№ #FF6B35 В· Р‘РµР»С‹Р№ #FFFFFF',
    background: 'РўС‘РјРЅС‹Р№ РіСЂР°РґРёРµРЅС‚ #1C1C1E в†’ #2D2D30',
    layout: 'Р”РёР°РіРѕРЅР°Р»СЊРЅР°СЏ РєРѕРјРїРѕР·РёС†РёСЏ 30В°, С‚РѕРІР°СЂ СЃР»РµРІР°, РїР»Р°С€РєРё СЃ РїСЂРµРёРјСѓС‰РµСЃС‚РІР°РјРё СЃРїСЂР°РІР°',
    typography: 'Р—Р°РіРѕР»РѕРІРѕРє: SF Pro Display Bold 68px, Р±РµР»С‹Р№\nРђРєС†РµРЅС‚: РѕСЂР°РЅР¶РµРІС‹Р№ #FF6B35\nРџРѕРґРїРёСЃРё: Regular 26px',
    composition: 'Р”РёР°РіРѕРЅР°Р»СЊ 30В°, РґРёРЅР°РјРёРєР°, РІС‹СЃРѕРєРёР№ РєРѕРЅС‚СЂР°СЃС‚, СЌРЅРµСЂРіРёС‡РЅС‹Р№ СЂРёС‚Рј',
    image_prompt: `high contrast dark background graphite gradient, ${title}, orange coral accent colors, diagonal composition, bold white typography, modern aggressive style, premium e-commerce product card, professional photography, 4k quality, no text watermarks`
  },
  {
    style: 'РРЅС„РѕРіСЂР°С„РёРєР°',
    palette: 'РЎРІРµС‚Р»Рѕ-СЃРµСЂС‹Р№ #F5F5F7 В· РљСЂР°СЃРЅС‹Р№ #E03131 В· РўС‘РјРЅС‹Р№ #1C1C1E',
    background: 'Р“РµРѕРјРµС‚СЂРёС‡РµСЃРєРёР№ РїР°С‚С‚РµСЂРЅ РЅР° СЃРІРµС‚Р»Рѕ-СЃРµСЂРѕРј',
    layout: 'РўРѕРІР°СЂ СЃР»РµРІР° 50%, С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРєРё РІ РёРєРѕРЅРєР°С… СЃРїСЂР°РІР°, СЃС‚СЂРѕРіР°СЏ СЃРµС‚РєР° 4 РєРѕР»РѕРЅРєРё',
    typography: 'Р—Р°РіРѕР»РѕРІРѕРє: Bold 64px\nРҐР°СЂР°РєС‚РµСЂРёСЃС‚РёРєРё: РёРєРѕРЅРєРё 32px + С‚РµРєСЃС‚ 24px\nРЎС‚СЂРѕРіРѕРµ РІС‹СЂР°РІРЅРёРІР°РЅРёРµ РїРѕ СЃРµС‚РєРµ',
    composition: '2-РєРѕР»РѕРЅРѕС‡РЅС‹Р№ РіСЂРёРґ, РІС‹СЂР°РІРЅРёРІР°РЅРёРµ РїРѕ Р»РµРІРѕРјСѓ РєСЂР°СЋ, СЃС‚СЂСѓРєС‚СѓСЂРёСЂРѕРІР°РЅРЅС‹Р№ info-Р±Р»РѕРє',
    image_prompt: `clean infographic product card, ${title}, light gray background geometric pattern, red accent color, specifications icons layout, structured grid design, two columns product and info, corporate professional style, e-commerce infographic, 4k quality, no watermarks`
  },
  {
    style: 'Р›Р°Р№С„СЃС‚Р°Р№Р» РћСЂРіР°РЅРёРє',
    palette: 'РўС‘РїР»С‹Р№ Р±РµР¶ #F5E6D3 В· Р“Р»СѓР±РѕРєРёР№ Р·РµР»С‘РЅС‹Р№ #2D5016 В· РљСЂРµРј #FFF8F0',
    background: 'РљРѕРЅС‚РµРєСЃС‚РЅС‹Р№ РёРЅС‚РµСЂСЊРµСЂРЅС‹Р№ РёР»Рё РїСЂРёСЂРѕРґРЅС‹Р№ С„РѕРЅ',
    layout: 'РўРѕРІР°СЂ РєСЂСѓРїРЅРѕ РІ РєРѕРЅС‚РµРєСЃС‚Рµ, РІС‹РЅРѕСЃРєРё СЃ РїСЂРµРёРјСѓС‰РµСЃС‚РІР°РјРё РІ Р±Р°Р±Р»Р°С…',
    typography: 'Р—Р°РіРѕР»РѕРІРѕРє: Playfair Display Bold 66px\nРџРѕРґРїРёСЃРё РІ Р±Р°Р±Р»Р°С…: Lato 26px\nРўС‘РїР»С‹Рµ РЅР°С‚СѓСЂР°Р»СЊРЅС‹Рµ С†РІРµС‚Р°',
    composition: 'РџСЂР°РІРёР»Рѕ С‚СЂРµС‚РµР№, Р·РѕР»РѕС‚РѕРµ СЃРµС‡РµРЅРёРµ, РєРѕРЅС‚РµРєСЃС‚ + РїСЂРѕРґСѓРєС‚, Р¶РёРІР°СЏ СЌРјРѕС†РёРѕРЅР°Р»СЊРЅР°СЏ РїРѕРґР°С‡Р°',
    image_prompt: `lifestyle product photography, ${title}, warm beige cream background, natural environment context, deep green organic accents, product in use scene, warm natural lighting, rule of thirds composition, organic aesthetic, high quality photography, 4k, no watermarks`
  },
  {
    style: 'РџСЂРµРјРёСѓРј Dark Luxury',
    palette: 'Р§С‘СЂРЅС‹Р№ #0A0A0A В· Р—РѕР»РѕС‚РѕР№ #C9A84C В· Р‘РµР»С‹Р№ #FFFFFF',
    background: 'РўС‘РјРЅС‹Р№ Р±Р°СЂС…Р°С‚РЅС‹Р№ РіСЂР°РґРёРµРЅС‚ СЃ Р±Р»РёРєР°РјРё Рё РѕС‚СЂР°Р¶РµРЅРёСЏРјРё',
    layout: 'РўРѕРІР°СЂ РїРѕ С†РµРЅС‚СЂСѓ РЅР° С‚С‘РјРЅРѕРј С„РѕРЅРµ, Р·РѕР»РѕС‚С‹Рµ Р°РєС†РµРЅС‚С‹ СЃРёРјРјРµС‚СЂРёС‡РЅРѕ, РІРѕР·РґСѓС… Рё РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІРѕ',
    typography: 'Р—Р°РіРѕР»РѕРІРѕРє: Cormorant Garamond Bold 70px\nРђРєС†РµРЅС‚С‹: Р·РѕР»РѕС‚РѕР№ #C9A84C\nРџСЂРѕСЃС‚СЂР°РЅСЃС‚РІРѕ Рё РІРѕР·РґСѓС…',
    composition: 'РЎРёРјРјРµС‚СЂРёСЏ, С†РµРЅС‚СЂРёСЂРѕРІР°РЅРёРµ, luxury whitespace, premium minimalism',
    image_prompt: `ultra luxury dark product photography, ${title}, black velvet background, gold metallic accents, symmetric placement, premium brand visual, high-end fashion e-commerce aesthetic, elegant typography space, reflections and bokeh, cinematic lighting, 4k ultra quality, no watermarks`
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
    `<b>РљРћРќР¦Р•РџРў ${idx}/${total} вЂ” В«${v.style}В»</b>`,
    '<code>в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ</code>',
    `<b>РўРѕРІР°СЂ:</b> ${title}`,
    `<b>РњР°СЂРєРµС‚РїР»РµР№СЃ:</b> ${marketplace} В· <b>РљР°С‚РµРіРѕСЂРёСЏ:</b> ${category}`,
    '',
    '<b>рџЋЁ Р¦РІРµС‚РѕРІР°СЏ РїР°Р»РёС‚СЂР°</b>',
    v.palette,
    '',
    '<b>рџ”¤ РўРёРїРѕРіСЂР°С„РёРєР°</b>',
    ...v.typography.split('\n').map(l => l.trim()).filter(Boolean),
    '',
    '<b>рџ§© РљРѕРјРїРѕР·РёС†РёСЏ</b>',
    v.composition,
    '<b>Р¤РѕРЅ:</b> ' + v.background,
    '<b>РљРѕРјРїРѕРЅРѕРІРєР°:</b> ' + v.layout,
    '',
    '<b>рџ“‹ РљРѕРЅС‚РµРЅС‚-Р±Р»РѕРєРё РєР°СЂС‚РѕС‡РєРё</b>',
    'в–ё Р—РѕРЅР° 1: РіР»Р°РІРЅС‹Р№ РІРёР·СѓР°Р» С‚РѕРІР°СЂР° (hero shot)',
    'в–ё Р—РѕРЅР° 2: SEO-Р·Р°РіРѕР»РѕРІРѕРє / РѕС„С„РµСЂ',
    'в–ё Р—РѕРЅР° 3: 3вЂ“5 Р±СѓР»Р»РµС‚РѕРІ СЃ РєР»СЋС‡РµРІС‹РјРё РІС‹РіРѕРґР°РјРё',
    'в–ё Р—РѕРЅР° 4: USP-СЃС‚СЂРѕРєР° РёР»Рё РїСЂРёР·С‹РІ Рє РґРµР№СЃС‚РІРёСЋ',
    '',
    '<b>рџ“ђ РўРµС…РЅРёС‡РµСЃРєРёРµ С‚СЂРµР±РѕРІР°РЅРёСЏ</b>',
    'в–ё Р¤РѕСЂРјР°С‚: 1:1 (1000Г—1000px) РёР»Рё 3:4 (700Г—900px)',
    'в–ё Safe zone: 8вЂ“10% РѕС‚ РєСЂР°С‘РІ',
    'в–ё РўРµРєСЃС‚ С‡РёС‚Р°РµС‚СЃСЏ РЅР° РјРѕР±РёР»СЊРЅРѕРј СЃ РїРµСЂРІРѕРіРѕ РІР·РіР»СЏРґР°',
    `в–ё РџР°С‚С‚РµСЂРЅ С‚РѕРї-РєР°СЂС‚РѕС‡РµРє ${marketplace} РІ РєР°С‚РµРіРѕСЂРёРё В«${category}В»`,
  ].join('\n');

  const caption = `РљРѕРЅС†РµРїС‚ ${idx}/${total} вЂ” ${v.style}`;

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
});
