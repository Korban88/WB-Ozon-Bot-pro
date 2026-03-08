/**
 * Simulate the design concept chain logic to verify correctness
 */

// Simulate Telegram sendMessage response (TEXT mode)
function mockTelegramTextResponse(text) {
  return {
    message_id: 123,
    from: { id: 12345678 },
    chat: { id: 987654321, type: 'private' },
    date: 1700000000,
    text: text  // Telegram strips HTML tags
  };
}

// Simulate Telegram sendPhoto response (DRAW mode)
function mockTelegramPhotoResponse(caption) {
  return {
    message_id: 124,
    from: { id: 12345678 },
    chat: { id: 987654321, type: 'private' },
    date: 1700000000,
    caption: caption,
    photo: [
      { file_id: 'AgAC...', file_size: 10000, width: 320, height: 320 },
      { file_id: 'AgAD...', file_size: 50000, width: 800, height: 800 },
    ]
  };
}

// IF Last Concept logic (new guaranteed)
function ifLastConcept(json) {
  const text = (json.text || json.caption || '').toString();
  return text.includes('5/5');
}

// IF Render Mode logic (new guaranteed)
function ifRenderMode(json) {
  return Array.isArray(json.photo) && json.photo.length > 0;
}

console.log('=== TEXT MODE SIMULATION ===');
for (let i = 1; i <= 5; i++) {
  // Build Design Concepts produces: "КОНЦЕПТ i/5 — «Style»\n..."
  const conceptText = `КОНЦЕПТ ${i}/5 — «Минимализм Premium»\n\nТовар: Электрочайник\nМаркетплейс: WB · Категория: Электроника`;
  // Telegram strips HTML (no HTML tags in this text)
  const tgResponse = mockTelegramTextResponse(conceptText);

  const isLast = ifLastConcept(tgResponse);
  const renderMode = isLast ? ifRenderMode(tgResponse) : null;

  const route = isLast
    ? (renderMode ? '→ Send Design Done (DRAW)' : '→ Send Design Paywall CTA (TEXT) ← BUTTON!')
    : '→ (chain ends, concept sent)';

  console.log(`Concept ${i}/5: isLast=${isLast}, ${route}`);
}

console.log('\n=== DRAW MODE SIMULATION ===');
for (let i = 1; i <= 5; i++) {
  const caption = `Концепт ${i}/5 — Минимализм Premium`;
  const tgResponse = mockTelegramPhotoResponse(caption);

  const isLast = ifLastConcept(tgResponse);
  const renderMode = isLast ? ifRenderMode(tgResponse) : null;

  const route = isLast
    ? (renderMode ? '→ Send Design Done ✓' : '→ Send Design Paywall CTA (wrong!)')
    : '→ (chain ends, photo sent)';

  console.log(`Concept ${i}/5: isLast=${isLast}, ${route}`);
}

console.log('\n=== FULL BUTTON FLOW ===');
console.log('1. User sends DESIGN_CONCEPT callback');
console.log('2. IF Design Concept → IF Design Feature Enabled → IF Draw Design Paid');
console.log('3. TEXT mode: Send Design Progress + Set Render Mode TEXT → Build Design Concepts');
console.log('4. Build Design Concepts → 5 items, each goes:');
console.log('   IF Draw Flow Item [main:1] → Build Concept Fallback Text → Send Concept Text Fallback');
console.log('   → IF Last Concept checks text.includes("5/5")');
console.log('   concepts 1-4: FALSE → chain ends');
console.log('   concept 5: TRUE → IF Render Mode → $json.photo = undefined → FALSE → Send Design Paywall CTA');
console.log('5. Send Design Paywall CTA sends: "🖼 Сгенерировать 5 визуальных концептов" button ✓');
console.log();
console.log('6. User clicks "GENERATE_VISUALS_5"');
console.log('7. IF Design Concept matches → IF Draw Design Paid matches GENERATE_VISUALS_5 → DRAW mode');
console.log('8. Set Render Mode DRAW → Build Design Concepts → IF Draw Flow Item [main:0]');
console.log('   → Prepare Image URLs → Design Context Keeper → Download + Merge → Send photo ×5');
console.log('   concept 5: IF Last Concept checks caption.includes("5/5") = TRUE');
console.log('   → IF Render Mode → $json.photo = array → TRUE → Send Design Done ✓');
