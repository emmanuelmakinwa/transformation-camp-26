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
