# Habit Tracker

Личная система целей: цели с этапами и сроками, задачи по матрице Эйзенхауэра,
ценности, журнал изменений, статистика — и привычки как один из шести экранов.

Имя историческое: проект начинался как трекер привычек, репозиторий и заголовок
страницы остались прежними. Привычки сегодня — меньшая часть приложения.

Тёмная тема, русский интерфейс, вёрстка под телефон. Данные лежат в Supabase и
привязаны к аккаунту — доступны с любого устройства после входа по email и
паролю.

**Демо:** https://quietfault.github.io/habit-tracker/

## Стек

React 18 + Vite 5 (JavaScript) · Supabase (Postgres + Auth) · recharts ·
lucide-react · деплой на GitHub Pages пакетом `gh-pages`.

Роутера нет: шесть экранов переключаются состоянием, без URL.

## Установка

```bash
git clone https://github.com/quietfault/habit-tracker.git
cd habit-tracker
npm install
```

**1. База.** Создайте проект в [Supabase](https://supabase.com).

⚠️ [`schema.sql`](schema.sql) в этом репозитории **устарел**: он описывает две
таблицы (`habits`, `completions`), а приложение работает с двенадцатью, и даже у
`habits` в файле нет колонок `group_id` и `target_per_week`. Поднять рабочую базу
по нему нельзя. Актуальный DDL надо выгружать из живого проекта Supabase — см.
[CLAUDE.md](CLAUDE.md), раздел «Архитектура данных».

Что бы вы ни накатывали — не забудьте права роли `authenticated`, в схеме их нет:

```sql
grant select, insert, update, delete on public.habits, public.completions to authenticated;
```

Роли `anon` права не выдавайте: без этого анонимный запрос не пройдёт даже
теоретически, независимо от политик.

**2. Ключи.** `.env` в проекте не используется. URL проекта и publishable-ключ
(`sb_publishable_...`) зашиты константами в
[`src/supabaseClient.js`](src/supabaseClient.js) — правьте их там.

Оба значения публичны по дизайну Supabase: они в любом случае уезжают в
собранный бандл и видны каждому, кто откроет сайт. Доступ к данным ограничивает
Row Level Security, а не секретность ключа. Секретный `sb_secret_...` в
браузерное приложение не попадает никогда.

**3. Вход.** В Supabase → Authentication должен быть включён Email-провайдер с
паролем. Там же после создания своего аккаунта имеет смысл выключить
«Allow new users to sign up» — иначе регистрация открыта всем, а кнопка
«зарегистрироваться» выведена прямо в интерфейс публичного сайта.

## Запуск

```bash
npm run dev      # дев-сервер
npm run build    # сборка в dist/
npm run preview  # посмотреть собранное локально
```

## Деплой

```bash
npm run deploy   # vite build + публикация dist/ в ветку gh-pages
```

Ручной деплой, без CI: пуш в `main` сайт не обновляет.

В [`vite.config.js`](vite.config.js) задан `base: "./"` — пути относительные,
сборка работает под любым именем репозитория на GitHub Pages, править ничего не
нужно.

## Модель данных

Двенадцать таблиц в `public`, все с `user_id` и RLS по `auth.uid() = user_id`:
`habits`, `completions`, `groups`, `goals`, `goal_groups`, `goal_stages`,
`goal_events`, `goal_habit_links`, `goal_value_links`, `values_list`, `tasks`,
`subtasks`.

Ядро модели привычек: `completions` — одна строка = (привычка, день), первичный
ключ `(habit_id, day)`. Отдельного флага «выполнено» нет: галочка — это
существование строки.

Подробнее — [CLAUDE.md](CLAUDE.md), решения и отвергнутые варианты —
[DECISIONS.md](DECISIONS.md).
