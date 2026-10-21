const gallery = document.querySelector("[data-gallery]");
const previews = document.querySelectorAll("[data-preview]");
const totalNodes = document.querySelectorAll("[data-count]");

function getPhotoAlt(photo, index) {
  return `${photo.project} photograph ${index + 1}`;
}

function createFigure(photo, index, photos) {
  const figure = document.createElement("figure");
  figure.className = "photo-card";

  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = getPhotoAlt(photo, index);
  img.loading = index < 8 ? "eager" : "lazy";
  img.decoding = "async";

  const caption = document.createElement("figcaption");
  caption.textContent = photo.project;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "photo-open";
  button.setAttribute("aria-label", `Enlarge ${img.alt}`);
  button.append(img);
  button.addEventListener("click", () => openPhoto(photos, index));
  figure.append(button, caption);
  return figure;
}

function renderGallery() {
  if (!gallery) return;

  const type = gallery.dataset.gallery;
  const photos = photoSets[type] || [];
  const fragment = document.createDocumentFragment();

  photos.forEach((photo, index) => {
    fragment.append(createFigure(photo, index, photos));
  });

  gallery.append(fragment);
}

function renderPreviews() {
  previews.forEach((node) => {
    const type = node.dataset.preview;
    const photos = (photoSets[type] || []).slice(0, 6);
    const fragment = document.createDocumentFragment();

    photos.forEach((photo, index) => {
      fragment.append(createFigure(photo, index, photos));
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
  let requestedSrc = "";
  let pendingPhoto = null;
  let switching = false;
  const decoded = new Map();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function preparePhoto(src) {
    if (decoded.has(src)) {
      const cached = decoded.get(src);
      decoded.delete(src);
      decoded.set(src, cached);
      return cached;
    }
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    const ready = image.decode().then(() => image).catch(() => {
      decoded.delete(src);
      return null;
    });
    decoded.set(src, ready);
    // Bound decoded originals in memory while the browser caches downloaded files.
    while (decoded.size > 4) decoded.delete(decoded.keys().next().value);
    return ready;
  }

  function presentPhoto() {
    if (switching || !pendingPhoto) return;
    const { image, src, label } = pendingPhoto;
    pendingPhoto = null;
    if (src !== requestedSrc || src === currentSrc) return;
    const nextLayer = 1 - activeLayer;
    const previous = imageLayers[activeLayer];
    image.className = "home-background-image";
    image.alt = "";
    image.setAttribute("data-home-image", "");
    image.style.zIndex = "1";
    previous.style.zIndex = "0";
    imageLayers[nextLayer].replaceWith(image);
    imageLayers[nextLayer] = image;
    currentSrc = src;
    switching = true;
    // Keep the previous image fully opaque underneath the new image's fade.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      image.classList.add("is-visible");
      status.textContent = label;
      setTimeout(() => {
        previous.classList.remove("is-visible");
        activeLayer = nextLayer;
        switching = false;
        presentPhoto();
      }, reducedMotion.matches ? 0 : 100);
    }));
  }
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
    if (src === requestedSrc) return;
    requestedSrc = src;
    pendingPhoto = null;
    preparePhoto(src).then((image) => {
      if (!image || requestedSrc !== src) return;
      pendingPhoto = {
        image, src,
        label: `${collection} / ${String(photoIndex + 1).padStart(2, "0")}`
      };
      presentPhoto();
      for (const offset of [-1, 1]) {
        const neighbor = photos[photoIndex + offset];
        if (neighbor) preparePhoto(neighbor.src);
      }
    });
  }

  items.forEach((item) => {
    const collection = item.dataset.homeCollection;
    const arrow = item.querySelector(".home-motion-hint");
    const shadow = document.createElement("span");
    shadow.className = "home-arrow-shadow";
    arrow.append(shadow);
    item.classList.add("is-idle");
    let idleTimer;

    function pauseIdleHint() {
      item.classList.remove("is-idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => item.classList.add("is-idle"), 1200);
    }

    item.addEventListener("pointermove", pauseIdleHint, { passive: true });
    item.addEventListener("pointerdown", pauseIdleHint, { passive: true });
    item.addEventListener("focus", pauseIdleHint);
    let progress = 0;
    let touchStartProgress = 0;
    let displayedProgress = 0;
    let frame = 0;
    let previousTime = 0;
    let available = 0;
    let start = 0;
    let travel = 1;
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
      const elapsed = Math.max(0, Math.min(time - previousTime, 64));
      previousTime = time;
      displayedProgress += (progress - displayedProgress) * (1 - Math.exp(-elapsed / 24));
      if (reducedMotion.matches || Math.abs(progress - displayedProgress) * travel < 0.1) displayedProgress = progress;
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
      if (!item.classList.contains("has-interacted")) item.classList.add("has-interacted");
      progress = Math.max(0, Math.min(1, position));
      if (!item.classList.contains("is-active")) {
        items.forEach((menuItem) => menuItem.classList.toggle("is-active", menuItem === item));
      }
      if (!frame) {
        previousTime = performance.now();
        frame = requestAnimationFrame(animateArrow);
      }
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
  photos.forEach((photo, index) => grid.append(createFigure(photo, index, photos)));
}

let photoDialog;
let activePhotos = [];
let activePhotoIndex = 0;

function showActivePhoto() {
  if (!photoDialog || !activePhotos.length) return;
  const photo = activePhotos[activePhotoIndex];
  const img = photoDialog.querySelector("img");
  const count = photoDialog.querySelector("[data-photo-count]");
  img.src = photo.src;
  img.alt = getPhotoAlt(photo, activePhotoIndex);
  count.textContent = `${activePhotoIndex + 1} / ${activePhotos.length}`;
}

function movePhoto(direction) {
  if (activePhotos.length < 2) return;
  activePhotoIndex = (activePhotoIndex + direction + activePhotos.length) % activePhotos.length;
  showActivePhoto();
}

function openPhoto(photos, index) {
  activePhotos = photos;
  activePhotoIndex = index;

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

    const previous = document.createElement("button");
    previous.className = "photo-nav photo-nav-prev";
    previous.type = "button";
    previous.textContent = "\u2039";
    previous.title = "Previous photograph";
    previous.setAttribute("aria-label", "Previous photograph");
    previous.addEventListener("click", () => movePhoto(-1));

    const next = document.createElement("button");
    next.className = "photo-nav photo-nav-next";
    next.type = "button";
    next.textContent = "\u203a";
    next.title = "Next photograph";
    next.setAttribute("aria-label", "Next photograph");
    next.addEventListener("click", () => movePhoto(1));

    const img = document.createElement("img");
    const count = document.createElement("div");
    count.className = "photo-count";
    count.setAttribute("data-photo-count", "");
    photoDialog.append(close, previous, img, next, count);

    photoDialog.addEventListener("click", (event) => {
      if (event.target === photoDialog) photoDialog.close();
    });
    photoDialog.addEventListener("close", () => document.body.classList.remove("viewer-open"));
    photoDialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") movePhoto(-1);
      if (event.key === "ArrowRight") movePhoto(1);
    });
    document.body.append(photoDialog);
  }

  showActivePhoto();
  photoDialog.showModal();
  document.body.classList.add("viewer-open");
}

renderCatalog();
renderProject();
