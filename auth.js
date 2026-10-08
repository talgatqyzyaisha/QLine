/*
 * QLine — регистрация и вход (демо-версия).
 *
 * Данные хранятся в браузере (localStorage), сервера нет.
 * Пароли не хранятся в открытом виде: используется соль + PBKDF2 (Web Crypto).
 * Для настоящего сайта клиники то же самое нужно делать на сервере с базой данных.
 */
(() => {
    "use strict";

    const USERS_KEY = "qline_users";
    const SESSION_KEY = "qline_session";

    /* ---------- хранилище ---------- */

    const readJSON = (storage, key, fallback) => {
        try {
            const raw = storage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    };

    const writeJSON = (storage, key, value) => {
        try {
            storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    };

    const getUsers = () => readJSON(localStorage, USERS_KEY, []);

    const normalizeEmail = (email) => email.trim().toLowerCase();

    /* ---------- пароли ---------- */

    const toHex = (bytes) =>
        [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

    const makeSalt = () => {
        const bytes = new Uint8Array(16);
        if (window.crypto && crypto.getRandomValues) {
            crypto.getRandomValues(bytes);
        } else {
            bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256); });
        }
        return toHex(bytes);
    };

    const hashPassword = async (password, salt) => {
        const encoder = new TextEncoder();

        if (window.crypto && crypto.subtle) {
            const key = await crypto.subtle.importKey(
                "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
            );
            const bits = await crypto.subtle.deriveBits(
                { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 120000 },
                key,
                256
            );
            return toHex(new Uint8Array(bits));
        }

        // Запасной вариант для старых браузеров (слабее, только для демо)
        let hash = 5381;
        for (const byte of encoder.encode(salt + ":" + password)) {
            hash = ((hash << 5) + hash + byte) >>> 0;
        }
        return "legacy-" + hash.toString(16);
    };

    /* ---------- сессия ---------- */

    const getSessionEmail = () =>
        readJSON(sessionStorage, SESSION_KEY, null) || readJSON(localStorage, SESSION_KEY, null);

    const startSession = (email, remember) => {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
        writeJSON(remember ? localStorage : sessionStorage, SESSION_KEY, email);
    };

    const currentUser = () => {
        const email = getSessionEmail();
        if (!email) return null;
        return getUsers().find((user) => user.email === email) || null;
    };

    const logout = () => {
        try {
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_KEY);
        } catch (error) { /* хранилище недоступно */ }
    };

    /* ---------- проверка данных ---------- */

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE_RE = /^\+?[78]?\d{10}$/;

    const validators = {
        name: (value) => {
            const v = value.trim();
            if (!v) return "Введите имя и фамилию.";
            if (v.length < 2) return "Имя слишком короткое.";
            return "";
        },
        email: (value) => {
            const v = value.trim();
            if (!v) return "Введите email.";
            if (!EMAIL_RE.test(v)) return "Проверьте email: он должен выглядеть как name@example.com.";
            return "";
        },
        phone: (value) => {
            const v = value.replace(/[\s()-]/g, "");
            if (!v) return "";
            if (!PHONE_RE.test(v)) return "Введите номер в формате +7 700 123 45 67.";
            return "";
        },
        password: (value) => {
            if (!value) return "Придумайте пароль.";
            if (value.length < 8) return "Пароль должен быть не короче 8 символов.";
            if (!/[A-Za-zА-Яа-яЁё]/.test(value) || !/\d/.test(value)) {
                return "Добавьте в пароль хотя бы одну букву и одну цифру.";
            }
            return "";
        }
    };

    /* ---------- регистрация и вход ---------- */

    const registerUser = async ({ name, email, phone, password, remember }) => {
        const cleanEmail = normalizeEmail(email);
        const users = getUsers();

        if (users.some((user) => user.email === cleanEmail)) {
            return { ok: false, field: "email", error: "Аккаунт с таким email уже есть. Войдите или используйте другой email." };
        }

        const salt = makeSalt();
        const passwordHash = await hashPassword(password, salt);

        users.push({
            id: String(Date.now()),
            name: name.trim(),
            email: cleanEmail,
            phone: phone.trim(),
            salt,
            passwordHash,
            createdAt: new Date().toISOString()
        });

        if (!writeJSON(localStorage, USERS_KEY, users)) {
            return { ok: false, error: "Не удалось сохранить данные. Проверьте, что браузер разрешает хранилище (не режим инкогнито с запретом)." };
        }

        startSession(cleanEmail, remember);
        return { ok: true };
    };

    const loginUser = async ({ email, password, remember }) => {
        const cleanEmail = normalizeEmail(email);
        const user = getUsers().find((item) => item.email === cleanEmail);
        const failure = { ok: false, error: "Неверный email или пароль." };

        if (!user) return failure;

        const hash = await hashPassword(password, user.salt);
        if (hash !== user.passwordHash) return failure;

        startSession(cleanEmail, remember);
        return { ok: true };
    };

    /* ---------- переход после входа ---------- */

    // Разрешаем переходить только на страницы сайта (например, doctors.html)
    const nextPage = () => {
        const next = new URLSearchParams(window.location.search).get("next");
        return next && /^[a-z0-9_-]+\.html$/i.test(next) ? next : "index.html";
    };

    /* ---------- шапка сайта ---------- */

    const initials = (name) =>
        name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

    const renderHeader = () => {
        const actions = document.querySelector(".header__actions");
        if (!actions) return;

        const user = currentUser();
        const loginLink = actions.querySelector('[data-auth="login"]');
        const registerLink = actions.querySelector('[data-auth="register"]');

        if (!user) {
            // Возвращаем гостя на ту страницу, откуда он пришёл
            const page = window.location.pathname.split("/").pop();
            if (page && page !== "index.html" && /\.html$/i.test(page)) {
                const query = "?next=" + encodeURIComponent(page);
                if (loginLink) loginLink.href = "login.html" + query;
                if (registerLink) registerLink.href = "register.html" + query;
            }
            return;
        }

        if (loginLink) loginLink.remove();
        if (registerLink) registerLink.remove();

        const menu = document.createElement("div");
        menu.className = "user-menu";

        const avatar = document.createElement("span");
        avatar.className = "user-menu__avatar";
        avatar.textContent = initials(user.name);
        avatar.setAttribute("aria-hidden", "true");

        const name = document.createElement("span");
        name.className = "user-menu__name";
        name.textContent = user.name.split(/\s+/)[0];
        name.title = user.email;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn--outline user-menu__logout";
        button.textContent = "Выйти";
        button.addEventListener("click", () => {
            logout();
            window.location.href = "index.html";
        });

        menu.append(avatar, name, button);
        actions.append(menu);
    };

    /* ---------- формы ---------- */

    const fieldOf = (input) => input.closest(".field");

    const setFieldError = (input, message) => {
        const field = fieldOf(input);
        const error = field.querySelector(".field__error");

        field.classList.toggle("field--invalid", Boolean(message));
        input.setAttribute("aria-invalid", message ? "true" : "false");
        error.textContent = message;
        error.hidden = !message;
    };

    const showAlert = (form, message) => {
        const alertBox = form.querySelector(".form-alert");
        alertBox.textContent = message;
        alertBox.hidden = !message;
    };

    const setBusy = (form, busy) => {
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = busy;
        submit.dataset.label = submit.dataset.label || submit.textContent;
        submit.textContent = busy ? "Подождите…" : submit.dataset.label;
    };

    const initPasswordToggles = (form) => {
        form.querySelectorAll("[data-toggle-password]").forEach((button) => {
            const input = button.parentElement.querySelector("input");

            button.addEventListener("click", () => {
                const show = input.type === "password";
                input.type = show ? "text" : "password";
                button.textContent = show ? "Скрыть" : "Показать";
                button.setAttribute("aria-pressed", String(show));
            });
        });
    };

    const initRegisterForm = (form) => {
        const inputs = {
            name: form.elements.name,
            email: form.elements.email,
            phone: form.elements.phone,
            password: form.elements.password,
            confirm: form.elements.confirm
        };

        const check = (key) => {
            let message = "";

            if (key === "confirm") {
                if (!inputs.confirm.value) message = "Повторите пароль.";
                else if (inputs.confirm.value !== inputs.password.value) message = "Пароли не совпадают.";
            } else {
                message = validators[key](inputs[key].value);
            }

            setFieldError(inputs[key], message);
            return !message;
        };

        Object.keys(inputs).forEach((key) => {
            inputs[key].addEventListener("blur", () => check(key));
            inputs[key].addEventListener("input", () => {
                if (fieldOf(inputs[key]).classList.contains("field--invalid")) check(key);
            });
        });

        initPasswordToggles(form);

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            showAlert(form, "");

            const results = Object.keys(inputs).map(check);
            const termsBox = form.elements.terms;
            const termsField = fieldOf(termsBox);
            const termsError = termsField.querySelector(".field__error");
            const termsOk = termsBox.checked;

            termsField.classList.toggle("field--invalid", !termsOk);
            termsError.textContent = termsOk ? "" : "Подтвердите согласие, чтобы создать аккаунт.";
            termsError.hidden = termsOk;

            if (!results.every(Boolean) || !termsOk) {
                const firstInvalid = form.querySelector('[aria-invalid="true"]') || termsBox;
                firstInvalid.focus();
                return;
            }

            setBusy(form, true);

            try {
                const result = await registerUser({
                    name: inputs.name.value,
                    email: inputs.email.value,
                    phone: inputs.phone.value,
                    password: inputs.password.value,
                    remember: form.elements.remember.checked
                });

                if (!result.ok) {
                    if (result.field && inputs[result.field]) {
                        setFieldError(inputs[result.field], result.error);
                        inputs[result.field].focus();
                    } else {
                        showAlert(form, result.error);
                    }
                    return;
                }

                window.location.href = nextPage();
            } catch (error) {
                showAlert(form, "Что-то пошло не так. Обновите страницу и попробуйте ещё раз.");
            } finally {
                setBusy(form, false);
            }
        });
    };

    const initLoginForm = (form) => {
        const email = form.elements.email;
        const password = form.elements.password;

        initPasswordToggles(form);

        [email, password].forEach((input) => {
            input.addEventListener("input", () => {
                setFieldError(input, "");
                showAlert(form, "");
            });
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            showAlert(form, "");

            const emailError = validators.email(email.value);
            const passwordError = password.value ? "" : "Введите пароль.";

            setFieldError(email, emailError);
            setFieldError(password, passwordError);

            if (emailError || passwordError) {
                (emailError ? email : password).focus();
                return;
            }

            setBusy(form, true);

            try {
                const result = await loginUser({
                    email: email.value,
                    password: password.value,
                    remember: form.elements.remember.checked
                });

                if (!result.ok) {
                    showAlert(form, result.error);
                    password.focus();
                    return;
                }

                window.location.href = nextPage();
            } catch (error) {
                showAlert(form, "Что-то пошло не так. Обновите страницу и попробуйте ещё раз.");
            } finally {
                setBusy(form, false);
            }
        });
    };

    /* ---------- запуск ---------- */

    document.addEventListener("DOMContentLoaded", () => {
        const registerForm = document.getElementById("registerForm");
        const loginForm = document.getElementById("loginForm");

        // Уже вошли — на страницах входа и регистрации делать нечего
        if ((registerForm || loginForm) && currentUser()) {
            window.location.replace(nextPage());
            return;
        }

        renderHeader();

        if (registerForm) initRegisterForm(registerForm);
        if (loginForm) initLoginForm(loginForm);

        // Ссылки между страницами входа и регистрации сохраняют параметр next
        const next = new URLSearchParams(window.location.search).get("next");
        if (next) {
            document.querySelectorAll("[data-keep-next]").forEach((link) => {
                link.href += "?next=" + encodeURIComponent(next);
            });
        }
    });

    window.QLineAuth = { currentUser, logout };
})();
