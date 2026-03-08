const j = $json || {};
const pick = (...v) => { for (const x of v) { if (x !== undefined && x !== null && `${x}` !== '') return x; } return null; };
const chatRaw = pick(j.ctx_chat_id, j.chat_id);
const chat_id = chatRaw === null ? null : Number(chatRaw);
const concept_index = Number(pick(j.ctx_concept_index, j.concept_index, 1));
const prompt_text = (pick(j.ctx_prompt_text, j.prompt_text) || `РљРѕРЅС†РµРїС‚ ${concept_index}/5`).toString();
const caption = (pick(j.ctx_caption, j.caption) || `РљРѕРЅС†РµРїС‚ ${concept_index}/5`).toString();
const main = (pick(j.ctx_image_url, j.photo_url, j.image_url) || '').toString();
const seed = encodeURIComponent(`${Date.now()}-${concept_index}-${chat_id ?? 'u'}`);
const altPoll = `https://image.pollinations.ai/p/${encodeURIComponent(prompt_text.slice(0, 320))}?model=flux&width=1024&height=1024&seed=${seed}`;
const altPicsum = `https://picsum.photos/seed/${seed}/1024/1024`;
const urls = [main, altPoll, altPicsum].filter(Boolean);

return {
  json: {
    ...j,
    chat_id,
    concept_index,
    prompt_text,
    caption,
    urls,
    try_index: Number(j.try_index || 0),
    current_url: urls[0] || '',
    provider: 'primary',
    download_errors: Array.isArray(j.download_errors) ? j.download_errors : [],
    ctx_chat_id: chat_id,
    ctx_concept_index: concept_index,
    ctx_concept_total: Number(pick(j.ctx_concept_total, j.concept_total, 5)),
    ctx_prompt_text: prompt_text,
    ctx_caption: caption,
    ctx_image_url: main,
  },
};
