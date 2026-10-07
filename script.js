document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".favorite").forEach((button) => {
        button.addEventListener("click", () => {
            button.classList.toggle("is-favorite");
            button.textContent = button.classList.contains("is-favorite") ? "♥" : "♡";
        });
    });

    const homeSearch = document.getElementById("homeSearch");

    if (homeSearch) {
        homeSearch.addEventListener("submit", (event) => {
            event.preventDefault();

            const query = document.getElementById("doctorSearch").value.trim();
            const city = document.getElementById("citySelect").value;

            const params = new URLSearchParams();

            if (query) {
                params.set("search", query);
            }

            if (city) {
                params.set("city", city);
            }

            window.location.href = `doctors.html?${params.toString()}`;
        });
    }

    // Фильтрация врачей
    const filterInput = document.getElementById("filterInput");
    const filterCity = document.getElementById("filterCity");
    const filterButton = document.getElementById("filterButton");
    const doctorGrid = document.getElementById("doctorGrid");
    const emptyState = document.getElementById("emptyState");
    const doctorCount = document.getElementById("doctorCount");

    if (doctorGrid && filterInput && filterCity) {
        const cards = [...doctorGrid.querySelectorAll(".doctor-card")];

        const applyFilters = () => {
            const query = filterInput.value.trim().toLowerCase();
            const city = filterCity.value;
            let visibleCount = 0;

            cards.forEach((card) => {
                const name = card.dataset.name.toLowerCase();
                const specialty = card.dataset.specialty.toLowerCase();
                const cardCity = card.dataset.city;

                const matchesQuery =
                    !query ||
                    name.includes(query) ||
                    specialty.includes(query);

                const matchesCity =
                    city === "all" || cardCity === city;

                const visible = matchesQuery && matchesCity;

                card.style.display = visible ? "" : "none";

                if (visible) {
                    visibleCount += 1;
                }
            });

            doctorCount.textContent = `${visibleCount} ${getDoctorWord(visibleCount)}`;
            emptyState.hidden = visibleCount !== 0;
        };

        filterButton.addEventListener("click", applyFilters);
        filterInput.addEventListener("input", applyFilters);
        filterCity.addEventListener("change", applyFilters);

        const params = new URLSearchParams(window.location.search);
        const searchFromUrl = params.get("search");
        const cityFromUrl = params.get("city");

        if (searchFromUrl) {
            filterInput.value = searchFromUrl;
        }

        if (cityFromUrl && [...filterCity.options].some(option => option.value === cityFromUrl)) {
            filterCity.value = cityFromUrl;
        }

        applyFilters();
    }

    const modal = document.getElementById("appointmentModal");

    if (modal) {
        const modalDoctor = document.getElementById("modalDoctor");
        const dateInput = document.getElementById("appointmentDate");
        const timeSelect = document.getElementById("appointmentTime");
        const confirmButton = document.getElementById("confirmAppointment");
        const form = document.getElementById("appointmentForm");
        const success = document.getElementById("appointmentSuccess");
        const summary = document.getElementById("appointmentSummary");
        const errorBox = document.getElementById("appointmentError");
        let selectedCard = null;

        const showError = (message) => {
            errorBox.textContent = message;
            errorBox.hidden = !message;
        };

        document.querySelectorAll(".appointment-btn").forEach((button) => {
            button.addEventListener("click", () => {
                selectedCard = button.closest(".doctor-card");
                const doctorName = selectedCard.querySelector("h3").textContent;

                modalDoctor.textContent = `Выберите удобное время для записи к врачу: ${doctorName}.`;
                form.hidden = false;
                success.hidden = true;
                showError("");
                modal.classList.add("is-open");
                modal.setAttribute("aria-hidden", "false");

                const today = new Date();
                const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
                    .toISOString()
                    .split("T")[0];

                dateInput.min = localDate;
                if (!dateInput.value || dateInput.value < localDate) {
                    dateInput.value = localDate;
                }
            });
        });

        const closeModal = () => {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
        };

        modal.querySelectorAll("[data-close-modal]").forEach((element) => {
            element.addEventListener("click", closeModal);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && modal.classList.contains("is-open")) {
                closeModal();
            }
        });

        [dateInput, timeSelect].forEach((field) => {
            field.addEventListener("change", () => showError(""));
        });

        confirmButton.addEventListener("click", () => {
            const date = dateInput.value;
            const time = timeSelect.value;

            if (!date) {
                showError("Выберите дату.");
                return;
            }

            const result = window.QLineAppointments.add({
                doctor: selectedCard.dataset.name,
                specialty: selectedCard.dataset.specialty,
                city: selectedCard.dataset.city,
                price: selectedCard.querySelector(".price").textContent.trim(),
                date,
                time
            });

            if (!result.ok) {
                showError(result.error);
                return;
            }

            summary.textContent =
                `${result.item.doctor}, ${window.QLineAppointments.formatDate(result.item)}, ${time}.`;
            form.hidden = true;
            success.hidden = false;
        });
    }
});

function getDoctorWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return "врач";
    }

    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return "врача";
    }

    return "врачей";
}