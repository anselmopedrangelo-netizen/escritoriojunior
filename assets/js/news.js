// Renders news pulled from data/news.json (built by scripts/fetch-news.mjs)
(function () {
  const DATA_URL = 'data/news.json';

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function cardHtml(item) {
    return `
      <article class="card news-card">
        <span class="news-card__source">${escapeHtml(item.sourceName)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="news-card__date">${escapeHtml(formatDate(item.date))}</div>
        <p>${escapeHtml(item.summary)}</p>
        <a class="news-card__link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Ler notícia completa &rarr;</a>
      </article>
    `;
  }

  async function loadNews() {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao carregar notícias');
    return res.json();
  }

  // Homepage preview: a handful of latest items, no filters.
  window.initNewsPreview = async function initNewsPreview(selector, limit = 3) {
    const el = document.querySelector(selector);
    if (!el) return;
    try {
      const data = await loadNews();
      const items = (data.items || []).slice(0, limit);
      if (!items.length) {
        el.innerHTML = '<p class="news-status">Nenhuma notícia disponível no momento.</p>';
        return;
      }
      el.innerHTML = items.map(cardHtml).join('');
    } catch (e) {
      el.innerHTML = '<p class="news-status">Não foi possível carregar as notícias agora. Tente novamente mais tarde.</p>';
    }
  };

  // Full news page: filter tabs by source + "updated at" meta.
  window.initNewsPage = async function initNewsPage(gridSelector, filtersSelector, metaSelector) {
    const grid = document.querySelector(gridSelector);
    const filtersEl = document.querySelector(filtersSelector);
    const metaEl = metaSelector ? document.querySelector(metaSelector) : null;
    if (!grid) return;

    grid.innerHTML = '<p class="news-status">Carregando notícias...</p>';

    let data;
    try {
      data = await loadNews();
    } catch (e) {
      grid.innerHTML = '<p class="news-status">Não foi possível carregar as notícias agora. Tente novamente mais tarde.</p>';
      return;
    }

    const items = data.items || [];
    const sources = data.sources || [];

    function render(filter) {
      const filtered = filter === 'all' ? items : items.filter((i) => i.source === filter);
      grid.innerHTML = filtered.length
        ? filtered.map(cardHtml).join('')
        : '<p class="news-status">Nenhuma notícia encontrada para este filtro.</p>';
    }

    if (filtersEl) {
      const buttons = ['<button data-filter="all" class="is-active">Todas</button>']
        .concat(sources.map((s) => `<button data-filter="${escapeHtml(s.id)}">${escapeHtml(s.name)}</button>`));
      filtersEl.innerHTML = buttons.join('');
      filtersEl.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-filter]');
        if (!btn) return;
        filtersEl.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        render(btn.dataset.filter);
      });
    }

    if (metaEl && data.generatedAt) {
      metaEl.textContent = `Última atualização: ${formatDate(data.generatedAt)}`;
    }

    render('all');
  };
})();
