# Проверки версии 0.2.0

| Проверка | Фактический результат |
|---|---|
| npm run check | Синтаксис исходников и HTML прошёл |
| npm test | 19/19 модульных и render-тестов прошли |
| npm run build | Проверки production-исходников прошли; статическое демо не генерируется |
| Auth-service | Валидация, отсутствие повышения ролей, consent, generic login error, recovery signature/expiry/session binding, refresh concurrency проверены на mock boundary |
| Supabase HTTP adapter | Проверены apikey-only для publishable key, пользовательский JWT, ошибки без утечки provider messages и schema-missing |
| Frontend | RU/KZ auth-формы, каталог, роли кабинетов, подписи адаптивных таблиц, меню/клавиатура в EventTarget stubs |
| Express HTTP integration | Тесты подготовлены; не выполнены из-за npm registry 403 |
| PostgreSQL | CI job и SQL/RLS/race-тесты подготовлены; здесь не выполнены |
| Реальный Supabase/Auth/SMTP | Не проверены: сеть 403, нет управленческой сессии |
| GitHub/Railway | Нет push/deploy, не утверждается успех |
| Браузер/реальные устройства | Не проверены; viewport и доступность требуют настоящего browser QA |

Старые тесты фиктивного хранилища вынесены из runtime и больше не объявляются проверкой надёжности production-бронирования. Тестовые фикстуры используются только в изолированных render-тестах и исключены из Docker.

Важные ограничения: нет lockfile до успешной установки; hosted Auth settings/SMTP не меняются от одного редактирования CLI config; корпоративные приложения Supabase/Railway отключены администратором; правку настоящего GitHub нельзя безопасно сделать до чтения его содержимого.
