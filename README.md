# QLine — Express + Supabase

Рабочая ветка для перехода от демонстрации к настоящему приложению: HTML5 / CSS3 / ES Modules, Node.js 24 + Express 5, Supabase PostgreSQL и Auth. Русский и казахский интерфейс, KZT и Asia/Almaty.

**Текущий статус:** код переведён на настоящий API, тестовый вход и локальная база удалены из runtime. Публичные страницы не подставляют вымышленные клиники при недоступном сервере. Supabase-проект указан, но фактическое соединение, применение миграций, загрузка GitHub и развёртывание Railway в этой среде ещё не выполнены: внешние запросы блокируются HTTP 403; GitHub не авторизован; подключения Supabase/Railway отключены администратором рабочего пространства. Строка PostgreSQL с `[YOUR-PASSWORD]` не предоставляет доступ к БД.

Целевой репозиторий: https://github.com/talgatqyzyaisha/QLine. Его содержимое пока не удалось прочитать; нельзя считать его пустым или безопасно перезаписывать историю.

## Структура

| Каталог | Содержимое |
|---|---|
| `Frontend/` | HTML, адаптивный CSS, JS-модули, RU/KZ, страницы и компоненты |
| `Frontend/js/auth.js` | Регистрация, вход, подтверждение email, восстановление и смена пароля, опциональный SMS-вход |
| `Frontend/js/api.js` | Только same-origin Express API, timeout и ошибки; без localStorage записей/токенов |
| `Frontend/js/data.js` | Пустой массив услуг, заполняемый сервером; форматирование, без клиник/цен-заглушек |
| `Frontend/content/legal.*.json` | Неутверждённые документы и контакты; заполнить реальными согласованными текстами |
| `Backend/src/app.js` | HTTP API, cookie, CSRF Origin, rate limit, заголовки безопасности |
| `Backend/src/auth.js` | Supabase Auth flow, refresh-дедупликация, подписанный recovery proof |
| `Backend/src/supabase.js` | Native fetch к Supabase; publishable key в apikey, JWT пользователя отдельно |
| `Backend/src/config.js` | Валидация окружения и доступности регистрации/записи |
| `Backend/supabase/` | CLI config и две timestamp-миграции схемы/RLS/Auth |
| `Backend/test/` | Модульные тесты; фикстуры используются только тестами |
| `Backend/integration/` | Настоящие HTTP-тесты Express и изолированная SQL-среда CI |
| `shared/domain.js` | Общая валидация телефона, формы записи и возвратного URL |
| `scripts/` | Проверки, диагностика соединения и тест конкурентной записи |
| `.github/workflows/ci.yml` | Node-тесты и отдельный PostgreSQL job с проверкой RLS/конкуренции |
| `Dockerfile`, `railway.toml` | Контейнер и Railway health check |

Модели БД: users, clinics, clinic_members, dentists, services, clinic_services, dentist_services, working_hours, blocked_slots, availability_slots, appointments, appointment_status_history, user_consents, reviews, notifications, notification_settings, complaints, audit_logs, runtime_settings.

## Локальный запуск

Нужен Node.js 24 и доступ к npm registry.

```bash
npm install
cp Backend/.env.example Backend/.env
# Заполнить SUPABASE_PUBLISHABLE_KEY в Backend/.env.
npm run dev
```

Открыть http://localhost:3000. Без доступного Supabase и применённых миграций API вернёт ошибку настройки, а не демонстрационные результаты.

`Backend/.env` исключён из Git и Docker. В текущей рабочей папке уже записаны переданные пользователем URL/публичный ключ; секрет сессии сгенерирован локально. В скачиваемый архив `.env` не включается.

## Supabase: подключение и миграции

Сначала проверить, что это нужный проект и что в нём нет конфликтующей схемы. Перед изменением существующего проекта нужна резервная копия. Не запускать db reset на рабочем проекте.

```bash
npx supabase login
npx supabase --workdir Backend link --project-ref aszdjopjlzfkyqguqeps
npx supabase --workdir Backend db push --dry-run
npx supabase --workdir Backend db push
```

Команды подготовлены, но здесь не выполнялись: Supabase CLI не установлен и нет управленческой сессии/пароля БД. `supabase login` на другом компьютере не авторизует эту среду автоматически. Публичный ключ приложения не позволяет выполнять DDL или назначать администратора.

Миграции:

1. `20261015000000_initial.sql`: основная схема, RLS, qline_api, блокировки и GiST-ограничения пересечений приёмов, история статусов и аудит.
2. `20261015010000_auth_production.sql`: неизменяемая запись согласия при регистрации, начальное имя, отсутствие повышения роли из user_metadata, запрет публичного чтения идентификаторов пациентов из таблицы отзывов, удаление иллюстративных цен/фото по умолчанию.

Для аккаунтов не используются выбираемые роли. Новый пользователь — пациент; владелец появляется через заявку клиники; роли сотрудников выдаёт уполномоченный оператор. Права проверяются БД, а не параметрами клиента. Первая платформа-admin назначается оператором SQL, только известному auth.users.id:

```sql
update public.users set platform_admin = true where id = '<verified-operator-user-id>';
```

## Авторизация и письма

Реализованы страницы `/register`, `/login`, `/forgot-password`, `/auth/confirm`, `/reset-password`. Вход по телефону `/login/phone` предназначен только для уже подтверждённых номеров и становится доступен после подключения SMS.

В Dashboard Supabase:

