/* =========================================================
   TRANSFORMATION CAMP 26
   MAIN JAVASCRIPT
========================================================= */

(function () {
    "use strict";

    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    const menuButton = document.querySelector(".menu-toggle");
    const navigation = document.querySelector(".main-nav");
    const navigationLinks = document.querySelectorAll(".main-nav a");
    const accountNumber = document.querySelector("#account-number");
    const copyAccountButton = document.querySelector("#copy-account-button");
    const copyMessage = document.querySelector("#copy-message");
    const registrationForm = document.querySelector("#registration-form");
    const registrationSubmit = document.querySelector("#registration-submit");
    const registrationSubmitText = document.querySelector("#registration-submit-text");
    const registrationSubmitArrow = document.querySelector("#registration-submit-arrow");
    const registrationMessage = document.querySelector("#registration-message");

    /* =====================================================
       MOBILE NAVIGATION
    ===================================================== */

    function setMenuState(isOpen) {
        if (!menuButton || !navigation) return;

        navigation.classList.toggle("menu-open", isOpen);
        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );
    }

    function closeMenu() {
        setMenuState(false);
    }

    function openMenu() {
        setMenuState(true);
    }

    function toggleMenu() {
        if (!navigation) return;
        setMenuState(!navigation.classList.contains("menu-open"));
    }

    if (menuButton && navigation) {
        menuButton.addEventListener("click", function (event) {
            event.stopPropagation();
            toggleMenu();
        });

        navigationLinks.forEach(function (link) {
            link.addEventListener("click", closeMenu);
        });

        document.addEventListener("click", function (event) {
            const target = event.target;
            if (!(target instanceof Element)) return;

            const clickedInsideHeader = target.closest(".site-header");
            if (!clickedInsideHeader) closeMenu();
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && navigation.classList.contains("menu-open")) {
                closeMenu();
                menuButton.focus();
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 900) closeMenu();
        }, { passive: true });
    }

    /* =====================================================
       COPY ACCOUNT NUMBER
    ===================================================== */

    async function copyText(text) {
        if (!text) throw new Error("Nothing to copy.");

        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }

        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = text;
        temporaryInput.setAttribute("readonly", "");
        temporaryInput.setAttribute("aria-hidden", "true");
        temporaryInput.style.position = "fixed";
        temporaryInput.style.top = "-9999px";
        temporaryInput.style.left = "-9999px";
        temporaryInput.style.opacity = "0";
        temporaryInput.style.pointerEvents = "none";

        document.body.appendChild(temporaryInput);
        temporaryInput.focus();
        temporaryInput.select();
        temporaryInput.setSelectionRange(0, temporaryInput.value.length);

        let copied = false;
        try {
            copied = document.execCommand("copy");
        } catch (error) {
            copied = false;
        } finally {
            temporaryInput.remove();
        }

        if (!copied) throw new Error("Copy command failed.");
        return true;
    }

    function showCopySuccess() {
        if (!copyMessage || !copyAccountButton) return;

        copyMessage.textContent = "Account number copied!";
        copyAccountButton.textContent = "Copied";
        copyAccountButton.setAttribute("aria-label", "Account number copied");

        window.setTimeout(function () {
            copyMessage.textContent = "";
            copyAccountButton.textContent = "Copy";
            copyAccountButton.setAttribute("aria-label", "Copy account number");
        }, 2000);
    }

    function showCopyError() {
        if (!copyMessage || !copyAccountButton) return;

        copyMessage.textContent = "Unable to copy. Please copy the number manually.";
        copyAccountButton.textContent = "Copy";
    }

    if (accountNumber && copyAccountButton && copyMessage) {
        copyAccountButton.addEventListener("click", async function () {
            const number = accountNumber.textContent.trim();

            if (!number) {
                showCopyError();
                return;
            }

            try {
                await copyText(number);
                showCopySuccess();
            } catch (error) {
                showCopyError();
            }
        });
    }
})();

    /* =====================================================
       CAMP REGISTRATION
    ===================================================== */

    function showRegistrationMessage(message, type) {
        if (!registrationMessage) return;

        registrationMessage.textContent = message;
        registrationMessage.className = "registration-message";

        if (type) {
            registrationMessage.classList.add(
                "registration-message-" + type
            );
        }
    }

    function setRegistrationLoading(isLoading) {
        if (!registrationSubmit) return;

        registrationSubmit.disabled = isLoading;
        registrationSubmit.setAttribute(
            "aria-busy",
            String(isLoading)
        );

        if (registrationSubmitText) {
            registrationSubmitText.textContent = isLoading
                ? "SUBMITTING..."
                : "REGISTER FOR CAMP";
        }

        if (registrationSubmitArrow) {
            registrationSubmitArrow.textContent = isLoading
                ? ""
                : "→";
        }
    }

    function getRegistrationData() {
        if (!registrationForm) return null;

        const formData = new FormData(registrationForm);

        return {
            first_name: String(formData.get("first_name") || "").trim(),
            last_name: String(formData.get("last_name") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            phone: String(formData.get("phone") || "").trim(),
            gender: String(formData.get("gender") || "").trim(),
            country: String(formData.get("country") || "").trim(),
            state: String(formData.get("state") || "").trim(),
            city: String(formData.get("city") || "").trim(),
            accommodation_required:
                formData.get("accommodation_required") === "true"
        };
    }

    if (registrationForm) {
        registrationForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!registrationForm.checkValidity()) {
                registrationForm.reportValidity();
                return;
            }

            showRegistrationMessage("", "");
            setRegistrationLoading(true);

            try {
                const response = await fetch("/api/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(getRegistrationData())
                });

                let result = {};

                try {
                    result = await response.json();
                } catch (error) {
                    result = {};
                }

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                        "Unable to complete registration. Please try again."
                    );
                }

                showRegistrationMessage(
                    "Registration successful! Your registration reference is " +
                    result.registration_reference +
                    ".",
                    "success"
                );

                registrationForm.reset();

                if (registrationSubmitText) {
                    registrationSubmitText.textContent = "REGISTERED";
                }

                if (registrationSubmitArrow) {
                    registrationSubmitArrow.textContent = "✓";
                }

            } catch (error) {
                showRegistrationMessage(
                    error.message ||
                    "Unable to complete registration. Please try again.",
                    "error"
                );

            } finally {
                setRegistrationLoading(false);

                if (
                    registrationSubmitText &&
                    registrationSubmitText.textContent === "REGISTERED"
                ) {
                    registrationSubmitText.textContent = "REGISTER FOR CAMP";
                }

                if (
                    registrationSubmitArrow &&
                    registrationSubmitArrow.textContent === "✓"
                ) {
                    registrationSubmitArrow.textContent = "→";
                }
            }
        });
    }