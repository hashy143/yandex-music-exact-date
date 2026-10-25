(() => {
  const dateCache = new Map();

  function getOrCreateTooltip() {
    let tooltip = document.getElementById("ym-exact-date-bubble");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "ym-exact-date-bubble";
      tooltip.className = "ym-exact-date-bubble";
      document.body.appendChild(tooltip);
    }
    return tooltip;
  }

  async function fetchAlbumDate(albumId) {
    if (dateCache.has(albumId)) return dateCache.get(albumId);

    try {
      const response = await fetch(`https://api.music.yandex.net/albums/${albumId}`);
      if (!response.ok) return null;

      const data = await response.json();
      const rawDate = data.result?.releaseDate;
      if (!rawDate) return null;

      const dateObj = new Date(rawDate);
      const formatted = new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(dateObj);

      dateCache.set(albumId, formatted);
      return formatted;
    } catch (err) {
      console.error("[YM-Exact-Date] Ошибка:", err);
      return null;
    }
  }

  function findYearElement() {
    const newUiYear = document.querySelector('[class*="PageHeaderAlbumMeta_year"]');
    if (newUiYear) return newUiYear;

    const yearLink = document.querySelector('a[href*="/year/"]');
    if (yearLink) return yearLink;

    const metaContainer = document.querySelector('[class*="PageHeaderAlbumMeta"], .album-summary');
    if (metaContainer) {
      for (const el of metaContainer.children) {
        if (/^\s*\d{4}\s*$/.test(el.textContent)) return el;
      }
    }

    return null;
  }

  // Получаем точный габаритный прямоугольник чисто текста цифр, игнорируя точку и псевдоэлементы
  function getTextBoundingRect(element) {
    const textNode = Array.from(element.childNodes).find(
      node => node.nodeType === Node.TEXT_NODE && /\d{4}/.test(node.textContent)
    );

    if (textNode) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0) return rect;
    }

    return element.getBoundingClientRect();
  }

  function updateTooltipPosition(target, tooltip) {
    const rect = getTextBoundingRect(target);
    const centerX = rect.left + rect.width / 2;
    const top = rect.top - 8;

    tooltip.style.left = `${centerX}px`;
    tooltip.style.top = `${top}px`;
  }

  function initYearAnchor() {
    const urlMatch = window.location.pathname.match(/\/album\/(\d+)/);
    if (!urlMatch) return;

    const albumId = urlMatch[1];
    const yearElem = findYearElement();

    if (!yearElem || yearElem.dataset.ymBound === albumId) return;

    yearElem.dataset.ymBound = albumId;
    yearElem.classList.add("ym-year-interactive");

    const tooltip = getOrCreateTooltip();

    yearElem.addEventListener("mouseenter", async () => {
      if (dateCache.has(albumId)) {
        tooltip.textContent = `Выпущен: ${dateCache.get(albumId)}`;
      } else {
        tooltip.textContent = "Загрузка даты...";
      }

      updateTooltipPosition(yearElem, tooltip);
      tooltip.classList.add("visible");

      if (!dateCache.has(albumId)) {
        const exactDate = await fetchAlbumDate(albumId);
        tooltip.textContent = exactDate ? `Выпущен: ${exactDate}` : "Точная дата не найдена";
        updateTooltipPosition(yearElem, tooltip);
      }
    });

    yearElem.addEventListener("mouseleave", () => {
      tooltip.classList.remove("visible");
    });
  }

  const observer = new MutationObserver(() => {
    initYearAnchor();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  initYearAnchor();
})();