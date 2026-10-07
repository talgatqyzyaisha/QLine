/*
 * QLine — записи на приём (демо-версия).
 *
 * Записи хранятся в браузере (localStorage). Файл подключается на странице врачей
 * (чтобы сохранять новые записи) и на странице «Мои записи» (чтобы показывать их).
 * В рабочей версии записи должны храниться на сервере и быть привязаны к аккаунту.
 */
(() => {
    "use strict";

    const KEY = "qline_appointments";

    /* ---------- хранилище ---------- */

    const readAll = () => {
        try {
            const list = JSON.parse(localStorage.getItem(KEY));
            return Array.isArray(list) ? list : [];
        } catch (error) {
            return [];
        }
    };

    const writeAll = (list) => {
        try {
            localStorage.setItem(KEY, JSON.stringify(list));
            return true;
        } catch (error) {
            return false;
        }
    };

    /* ---------- даты ---------- */

    // "2026-10-15" + "09:00" → дата в местном часовом поясе
    const startOf = (item) => {
        const [year, month, day] = item.date.split("-").map(Number);
        const [hours, minutes] = item.time.split(":").map(Number);
        return new Date(year, month - 1, day, hours, minutes);
    };

    const statusOf = (item) => {
        if (item.cancelled) return "cancelled";
        return startOf(item) < new Date() ? "past" : "upcoming";
    };

    const formatDate = (item) =>
        new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", weekday: "long" })
            .format(startOf(item));

    const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

    /* ---------- действия ---------- */

    const add = ({ doctor, specialty, city, price, date, time }) => {
        const draft = { date, time };

        if (startOf(draft) <= new Date()) {
            return { ok: false, error: "Это время уже прошло. Выберите другое время." };
        }

        const busy = readAll().some(
            (item) => statusOf(item) === "upcoming" && item.date === date && item.time === time
        );

        if (busy) {
            return { ok: false, error: "У вас уже есть запись на это время. Выберите другое." };
        }

        const list = readAll();
        const item = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            doctor,
            specialty,
            city,
            price,
            date,
            time,
            cancelled: false,
            createdAt: new Date().toISOString()
        };

        list.push(item);

        if (!writeAll(list)) {
            return { ok: false, error: "Не удалось сохранить запись. Проверьте, что браузер разрешает хранилище." };
        }

        return { ok: true, item };
    };

    const cancel = (id) => {
        const list = readAll();
        const item = list.find((entry) => entry.id === id);
        if (!item) return false;
        item.cancelled = true;
        return writeAll(list);
    };

    window.QLineAppointments = { add, cancel, all: readAll, statusOf, formatDate };

    /* ---------- страница «Мои записи» ---------- */

    document.addEventListener("DOMContentLoaded", () => {
        const listBox = document.getElementById("appointmentList");
        if (!listBox) return;

        const emptyBox = document.getElementById("appointmentEmpty");
        const emptyTitle = document.getElementById("appointmentEmptyTitle");
        const emptyText = document.getElementById("appointmentEmptyText");
        const emptyAction = document.getElementById("appointmentEmptyAction");
        const tabs = [...document.querySelectorAll("[data-filter]")];

        const STATUS_LABEL = {
            upcoming: "Предстоит",
            past: "Состоялась",
            cancelled: "Отменена"
        };

        const EMPTY = {
            upcoming: {
                title: "Предстоящих записей нет",
                text: "Выберите врача и удобное время — запись займёт минуту.",
                action: true
            },
            past: {
                title: "Прошедших визитов пока нет",
                text: "Здесь появятся записи, время которых уже наступило.",
                action: false
            },
            cancelled: {
                title: "Отменённых записей нет",
                text: "Если вы отмените запись, она попадёт сюда.",
                action: false
            }
        };

        let filter = "upcoming";

        const el = (tag, className, text) => {
            const node = document.createElement(tag);
            if (className) node.className = className;
            if (text !== undefined) node.textContent = text;
            return node;
        };

        const buildCard = (item, status) => {
            const start = startOf(item);
            const card = el("article", "appt-card appt-card--" + status);

            const dateBox = el("div", "appt-card__date");
            dateBox.append(
                el("span", "appt-card__day", String(start.getDate())),
                el("span", "appt-card__month", new Intl.DateTimeFormat("ru-RU", { month: "short" })
                    .format(start).replace(".", ""))
            );

            const main = el("div", "appt-card__main");
            main.append(
                el("h3", "", item.doctor),
                el("p", "appt-card__specialty", item.specialty),
                el("p", "appt-card__meta",
                    capitalize(`${formatDate(item)}, ${item.time}` + (item.city ? `, ${item.city}` : ""))),
                el("p", "appt-card__price", item.price || "")
            );

            const side = el("div", "appt-card__side");
            side.append(el("span", "status status--" + status, STATUS_LABEL[status]));

            if (status === "upcoming") {
                const button = el("button", "btn btn--outline btn--small", "Отменить запись");
                button.type = "button";
                button.addEventListener("click", () => {
                    const question = `Отменить запись к врачу ${item.doctor} на ${formatDate(item)}, ${item.time}?`;
                    if (window.confirm(question)) {
                        cancel(item.id);
                        render();
                    }
                });
                side.append(button);
            }

            card.append(dateBox, main, side);
            return card;
        };

        const render = () => {
            const all = readAll().map((item) => ({ item, status: statusOf(item) }));

            tabs.forEach((tab) => {
                const key = tab.dataset.filter;
                const count = all.filter((entry) => entry.status === key).length;
                tab.querySelector(".appt-tabs__count").textContent = String(count);
                const active = key === filter;
                tab.classList.toggle("is-active", active);
                tab.setAttribute("aria-pressed", String(active));
            });

            const shown = all
                .filter((entry) => entry.status === filter)
                .sort((a, b) =>
                    filter === "upcoming"
                        ? startOf(a.item) - startOf(b.item)
                        : startOf(b.item) - startOf(a.item)
                );

            listBox.replaceChildren(...shown.map((entry) => buildCard(entry.item, entry.status)));

            const isEmpty = shown.length === 0;
            emptyBox.hidden = !isEmpty;

            if (isEmpty) {
                emptyTitle.textContent = EMPTY[filter].title;
                emptyText.textContent = EMPTY[filter].text;
                emptyAction.hidden = !EMPTY[filter].action;
            }
        };

        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                filter = tab.dataset.filter;
                render();
            });
        });

        render();
    });
})();
