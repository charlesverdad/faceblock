/**
 * Before/After comparison slider.
 * Vanilla JS, no dependencies.
 * Supports: mouse drag, touch drag, keyboard arrows, mobile scroll-driven.
 */
(function () {
  "use strict";

  const container = document.getElementById("comparison-container");
  if (!container) return;

  const reveal = document.getElementById("comparison-reveal");
  const handle = document.getElementById("comparison-handle");
  const beforeImg = reveal.querySelector(".comparison-img--before");

  let isDragging = false;
  let containerRect = null;

  function setPosition(fraction) {
    fraction = Math.max(0.02, Math.min(0.98, fraction));
    const pct = fraction * 100;

    reveal.style.width = pct + "%";
    handle.style.left = pct + "%";
    handle.setAttribute("aria-valuenow", Math.round(pct));

    // The before image needs to fill the full container width
    // so it aligns pixel-for-pixel with the after image.
    beforeImg.style.width = container.offsetWidth + "px";
  }

  function getRect() {
    containerRect = container.getBoundingClientRect();
    return containerRect;
  }

  function fractionFromX(clientX) {
    const rect = containerRect || getRect();
    return (clientX - rect.left) / rect.width;
  }

  // --- Mouse ---
  handle.addEventListener("mousedown", function (e) {
    e.preventDefault();
    isDragging = true;
    getRect();
    document.body.style.cursor = "col-resize";
  });

  container.addEventListener("mousedown", function (e) {
    if (e.target === handle || handle.contains(e.target)) return;
    isDragging = true;
    getRect();
    setPosition(fractionFromX(e.clientX));
    document.body.style.cursor = "col-resize";
  });

  window.addEventListener("mousemove", function (e) {
    if (!isDragging) return;
    e.preventDefault();
    setPosition(fractionFromX(e.clientX));
  });

  window.addEventListener("mouseup", function () {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = "";
  });

  // --- Touch ---
  handle.addEventListener(
    "touchstart",
    function (e) {
      e.preventDefault();
      isDragging = true;
      getRect();
    },
    { passive: false },
  );

  container.addEventListener(
    "touchstart",
    function (e) {
      if (e.target === handle || handle.contains(e.target)) return;
      isDragging = true;
      getRect();
      setPosition(fractionFromX(e.touches[0].clientX));
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    function (e) {
      if (!isDragging) return;
      e.preventDefault();
      setPosition(fractionFromX(e.touches[0].clientX));
    },
    { passive: false },
  );

  window.addEventListener("touchend", function () {
    isDragging = false;
  });

  // --- Keyboard ---
  handle.addEventListener("keydown", function (e) {
    const step = 0.02;
    const current = parseFloat(reveal.style.width) / 100 || 0.5;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setPosition(current - step);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setPosition(current + step);
    }
  });

  // --- Scroll-driven reveal ---
  function setupScrollDriven() {
    let hasInteracted = false;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !hasInteracted) {
            window.addEventListener("scroll", onScroll, { passive: true });
          } else {
            window.removeEventListener("scroll", onScroll);
          }
        });
      },
      { threshold: 0 },
    );

    observer.observe(container);

    function onScroll() {
      if (hasInteracted) {
        window.removeEventListener("scroll", onScroll);
        return;
      }
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(
        0,
        Math.min(1, (vh - rect.top) / (vh + rect.height)),
      );
      const sliderPos = 0.2 + progress * 0.5;
      setPosition(sliderPos);
    }

    handle.addEventListener(
      "touchstart",
      function () {
        hasInteracted = true;
      },
      { once: true },
    );
    handle.addEventListener(
      "mousedown",
      function () {
        hasInteracted = true;
      },
      { once: true },
    );
  }

  // --- Resize handler ---
  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      getRect();
      beforeImg.style.width = container.offsetWidth + "px";
    }, 100);
  });

  // --- Init ---
  const afterImg = container.querySelector(".comparison-img--after");
  function init() {
    getRect();
    setPosition(0.5);
    setupScrollDriven();
  }

  if (afterImg.complete) {
    init();
  } else {
    afterImg.addEventListener("load", init);
  }
})();
