/*
 * QLine — избранные стоматологи (демо-версия).
 *
 * Как и «Мои записи», избранное хранится в браузере (localStorage), отдельно для каждого
 * клиента: ключ `favorites_<id клиента>`. Один клиент не видит избранное другого.
 * Все методы возвращают Promise — так хранилище можно заменить на запросы к серверу
 * (GET/PUT/DELETE /api/favorites), не меняя код страниц.
 *
 * Файл подключается на главной, странице врачей и странице «Избранное».
 */
(() => {
    "use strict";

    /* ---------- каталог врачей ---------- */

    // Те же врачи, что на карточках в index.html и doctors.html (data-doctor-id на кнопке-сердце)
    const DOCTORS = {
        d1: { id: "d1", name: "Аружан Төлегенова", initials: "АТ", specialty: "Стоматолог-терапевт", city: "Алматы", rating: "4.9", reviews: 120, experience: "Опыт 6 лет", price: "от 5 000 ₸", photo: 1 },
        d2: { id: "d2", name: "Азамат Нұрланов", initials: "АН", specialty: "Стоматолог-ортопед", city: "Алматы", rating: "4.8", reviews: 98, experience: "Опыт 8 лет", price: "от 7 000 ₸", photo: 2 },
        d3: { id: "d3", name: "Динара Серікова", initials: "ДС", specialty: "Стоматолог-хирург", city: "Алматы", rating: "4.7", reviews: 76, experience: "Опыт 5 лет", price: "от 6 000 ₸", photo: 3 },
        d4: { id: "d4", name: "Роман Павлов", initials: "РП", specialty: "Стоматолог-ортодонт", city: "Алматы", rating: "4.9", reviews: 112, experience: "Опыт 7 лет", price: "от 8 000 ₸", photo: 4 }
    };

    const AUTH_ERROR = "AUTH_REQUIRED";

    /* ---------- хранилище ---------- */

    const userId = () => {
        const user = typeof window.getCurrentUser === "function" ? window.getCurrentUser() : null;
        return user ? user.id : null;
    };

    const keyFor = (id) => `favorites_${id}`;

    // Возвращает список записей без повторов; бросает ошибку, если хранилище недоступно
    const readAll = (id) => {
        const raw = localStorage.getItem(keyFor(id));
        let list = [];

        try {
            const parsed = raw ? JSON.parse(raw) : [];
            list = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            list = []; // повреждённые данные считаем пустым списком
        }

        const seen = new Set();
        return list.filter((entry) => {
            if (!entry || typeof entry.doctorId !== "string" || seen.has(entry.doctorId)) return false;
            seen.add(entry.doctorId);
            return true;
        });
    };

    const writeAll = (id, list) => {
        localStorage.setItem(keyFor(id), JSON.stringify(list));
    };

    // Любая операция: проверяет вход, выполняет работу, превращает сбои хранилища в понятную ошибку
    const run = (work) =>
        new Promise((resolve, reject) => {
            const id = userId();
            if (!id) {
                reject(new Error(AUTH_ERROR));
                return;
            }

            // setTimeout(0): как и настоящий запрос к серверу, ответ приходит не мгновенно
            setTimeout(() => {
                try {
                    resolve(work(id));
                } catch (error) {
                    reject(new Error("STORAGE"));
                }
            }, 0);
        });

    /* ---------- API ---------- */

    const list = () => run((id) => readAll(id).map((entry) => entry.doctorId));

    const add = (doctorId) =>
        run((id) => {
            if (!DOCTORS[doctorId]) throw new Error("UNKNOWN_DOCTOR");
            const items = readAll(id);
            if (!items.some((entry) => entry.doctorId === doctorId)) { // без дублей
                items.push({ doctorId, createdAt: new Date().toISOString() });
                writeAll(id, items);
            }
            return true;
        });

    const remove = (doctorId) =>
        run((id) => {
            const items = readAll(id).filter((entry) => entry.doctorId !== doctorId);
            writeAll(id, items);
            return false;
        });

    // Переключает врача: возвращает новое состояние (true — в избранном)
    const toggle = (doctorId) =>
        run((id) => {
            const items = readAll(id);
            const exists = items.some((entry) => entry.doctorId === doctorId);

            if (exists) {
                writeAll(id, items.filter((entry) => entry.doctorId !== doctorId));
                return false;
            }

            if (!DOCTORS[doctorId]) throw new Error("UNKNOWN_DOCTOR");
            items.push({ doctorId, createdAt: new Date().toISOString() });
            writeAll(id, items);
            return true;
        });

    const isAuthError = (error) => Boolean(error) && error.message === AUTH_ERROR;

    window.QLineFavorites = { DOCTORS, list, add, remove, toggle, isAuthError };

    /* ---------- интерфейс ---------- */

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };

    const currentPage = () => {
        const page = window.location.pathname.split("/").pop();
        return /^[a-z0-9_-]+\.html$/i.test(page) ? page : "index.html";
    };

    /* Предложение войти (для гостя) */

    let authModal = null;

    const closeAuthModal = () => {
        if (!authModal) return;
        authModal.classList.remove("is-open");
        authModal.setAttribute("aria-hidden", "true");
    };

    const openAuthModal = () => {
        if (!authModal) {
            const query = "?next=" + encodeURIComponent(currentPage());
            authModal = el("div", "modal");
            authModal.id = "favoriteAuthModal";
            authModal.setAttribute("aria-hidden", "true");

            const overlay = el("div", "modal__overlay");
            overlay.addEventListener("click", closeAuthModal);

            const box = el("div", "modal__box");
            box.setAttribute("role", "dialog");
            box.setAttribute("aria-modal", "true");
            box.setAttribute("aria-label", "Войдите, чтобы сохранять врачей");

            const close = el("button", "modal__close", "×");
            close.type = "button";
            close.setAttribute("aria-label", "Закрыть");
            close.addEventListener("click", closeAuthModal);

            const loginLink = el("a", "btn btn--primary btn--full", "Войти");
            loginLink.href = "login.html" + query;

            const registerLink = el("a", "btn btn--outline btn--full", "Создать аккаунт");
            registerLink.href = "register.html" + query;

            const actions = el("div", "fav-modal__actions");
            actions.append(loginLink, registerLink);

            box.append(
                close,
                el("div", "modal__icon", "♡"),
                el("h2", "", "Войдите, чтобы сохранять врачей"),
                el("p", "", "Избранные стоматологи сохраняются в вашем аккаунте и доступны после повторного входа."),
                actions
            );

            authModal.append(overlay, box);
            document.body.append(authModal);

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") closeAuthModal();
            });
        }

        authModal.classList.add("is-open");
        authModal.setAttribute("aria-hidden", "false");
        authModal.querySelector("a").focus();
    };

    /* Сообщение об ошибке */

    let toastTimer = null;

    const showToast = (message) => {
        let toast = document.getElementById("favoriteToast");
        if (!toast) {
            toast = el("div", "fav-toast");
            toast.id = "favoriteToast";
            toast.setAttribute("role", "alert");
            document.body.append(toast);
        }

        toast.textContent = message;
        toast.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4000);
    };

    const STORAGE_MESSAGE = "Не удалось обновить избранное. Проверьте, что браузер разрешает хранилище, и попробуйте ещё раз.";

    /* Сердце на карточке */

    const paint = (button, active) => {
        button.classList.toggle("is-favorite", active);
        button.textContent = active ? "♥" : "♡";
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", active ? "Удалить из избранного" : "Добавить в избранное");
    };

    const setBusy = (button, busy) => {
        button.disabled = busy;
        button.classList.toggle("is-loading", busy);
        button.setAttribute("aria-busy", String(busy));
    };

    // Подключает сердце: показывает актуальное состояние и переключает его по клику.
    // onChange(doctorId, active) вызывается после успешного изменения.
    const bindButton = (button, state, onChange) => {
        const doctorId = button.dataset.doctorId;
        if (!doctorId) return;

        paint(button, state.has(doctorId));

        button.addEventListener("click", async () => {
            if (button.disabled) return;

            if (!userId()) {
                openAuthModal();
                return;
            }

            setBusy(button, true);

            try {
                const active = await toggle(doctorId);
                if (active) state.add(doctorId); else state.delete(doctorId);
                paint(button, active);
                if (onChange) onChange(doctorId, active);
            } catch (error) {
                if (isAuthError(error)) openAuthModal();
                else showToast(STORAGE_MESSAGE);
            } finally {
                setBusy(button, false);
            }
        });
    };

    // Сердца на главной и странице врачей
    const initCardButtons = async () => {
        const buttons = [...document.querySelectorAll(".favorite[data-doctor-id]")];
        if (!buttons.length) return;

        const state = new Set();
        buttons.forEach((button) => {
            paint(button, false);
            if (userId()) setBusy(button, true); // пока грузим избранное из хранилища
        });

        if (userId()) {
            try {
                (await list()).forEach((id) => state.add(id));
            } catch (error) {
                showToast("Не удалось загрузить избранное. Обновите страницу.");
            }
        }

        buttons.forEach((button) => {
            setBusy(button, false);
            bindButton(button, state);
        });
    };

    /* Страница «Избранное» */

    const buildCard = (doctor) => {
        const card = el("article", "doctor-card");
        card.dataset.doctorId = doctor.id;

        const photo = el("div", `doctor-card__photo doctor-photo doctor-photo--${doctor.photo}`);
        photo.append(el("span", "", doctor.initials));

        const heart = el("button", "favorite", "♥");
        heart.type = "button";
        heart.dataset.doctorId = doctor.id;

        const rating = el("div", "rating", "★ ");
        rating.append(el("b", "", doctor.rating), document.createTextNode(" "), el("span", "", `(${doctor.reviews} отзывов)`));

        const book = el("a", "btn btn--primary btn--full", "Записаться");
        book.href = "doctors.html";

        card.append(
            photo,
            heart,
            el("h3", "", doctor.name),
            el("p", "doctor-card__specialty", doctor.specialty),
            rating,
            el("p", "experience", "◉ " + doctor.experience),
            el("p", "price", doctor.price),
            book
        );

        return card;
    };

    const initFavoritesPage = () => {
        const grid = document.getElementById("favoriteGrid");
        if (!grid) return;

        const boxes = {
            loading: document.getElementById("favoriteLoading"),
            error: document.getElementById("favoriteError"),
            empty: document.getElementById("favoriteEmpty"),
            guest: document.getElementById("favoriteGuest")
        };
        const count = document.getElementById("favoriteCount");

        const show = (name) => {
            Object.entries(boxes).forEach(([key, box]) => { box.hidden = key !== name; });
            grid.hidden = name !== "list";
            if (count) count.hidden = name !== "list";
        };

        const wordFor = (n) => (typeof window.getDoctorWord === "function" ? window.getDoctorWord(n) : "врачей");

        const state = new Set();

        const updateCount = () => {
            if (count) count.textContent = `${state.size} ${wordFor(state.size)}`;
            if (state.size === 0) show("empty");
        };

        const load = async () => {
            if (!userId()) {
                show("guest");
                return;
            }

            show("loading");
            state.clear();
            grid.replaceChildren();

            try {
                const ids = await list();
                ids.filter((id) => DOCTORS[id]).forEach((id) => state.add(id));
            } catch (error) {
                show("error");
                return;
            }

            if (state.size === 0) {
                show("empty");
                return;
            }

            [...state].forEach((id) => {
                const card = buildCard(DOCTORS[id]);
                grid.append(card);
                bindButton(card.querySelector(".favorite"), state, (doctorId, active) => {
                    if (!active) {
                        card.remove(); // повторное нажатие на сердце убирает врача из списка
                        updateCount();
                    }
                });
            });

            show("list");
            updateCount();
        };

        document.getElementById("favoriteRetry").addEventListener("click", load);

        const query = "?next=favorites.html";
        document.querySelectorAll("[data-fav-login]").forEach((link) => { link.href = "login.html" + query; });
        document.querySelectorAll("[data-fav-register]").forEach((link) => { link.href = "register.html" + query; });

        load();
    };

    document.addEventListener("DOMContentLoaded", () => {
        initCardButtons();
        initFavoritesPage();
    });
})();
