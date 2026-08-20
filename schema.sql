-- ═════════════════════════════════════════════════════════════
-- ⚠️ ОТРАБОТАЛ. НЕ ЗАПУСКАТЬ. Помечено 2026-08-20.
--
-- Это первая схема проекта (июнь 2026). Приложение с тех пор ушло
-- вперёд и работает с двенадцатью таблицами; здесь описаны две, и
-- даже у habits не хватает колонок group_id и target_per_week.
-- Политик RLS на остальные десять таблиц тут нет, грантов роли
-- authenticated нет вообще ни одного. Вставка «целиком и запустить»
-- даёт неработающую базу и 42501 permission denied.
--
-- Расхождение найдено 2026-08-15 при сплошном чтении src/, см.
-- ЛЕТОПИСЬ.md. Актуальный DDL выгружается из живого проекта Supabase —
-- CLAUDE.md, раздел «Архитектура данных»; перезапись этого файла висит
-- долгом в STATUS.md.
--
-- Файл оставлен на месте как первоисточник: по нему видно, с чего
-- начиналась модель данных. Ниже — исходный текст без изменений,
-- вместе с исходной инструкцией, которая больше не верна.
-- ═════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- Схема для трекера привычек. Вставь это целиком в Supabase →
-- SQL Editor → New query → Run.
-- ─────────────────────────────────────────────────────────────

-- Привычки
create table public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Отметки выполнения: одна строка = (привычка, день)
create table public.completions (
  habit_id  uuid not null references public.habits(id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day       date not null,
  primary key (habit_id, day)
);

-- Включаем Row Level Security: без политик никто ничего не видит
alter table public.habits      enable row level security;
alter table public.completions enable row level security;

-- Каждый пользователь видит и меняет ТОЛЬКО свои строки
create policy "own habits" on public.habits
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own completions" on public.completions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
