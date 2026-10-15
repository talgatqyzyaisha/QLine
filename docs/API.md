# HTTP API
Same-origin `/api`. JSON; мутации требуют `Origin: APP_ORIGIN`. Cookie HttpOnly, SameSite=Strict, Secure в production. Фронтенд не получает access/refresh token. Лимиты — 100 запросов/минуту и 15 auth-запросов/15 минут на IP. Для нескольких серверов подключить общий rate-limit store.

| Метод и маршрут | Доступ | Поведение |
|---|---|---|
| GET /health | Публичный | Проверка процесса и режима, без секретов |
| GET /me | Все | Профиль либо null |
| GET /services | Публичный | Локализованные категории |
| GET /clinics, /clinics/:slug | Публичный | Только опубликованные карточки |
| GET /slots?clinic=&service=&dentist=&date= | Публичный | Только будущие открытые свободные интервалы |
| POST /auth/send-code | Публичный, rate limit | Запрос OTP через Supabase, только SMS_ENABLED |
| POST /auth/verify | Публичный, rate limit | Проверка OTP, безопасные cookie |
| POST /auth/demo | Только demo в development | Явные тестовые роли |
| POST /auth/logout | Сессия | Отзыв сессии и очистка cookie |
| GET /appointments | Пациент | Только собственные записи, включая карточку своей клиники |
| POST /appointments | Пациент | slot_id, name, phone, comment?, consent=true, idempotency_key |
| PATCH /appointments/:id | Проверка роли | status или reschedule_request или новый slot_id сотрудником |
| PATCH /profile | Пользователь | Контактные имя/телефон, не смена номера для входа |
| POST /clinic-register | Пользователь | Заявка клиники на модерацию |
| GET /clinic | Сотрудник | Своя клиника, расписание, записи, настройки |
| PATCH /clinic/profile | Менеджер | Описания и адрес RU/KZ |
| POST /clinic/dentists | Менеджер | Имя RU/KZ, специализация |
| POST /clinic/services | Менеджер | Категория, цена, длительность, dentist_ids |
| POST /clinic/slots | Менеджер | dentist_id, service_id, starts_at, ends_at |
| PATCH /clinic/slots/:id | Менеджер | Открыть/закрыть без конфликта записи |
| POST /clinic/working-hours | Менеджер | Шаблон рабочего дня |
| POST /clinic/blocked | Менеджер | Перерыв/выходной, нельзя перекрыть существующий приём |
| PATCH /clinic/notifications | Менеджер | Предпочтения, не реальная отправка |
| GET /admin | Админ QLine | Модерация, категории, пользователи, журнал |
| PATCH /admin/clinics/:id | Админ QLine | Подтвердить/скрыть с аудитом |
| POST /admin/categories | Админ QLine | Новая категория RU/KZ |
| PATCH /admin/users/:id | Админ QLine | blocked; нельзя заблокировать себя |
| PATCH /admin/complaints/:id | Админ QLine | Завершить рассмотрение |

Ошибки: `{code: 'INVALID'|'UNAUTHORIZED'|'FORBIDDEN'|'NOT_FOUND'|'CONFLICT'|'OFFLINE'|'SERVER'|'SMS_DISABLED'|'LEGAL_PENDING'}`. Стек ошибок, SQL и токены не возвращаются.

Ограничение первого MVP: небольшой каталог целиком загружается в клиент; фильтрация, сортировка и страницы выдачи работают на клиенте, доступность проверяется API. Кабинет также получает свою выборку для локальных страниц. Для масштабного запуска требуется серверная пагинация/filter pushdown, а не увеличение лимитов PostgREST.
