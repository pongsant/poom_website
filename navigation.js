document.querySelectorAll(".photo-menu").forEach((menu) => {
  const button = menu.querySelector(".photo-menu-toggle");
  const options = menu.querySelector(".photo-menu-options");
  function setExpanded(expanded) {
    button.setAttribute("aria-expanded", String(expanded));
    options.inert = !expanded;
    menu.classList.toggle("is-expanded", expanded);
  }
  button.addEventListener("click", () => {
    setExpanded(button.getAttribute("aria-expanded") !== "true");
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      event.preventDefault();
      event.stopPropagation();
      setExpanded(false);
      button.focus();
    }
  });
  menu.closest(".nav-menu").addEventListener("toggle", (event) => {
    if (!event.target.open) setExpanded(false);
  });
});