1. Включить Email/Password и подтверждение email, установить минимальную длину пароля 12.
2. Настроить реальный SMTP для отправки писем всем нужным пользователям. Встроенная почта Supabase имеет ограничения и не считается настроенной production-доставкой.
3. Установить Site URL на будущий HTTPS origin Railway. Добавить `<origin>/auth/confirm` в допустимые redirect URL. Для локальной разработки — http://localhost:3000/auth/confirm.
4. Настроить шаблоны писем из `docs/auth-emails/`.
5. Согласовать RU/KZ документы, заполнить `Frontend/content/legal.ru.json` и `.kz.json`, одинаковую версию согласия указать в переменной CONSENT_VERSION и БД:

```sql
update public.runtime_settings
set legal_approved = true, consent_version = '<actually-reviewed-version>'
where id = true;
```

После реального утверждения выставить `LEGAL_APPROVED=true` и ту же `CONSENT_VERSION`, затем перезапустить/развернуть приложение. До этого сайт может работать на настоящем Supabase, но регистрация и отправка заявок недоступны. Флаги не заменяют согласование документов; фиктивные юридические тексты не добавлены.

Подтверждение ссылки требует нажатия кнопки пользователем: почтовый сканер не расходует одноразовый token_hash автоматически. После открытия токен удаляется из адресной строки. Сессия — HttpOnly cookie, в production Secure с префиксом `__Host-`, SameSite=Lax и CSRF Origin на мутациях. Токены/пароли не возвращаются браузеру в JSON и не сохраняются в localStorage.

Для смены пароля недостаточно обычного входа: нужен свежий recovery flow и подписанное доказательство, связанное с проверенным user_id/session_id на десять минут. После изменения запрашивается отзыв всех сессий. При ошибке отзыва пользователь получает отдельное сообщение: факт смены пароля не скрывается.

## GitHub

Не делать force push. После предоставления доступа сначала прочитать репозиторий и ветки, затем перенести эти исходники в отдельную ветку, проверить конфликты и открыть PR либо загрузить согласованным способом.

Исключить `.env`, ключи доступа, .git текущей папки, .openai, node_modules, dist и runtime-данные. `.github/workflows/ci.yml` подготовлен. `package-lock.json` пока отсутствует: npm registry возвращал 403. После первой успешной установки добавить lockfile в репозиторий; CI/Docker уже предпочитают npm ci при его наличии.

## Railway

1. Подключить нужный GitHub-аккаунт в Railway и выбрать `talgatqyzyaisha/QLine` после загрузки проверенного кода.
2. Корень сервиса — корень репозитория. Railway использует Dockerfile; отдельной статической frontend-публикации не нужно.
3. Создать домен сервиса и заполнить переменные из таблицы ниже. APP_ORIGIN должен точно совпадать с HTTPS origin без завершающего слеша.
4. SESSION_SECRET создать криптографически случайным, минимум 32 символа; одинаковый для всех экземпляров приложения. Не писать его в репозиторий.
5. Применить миграции до выката. Healthcheck `/api/ready` должен получить 200 от настоящего database API; `/api/health` проверяет только Node-процесс.
6. Обновить Supabase Site URL / allowlist / SMTP-шаблоны на Railway domain и пройти реальный end-to-end сценарий регистрации, письма, входа и записи.

Docker запускает Node от непривилегированного пользователя и не включает тестовые фикстуры. Приложение слушает `0.0.0.0` и PORT от Railway. railway.toml задаёт healthcheck и один экземпляр: in-memory rate limit не рассчитан на распределённый кластер.

## Переменные

| Переменная | Назначение |
|---|---|
| NODE_ENV | production на Railway |
| PORT | Railway задаёт сам; локально 3000 |
| APP_ORIGIN | Точный HTTPS origin сервиса |
| SUPABASE_URL | https://aszdjopjlzfkyqguqeps.supabase.co |
| SUPABASE_PUBLISHABLE_KEY | Переданный публичный ключ; apikey header |
| SESSION_SECRET | Секрет подписи recovery proof, 32+ случайных символа |
| SMS_ENABLED | false до реального SMS-провайдера |
| LEGAL_APPROVED | false до утверждения документов |
| CONSENT_VERSION | Реальная согласованная версия, одинаковая в БД и приложении |
| TRUST_PROXY | 1 за единственным доверенным Railway proxy; проверить при развёртывании |

`SUPABASE_ACCESS_TOKEN`/пароль БД нужны оператору для миграций; Railway token и GitHub credentials — инструментам развёртывания. Они не нужны в frontend и не должны попадать в Git.

## Проверки и реальное состояние

```bash
npm run check
npm test
npm run build
npm run test:http     # после установки Express-зависимостей
npm run doctor        # настоящий проект, read-only диагностика
```

Локально прошли 19 тестов валидации/Auth-service/рендера и синтаксическая проверка. Auth-provider в тестах подменён. Это не доказательство работы реальной почты или БД.

HTTP integration, PostgreSQL RLS/конкуренция, реальный браузер, GitHub CI и Railway build пока не запущены в этой среде. GitHub CI подготовлен для их выполнения после получения доступа. Для CI используется изолированный PostgreSQL со вспомогательной auth-схемой; он проверяет SQL-контракт, но не заменяет интеграцию с настоящим Supabase Auth.

Перед пилотом: `docs/PILOT-CHECKLIST.md`, `docs/VERIFICATION.md`, `docs/DEPLOYMENT-STATUS.md`.

## Остающиеся внешние подключения

Настоящие Supabase migrations/Auth/SMTP; доступ к GitHub и Railway; проверенные клиники, фотографии/контакты и тарифы; SMS и отправщик напоминаний; юридические документы. Внешние карты, CRM-sync, сбор проверенных отзывов и приём обращений не объявляются реализованными. Внутренние статусы и настройки сохраняются через Supabase, уведомления без отправщика остаются очередью.
