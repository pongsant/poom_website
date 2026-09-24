const gallery = document.querySelector("[data-gallery]");
const previews = document.querySelectorAll("[data-preview]");
const totalNodes = document.querySelectorAll("[data-count]");

function createFigure(photo, index) {
  const figure = document.createElement("figure");
  figure.className = "photo-card";

  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = `${photo.project} photograph ${index + 1}`;
  img.loading = index < 8 ? "eager" : "lazy";
  img.decoding = "async";

  const caption = document.createElement("figcaption");
  caption.textContent = photo.project;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "photo-open";
  button.setAttribute("aria-label", `Enlarge ${img.alt}`);
  button.append(img);
  button.addEventListener("click", () => openPhoto(photo, img.alt));
  figure.append(button, caption);
  return figure;
}

function renderGallery() {
  if (!gallery) return;

  const type = gallery.dataset.gallery;
  const photos = photoSets[type] || [];
  const fragment = document.createDocumentFragment();

  photos.forEach((photo, index) => {
    fragment.append(createFigure(photo, index));
  });

  gallery.append(fragment);
}

function renderPreviews() {
  previews.forEach((node) => {
    const type = node.dataset.preview;
    const photos = (photoSets[type] || []).slice(0, 6);
    const fragment = document.createDocumentFragment();

    photos.forEach((photo, index) => {
      fragment.append(createFigure(photo, index));
    });

    node.append(fragment);
  });
}

function renderCounts() {
  totalNodes.forEach((node) => {
    const type = node.dataset.count;
    node.textContent = `${photoSets[type].length} photos`;
  });
}

function setupHomeIndex() {
  const home = document.querySelector("[data-home-index]");
  if (!home) return;

  const items = [...home.querySelectorAll("[data-home-collection]")];
  const imageLayers = [...home.querySelectorAll("[data-home-image]")];
  const status = home.querySelector("[data-home-status]");
  const previewSets = {};
  let activeLayer = 0;
  let currentSrc = "";
  let touchCollection = "";

  items.forEach((item) => {
    const collection = item.dataset.homeCollection;
    previewSets[collection] = [...(photoSets[collection] || [])];
    for (let i = previewSets[collection].length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [previewSets[collection][i], previewSets[collection][j]] =
        [previewSets[collection][j], previewSets[collection][i]];
    }
  });

  function showPhoto(collection, index) {
    const photos = previewSets[collection];
    if (!photos?.length) return;

    const photoIndex = Math.max(0, Math.min(index, photos.length - 1));
    const src = photos[photoIndex].src;
    if (src === currentSrc) return;

    const nextLayer = activeLayer === 0 ? 1 : 0;
    currentSrc = src;
    const preload = new Image();
    preload.onload = () => {
      if (currentSrc !== src) return;
      imageLayers[nextLayer].src = src;
      imageLayers[nextLayer].classList.add("is-visible");
      imageLayers[activeLayer].classList.remove("is-visible");
      activeLayer = nextLayer;
      status.textContent = `${collection} / ${String(photoIndex + 1).padStart(2, "0")}`;
    };
    preload.src = src;
  }

  items.forEach((item) => {
    const collection = item.dataset.homeCollection;
    const arrow = item.querySelector(".home-motion-hint");
    let progress = 0;
    let touchStartProgress = 0;
    let displayedProgress = 0;
    let frame = 0;
    let previousTime = 0;
    let available = 0;
    let start = 0;
    let travel = 1;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function drawArrow() {
      const minimum = Math.min(32, available);
      const length = minimum + displayedProgress * (available - minimum);
      arrow.style.setProperty("--arrow-scale", available ? length / available : 0);
      arrow.style.setProperty("--arrow-length", `${length}px`);
    }

    function measureArrow() {
      const bounds = arrow.getBoundingClientRect();
      available = bounds.width;
      start = bounds.left + Math.min(32, available);
      travel = Math.max(1, available - 32);
      drawArrow();
    }

    function animateArrow(time) {
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16.67;
      previousTime = time;
      displayedProgress += (progress - displayedProgress) * (1 - Math.exp(-elapsed / 45));
      if (reducedMotion.matches || Math.abs(progress - displayedProgress) < 0.001) displayedProgress = progress;
      drawArrow();
      if (item.classList.contains("is-active")) {
        showPhoto(collection, Math.floor(displayedProgress * previewSets[collection].length));
      }
      if (displayedProgress !== progress) {
        frame = requestAnimationFrame(animateArrow);
      } else {
        frame = 0;
        previousTime = 0;
      }
    }

    new ResizeObserver(measureArrow).observe(arrow);
    measureArrow();

    function updatePreview(position) {
      item.classList.add("has-interacted");
      progress = Math.max(0, Math.min(1, position));
      items.forEach((menuItem) => menuItem.classList.toggle("is-active", menuItem === item));
      if (!frame) frame = requestAnimationFrame(animateArrow);
    }

    item.addEventListener("pointerenter", (event) => {
      measureArrow();
      if (event.pointerType !== "touch") updatePreview(progress);
    });

    item.addEventListener("focus", () => {
      updatePreview(progress);
    });

    let touchStartX = null;
    let didSwipe = false;

    item.addEventListener("pointerdown", (event) => {
      item.classList.add("has-interacted");
      measureArrow();
      didSwipe = false;
      if (event.pointerType !== "touch") return;
      touchStartX = event.clientX;
      touchStartProgress = progress;
      item.setPointerCapture(event.pointerId);
    });

    item.addEventListener("pointerup", () => { touchStartX = null; });
    item.addEventListener("pointercancel", () => { touchStartX = null; });

    item.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") {
        if (touchStartX === null || Math.abs(event.clientX - touchStartX) < 8) return;
        didSwipe = true;
        touchCollection = collection;
        updatePreview(touchStartProgress + (event.clientX - touchStartX) / travel);
        return;
      }
      updatePreview((event.clientX - start) / travel);
    });

    item.addEventListener("click", (event) => {
      if (didSwipe) {
        event.preventDefault();
        didSwipe = false;
        return;
      }
      if (!window.matchMedia("(hover: none)").matches) return;
      if (touchCollection !== collection) {
        event.preventDefault();
        touchCollection = collection;
        items.forEach((menuItem) => menuItem.classList.remove("is-active"));
        item.classList.add("is-active");
        updatePreview(progress);
      }
    });
  });

  items[0].classList.add("is-active");
  showPhoto("digi", 0);
}

