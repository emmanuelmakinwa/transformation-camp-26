const menuButton = document.querySelector(".menu-toggle");
 
const navigation = document.querySelector(".main-nav");

const navigationLinks = document.querySelectorAll(".main-nav a");

menuButton.addEventListener("click", function () {

    navigation.classList.toggle("menu-open");

    const menuIsOpen = navigation.classList.contains("menu-open");

    if (menuIsOpen) {

        menuButton.textContent = "✕";

        menuButton.setAttribute(
            "aria-label",
            "Close navigation menu"
        );

        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );

    } else {

        menuButton.textContent = "☰";

        menuButton.setAttribute(
            "aria-label",
            "Open navigation menu"
        );

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }

});

navigationLinks.forEach(function (link) {

    link.addEventListener("click", function () {

        navigation.classList.remove("menu-open");

        menuButton.textContent = "☰";

        menuButton.setAttribute(
            "aria-label",
            "Open navigation menu"
        );

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );

    });

});

const accountNumber = document.querySelector("#account-number");

const copyAccountButton = document.querySelector("#copy-account-button");

const copyMessage = document.querySelector("#copy-message");


copyAccountButton.addEventListener("click", async function () {

    try {

        await navigator.clipboard.writeText(
            accountNumber.textContent.trim()
        );

        copyMessage.textContent = "Account number copied!";

        copyAccountButton.textContent = "Copied";

        setTimeout(function () {

            copyMessage.textContent = "";

            copyAccountButton.textContent = "Copy";

        }, 2000);

    } catch (error) {

        copyMessage.textContent =
            "Unable to copy. Please copy the number manually.";

    }

});