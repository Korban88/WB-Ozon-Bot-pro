# WB/Ozon Card Core Bot — Project Knowledge Base

## Overview

n8n workflow-based Telegram bot that generates WB/Ozon marketplace product card content.

- **Bot name**: Карточка WB/Ozon PRO-bot
- **GitHub repo**: https://github.com/Korban88/WB-Ozon-Bot-pro
- **Local working dir**: `C:\Claude Code Projects\WB-Ozon-Bot-pro\`
- **n8n platform**: Self-hosted n8n
- **Node.js**: v22.18.0 (use `.mjs` scripts for JSON manipulation)

---

## Current Workflow Files

| File | Version | Nodes | Description |
|------|---------|-------|-------------|
| `WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v4_0.json` | v4.0 | 106 | **Current active version** — fix: OpenRouter Normalize 500 error when sending images |

**Always use v4_0 as the active version. All previous versions are in `archive/`.**

---

## Architecture: High-Level Flow

```
Telegram Trigger
  → Normalize (normalize different update types: message, callback_query, etc.)
  → Session: Pick (load user session data: title, marketplace, category, etc.)
  → [Product generation chain] → Send Result
  → IF Last Part → Session: Done → Send Design CTA (button: DESIGN_CONCEPT)

User clicks "Сгенерировать дизайн-концепт":
  → IF Design Concept → IF Design Feature Enabled → IF Draw Design Paid
    → TRUE (DRAW_DESIGN_5_PAID or GENERATE_VISUALS_5):
        Send Draw Progress + Set Render Mode DRAW → Build Design Concepts
    → FALSE (other):
        Send Design Progress + Set Render Mode TEXT → Build Design Concepts

Build Design Concepts → GEN: Together AI Image → IF Draw Flow Item
  → TRUE (render_mode = DRAW):
      Prepare Image URLs → Send Concept Photo URL → IF Last Concept
  → FALSE (render_mode = TEXT):
      Build Concept Fallback Text → Send Concept Text Fallback → IF Last Concept

IF Last Concept (TRUE = concept 5/5):
  → IF Render Mode
    → TRUE ($json.photo array non-empty = DRAW): Send Design Done
    → FALSE (TEXT mode): Send Design Paywall CTA [button: GENERATE_VISUALS_5]
```

---

## Key Nodes

### GEN: Together AI Image
- **Position**: between `Build Design Concepts` and `IF Draw Flow Item`
- **Mode**: `runOnceForAllItems`
- **Purpose**: Generate images via Together AI API before routing to DRAW/TEXT
- **API**: `POST https://api.together.xyz/v1/images/generations`
- **Model**: `black-forest-labs/FLUX.1-schnell-Free`
- **Auth**: `$env.TOGETHER_API_KEY` (n8n Settings → Variables)
- **Fallback**: if no API key or error → uses `j.photo_url` (pollinations URL from Build Design Concepts)
- **Output fields added**: `photo_url`, `image_url`, `current_url`, `ctx_image_url`, `together_url`, `together_error`, `gen_provider`

### Build Design Concepts
- **Mode**: `runOnceForAllItems`
- **Outputs**: 5 items (one per concept variant: Minimalism Premium, Contrast Dark, Infographic, Lifestyle Organic, Premium Dark Luxury)
- **Key output fields**: `concept_index` (1-5), `concept_total` (5), `render_mode`, `image_prompt`, `prompt_text`, `caption`, `photo_url` (pollinations URL), `is_last_concept`

### IF Draw Flow Item
- **Condition**: `$json.render_mode.toUpperCase() === 'DRAW'`
- **TRUE** → DRAW path (images)
- **FALSE** → TEXT path (text concepts)

### Send Concept Photo URL *(added in v3.9)*
- **Type**: n8n-nodes-base.telegram, typeVersion 1.2
- **Operation**: sendPhoto (by URL — no binary download)
- **photo**: `$json.current_url || $json.ctx_image_url || $json.photo_url`
- **caption**: `$json.caption` (e.g., "Концепт 5/5 — Премиум Dark Luxury")
- **chatId**: `$json.ctx_chat_id || $json.chat_id || $('Normalize').first().json.chat_id`

### IF Last Concept
- **Condition** (OR, loose):
  1. Item pairing: `$('Build Concept Fallback Text').item?.json?.is_last_concept === true` (TEXT mode)
  2. Caption/text check: `$json.caption || $json.text` contains "5/5" (DRAW mode + fallback)
- **TRUE** → IF Render Mode → Send Design Done (DRAW) or Send Design Paywall CTA (TEXT)

