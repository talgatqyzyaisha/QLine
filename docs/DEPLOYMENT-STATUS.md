# Состояние подключения и выката — 15 октября 2026

- Рабочий URL: https://qline-production.up.railway.app.
- Railway: проект calm-contentment, сервис QLine, production. Docker Node.js 24 + Express, порт 8080.
- GitHub: talgatqyzyaisha/QLine, ветка launch/express-supabase поверх существующей main; force push не использовался. Railway source закреплён за этой веткой.
- Supabase: aszdjopjlzfkyqguqeps. До миграций read-only проверка показала 0 public tables, 0 public functions, 0 auth.users и отсутствие истории миграций. После локальной проверки и dry-run применены 20261015000000 и 20261015010000. Reset не выполнялся.
- Публичный HTTPS: главная, /api/health, /api/ready, /api/services и /api/clinics вернули 200. Readiness вернул storage=supabase; услуги загружаются из настоящей БД. Клиник пока нет.
- Backend/.env и временные файлы исключены из Git. Секреты Railway переданы через stdin без вывода значений.

## Что ещё закрывает полный запуск

Регистрация и запись остаются выключены (LEGAL_APPROVED=false): RU/KZ документы и версия согласия не утверждены. Защита согласий не отключалась.

Реальная регистрация, доставка писем, подтверждение email, вход и recovery end-to-end ещё не проверены. Нужны утверждённые документы, SMTP, hosted Auth settings, email-шаблоны и redirect allowlist на рабочий origin. Код этих сценариев проверен модульными и HTTP-тестами с подменой провайдера.

Это работающий технический deployment, но ещё не открытый для пациентов пилот.