renderGallery();
renderPreviews();
renderCounts();
setupHomeIndex();

function renderCatalog() {
  const catalog = document.querySelector("[data-catalog]");
  if (!catalog) return;
  const collection = catalog.dataset.catalog;
  const groups = new Map();
  photoSets[collection].forEach((photo) => {
    if (!groups.has(photo.project)) groups.set(photo.project, []);
    groups.get(photo.project).push(photo);
  });
  groups.forEach((photos, name) => {
    const link = document.createElement("a");
    link.className = "project-cover";
    link.href = `project.html?${new URLSearchParams({ collection, project: name })}`;
    const img = document.createElement("img");
    img.src = photos[0].src;
    img.alt = name;
    img.loading = "lazy";
    const title = document.createElement("h2");
    title.textContent = name;
    const count = document.createElement("span");
    count.textContent = `${photos.length} photos`;
    link.append(img, title, count);
    catalog.append(link);
  });
}

function renderProject() {
  if (!document.querySelector("[data-project-page]")) return;
  const params = new URLSearchParams(location.search);
  const collection = params.get("collection");
  const name = params.get("project");
  const valid = collection === "digi" || collection === "film";
  const photos = valid ? photoSets[collection].filter((photo) => photo.project === name) : [];
  const title = photos.length ? name : "Project not found";
  document.title = `${title} - POOM DHARARAG`;
  document.querySelector("[data-project-title]").textContent = title;
  document.querySelector("[data-project-count]").textContent = `${photos.length} photos`;
  const back = document.querySelector("[data-project-back]");
  back.href = valid ? `${collection}.html` : "index.html";
  const backLabel = valid ? `Back to ${collection === "digi" ? "Digi" : "Film"}` : "Back to Home";
  back.setAttribute("aria-label", backLabel);
  back.title = backLabel;
  document.querySelectorAll(".nav a").forEach((link) => {
    if (link.getAttribute("href") === back.getAttribute("href")) link.classList.add("is-active");
  });
  const grid = document.querySelector("[data-project-gallery]");
  photos.forEach((photo, index) => grid.append(createFigure(photo, index)));
}

let photoDialog;
function openPhoto(photo, alt) {
  if (!photoDialog) {
    photoDialog = document.createElement("dialog");
    photoDialog.className = "photo-dialog";
    photoDialog.setAttribute("aria-label", "Enlarged photograph");
    const close = document.createElement("button");
    close.className = "photo-close";
    close.type = "button";
    close.textContent = "\u00d7";
    close.title = "Close photograph";
    close.setAttribute("aria-label", "Close photograph");
    close.addEventListener("click", () => photoDialog.close());
    const img = document.createElement("img");
    photoDialog.append(close, img);
    photoDialog.addEventListener("click", (event) => {
      if (event.target === photoDialog) photoDialog.close();
    });
    photoDialog.addEventListener("close", () => document.body.classList.remove("viewer-open"));
    document.body.append(photoDialog);
  }
  const img = photoDialog.querySelector("img");
  img.src = photo.src;
  img.alt = alt;
  photoDialog.showModal();
  document.body.classList.add("viewer-open");
}

renderCatalog();
renderProject();
