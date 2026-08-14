# Трекер привычек

Персональный трекер привычек: список привычек, сетка дней, отметил день —
привычка сделана. Тёмная тема, русский интерфейс, рассчитан на телефон.

Данные лежат в Supabase и привязаны к аккаунту — доступны с любого устройства
после входа. Вход по magic link: письмо со ссылкой, пароля нет.

**Демо:** https://quietfault.github.io/habit-tracker/

## Стек

React 18 + Vite 5 (JavaScript) · Supabase (Postgres + Auth) · recharts ·
lucide-react · деплой на GitHub Pages пакетом `gh-pages`.

## Установка

```bash
git clone https://github.com/quietfault/habit-tracker.git
cd habit-tracker
npm install
```

**1. База.** Создайте проект в [Supabase](https://supabase.com), откройте
SQL Editor → New query, вставьте целиком [`schema.sql`](schema.sql) и нажмите
Run. Затем — там же — выдайте права роли `authenticated`, в самом файле их нет:

```sql
grant select, insert, update, delete on public.habits, public.completions to authenticated;
```

Роли `anon` права не выдавайте: без этого анонимный запрос не пройдёт даже
теоретически, независимо от политик.

**2. Ключи.** Скопируйте `.env.example` в `.env` и заполните значениями из
Supabase → Project Settings → API:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

Anon key публичный по дизайну Supabase — доступ к данным ограничивает Row Level
Security, а не секретность ключа. Тем не менее `.env` в гите не место, он в
`.gitignore`.

**3. Вход.** Убедитесь, что в Supabase → Authentication включён Email-провайдер
(magic link). Если сайт задеплоен — там же пропишите Site URL и Redirect URLs,
иначе ссылка из письма приведёт не туда.

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

Ручной деплой, без CI: пуш в `main` сайт не обновляет. Сборка происходит
локально, поэтому запускать надо на машине, где лежит заполненный `.env`.

В `vite.config.js` `base` должен совпадать с именем репозитория
(`'/habit-tracker/'`) — иначе опубликованная страница будет искать свои файлы не
по тому пути и покажет белый экран.

## Модель данных

Две таблицы. `habits` — привычки. `completions` — отметки: одна строка =
(привычка, день), первичный ключ `(habit_id, day)`. Отдельного флага
«выполнено» нет: галочка — это существование строки. Обе таблицы закрыты RLS по
`auth.uid() = user_id`, чужие строки не видны и не записываются.

Подробнее — [CLAUDE.md](CLAUDE.md), решения и отвергнутые варианты —
[DECISIONS.md](DECISIONS.md).