### Send Design Paywall CTA
- **Button text**: "🖼 Сгенерировать 5 визуальных концептов"
- **callback_data**: `GENERATE_VISUALS_5`
- **Triggers**: DRAW mode with `Set Render Mode DRAW` → real images generated

---

## n8n Setup Requirements

1. **Telegram credential**: replace all `__REPLACE_TELEGRAM_CREDENTIAL__` with your bot credential after import
2. **Together AI API key**: add in n8n Settings → Variables → `TOGETHER_API_KEY`
3. **Import file**: always import `WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v4_0.json`

---

## Changelog

### v4.0 (current)

**Fix: GEN: OpenRouter Normalize — 500 Internal Server Error on image upload**
- Root cause: `Build Normalize Body` node sent `response_format: { type: 'json_object' }` together with a vision request (base64 `image_url`). This combination is unsupported by most OpenRouter models and causes a 500 error.
- Fix 1: `response_format` is now omitted when an image is present. The prompt still explicitly requests a JSON object, so the model returns JSON correctly.
- Fix 2: base64 image truncated to max ~500 KB to prevent request-too-large errors from Telegram high-res photos.
- Base: v3.9 (106 nodes, all other nodes unchanged)

### v3.9

**Commit: GEN node (Together AI)**
- Added `GEN: Together AI Image` node between `Build Design Concepts` and `IF Draw Flow Item`
- Uses `FLUX.1-schnell-Free` model via Together AI API
- Falls back to pollinations.ai URL if API key missing or request fails
- No other nodes touched

**Commit: Restore Generate Visuals button**
- Fixed `IF Last Concept` condition (was unreliable with single string check)
- Changed to OR with two conditions: item pairing + text/caption check
- Changed typeValidation from strict to loose
- Path confirmed: `Send Concept Text Fallback → IF Last Concept TRUE → IF Render Mode FALSE → Send Design Paywall CTA`

**Commit: Fix DRAW mode sending photos by URL**
- Root cause: Download-retry chain (Design Context Keeper → Download Design Concept Image → Merge Design Download Context) was silently failing in all 3 URL attempts, causing fallback to text
- Fix: Added `Send Concept Photo URL` Telegram node that sends photo directly by URL (Telegram fetches the image from Together AI CDN or pollinations.ai)
- Rewired: `Prepare Image URLs → Send Concept Photo URL → IF Last Concept`
- Old download chain preserved in workflow but disconnected from this path
- User experience: clicking "Сгенерировать 5 визуальных концептов" now sends 5 real images

### v3.8 (base)
- Enhanced `Build Design Concepts` with `image_prompt` field (ready English prompts per concept)
- 104 nodes, pollinations.ai as image source

---

## Common Issues & Fixes

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| Colored placeholder images (placehold.co) | `Build Concept Fallback Text` → `IF DRAW Fallback` → `Send Concept Fallback Photo` sent placehold.co URL when download failed | Added GEN node, changed to URL-based send |
| Button "Generate Visuals" not appearing after text concepts | `IF Last Concept` condition not matching (Telegram response format issue) | Made condition robust with OR + item pairing |
| After button click: text concepts appear again instead of images | `Merge Design Download Context` node fails silently in retry loop, all 3 URLs exhaust → text fallback | Replaced download chain with direct URL-based sendPhoto |

---

## Development Notes

- **Scripts**: Use `.mjs` files (ESM) with `node script.mjs`. Python unavailable (Windows Store stub).
- **JSON manipulation**: Never hand-edit workflow JSON directly. Write `.mjs` scripts.
- **Git**: Repo at `C:\Claude Code Projects\WB-Ozon-Bot-pro\`, push to `origin/main`
- **Credentials in JSON**: `__REPLACE_TELEGRAM_CREDENTIAL__` is placeholder — user must reassign after import
- **n8n version**: Uses typeVersion 2 for IF nodes, typeVersion 3.4 for Set nodes, typeVersion 1.2 for Telegram nodes, typeVersion 4 for HTTP Request nodes
- **Set node (typeVersion 3.4) default**: Keeps ALL existing fields AND adds/overrides specified ones (options: {} = keep all)

---

## File Index

```
WB-Ozon-Bot-pro/
├── WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v4_0.json  ← CURRENT (import this)
├── project.md              ← THIS FILE — project knowledge base
├── make_v4_0.mjs           ← script: creates v4_0 from v3_9 + applies OpenRouter fix
└── archive/                ← all previous versions (v3.1–v3.9) + old scripts
```
