# Проверки — 15 октября 2026

| Проверка | Результат |
|---|---|
| npm install | Успешно; package-lock.json создан; npm audit: 0 уязвимостей |
| npm run check | 31 JS-модуль и HTML entry checks прошли |
| npm test | 19/19 |
| npm run test:http | 6/6, реальный Express HTTP с подменой Supabase boundary |
| npm run build | Пройдено, в том числе на Windows после исправления file URL |
| PostgreSQL 17 | Обе миграции применены к изолированной базе; RLS, lifecycle, idempotency, consent version, запрет metadata role escalation и blocked-user access прошли; фикстуры RLS откатились |
| Конкурентная запись | Два отдельных подключения: один commit, один CONFLICT, одна активная запись |
| Целевой Supabase | Схема проверена до изменений, dry-run и обе миграции прошли; doctor подтвердил Auth и qline_api |
| GitHub | История изучена; изменения загружены в launch/express-supabase без force push |
| Railway HTTPS | https://qline-production.up.railway.app: /, /api/health, /api/ready, /api/services, /api/clinics — 200; readiness storage=supabase |

Исправлены Windows-путь в build и HTTP cookie jar: повторный Set-Cookie заменяет прежнюю cookie, как в браузере. SQL-тесты запускаются через pg без зависимости от установленного psql, только при QLINE_TEST_DATABASE=true; bootstrap отказывается работать с непустой базой.

Не подтверждены: GitHub CI result, SMTP-доставка и полный реальный Auth/recovery flow. Регистрация/booking закрыты до утверждённых RU/KZ документов и версии согласия. Клиники не подменяются демонстрационными данными.
