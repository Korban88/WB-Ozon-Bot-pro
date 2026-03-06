# WB/Ozon PRO-bot (n8n 2.4.7)

Этот репозиторий содержит готовый импортируемый workflow:

- `WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_1.json`

## Требования окружения

Обязательные ENV:

- `OPENROUTER_API_KEY` — ключ OpenRouter для text-этапов.
- `OPENROUTER_TEXT_MODEL` — текстовая модель (по умолчанию в workflow: `openai/gpt-4o-mini`).
- `TELEGRAM_BOT_TOKEN` — нужен для HTTP-отправки фото дизайн-концептов (`sendPhoto`).
- `DESIGN_FEATURE_ENABLED` — флаг дизайн-фичи (`true`/`false`, по умолчанию ожидается `true`).

## Credentials в n8n

Подставить credential placeholders в Telegram нодах:

- `__REPLACE_TELEGRAM_CREDENTIAL__`

DataTable/Session используется как в текущем workflow (FSM по полю `stage`).

## Что реализовано

- FSM-диалог: marketplace -> category -> title -> benefits -> photo -> clarifications/final -> done.
- Глобальные команды: `Старт`, `Меню`, `Назад`, `Как это работает`.
- Контекстные выборы (marketplace/category/CTA) через InlineKeyboard.
- Форматирование финала в Telegram HTML с авто-разбиением на части (лимит < 4096).
- Кнопка `Сгенерировать дизайн-концепт` под финальным ответом.
- Отправка 5 концептов как фото через HTTP Telegram API.
- Fallback-поведение при сбоях парсинга/генерации.

## Мини тест-план

1. `/start` -> приходит меню.
2. Нажать `Сделать карточку` -> inline выбор marketplace.
3. Выбрать marketplace -> inline выбор категории.
4. Выбрать категорию -> запрос названия.
5. Ввести название -> запрос преимуществ.
6. Ввести преимущества -> запрос фото.
7. Отправить фото -> уточнения (если нужны) или финальная карточка.
8. Если уточнения пришли: ответить 1 сообщением -> получить финал.
9. Нажать `Сгенерировать дизайн-концепт` -> получить 5 фото.
10. На стадии clarifications отправить `/start` -> должен быть чистый возврат в меню без записи `/start` в ответы уточнений.
