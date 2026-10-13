(function () {
    const $ = (id) => document.getElementById(id);

    const form = $('filters');
    const list = $('events');
    const count = $('result-count');
    const filterMessage = $('filter-message');

    bindImageFallback(list);

    function query() {
        const q = new URLSearchParams();
        const value = (name) => form.elements[name].value.trim();

        if (value('type')) q.set('type', value('type'));
        if (value('theme')) q.set('theme', value('theme'));
        if (value('from')) q.set('from', value('from') + ' 00:00:00');
        if (value('to')) q.set('to', value('to') + ' 23:59:59');

        return q;
    }

    function skeleton() {
        const card = `<div class="card event-card" aria-hidden="true">
            <div class="event-card__media skeleton"></div>
            <div class="event-card__body">
                <span class="skeleton skeleton-line skeleton-line--lg"></span>
                <span class="skeleton skeleton-line"></span>
                <span class="skeleton skeleton-line"></span>
            </div>
        </div>`;

        return `<div class="events-grid">${card.repeat(3)}</div>`;
    }

    function group(title, rows) {
        if (!rows.length) return '';

        return `<h2 class="group-title">${escapeHtml(title)} <span class="chip__count">${rows.length}</span></h2>
            <div class="events-grid">${rows.map(renderEventCard).join('')}</div>`;
    }

    function render(rows) {
        const now = new Date();
        const endOf = (e) => toDate(e.end_at) || toDate(e.start_at);

        const upcoming = rows
            .filter((e) => !endOf(e) || endOf(e) >= now)
            .sort((a, b) => toDate(a.start_at) - toDate(b.start_at));

        const past = rows
            .filter((e) => endOf(e) && endOf(e) < now)
            .sort((a, b) => toDate(b.start_at) - toDate(a.start_at));

        if (!rows.length) {
            const filtered = query().toString() !== '';

            list.innerHTML = emptyState(
                filtered ? 'Aucun événement ne correspond à votre recherche' : 'Aucun événement public pour le moment',
                filtered
                    ? 'Modifiez ou réinitialisez les filtres pour élargir la recherche.'
                    : 'Les événements publics apparaîtront ici dès leur publication.',
                '<a class="btn btn-outline btn-sm" href="/pages/quote-request.html">Demander un devis</a>'
            );
            count.textContent = '';
            return;
        }

        list.innerHTML = group('À venir', upcoming) + group('Événements passés', past);
        count.textContent = `${rows.length} événement${rows.length > 1 ? 's' : ''}`;
    }

    async function load() {
        filterMessage.innerHTML = '';

        if (form.elements.from.value && form.elements.to.value && form.elements.from.value > form.elements.to.value) {
            setMessage(filterMessage, 'error', 'La date de début doit précéder la date de fin.');
            return;
        }

        list.setAttribute('aria-busy', 'true');
        list.innerHTML = skeleton();
        count.textContent = '';

        try {
            const rows = await api('/events?' + query(), { auth: false });
            render(Array.isArray(rows) ? rows : []);
        } catch (err) {
            list.innerHTML = alertHtml(
                'error',
                `Impossible de charger les événements. ${err.message}`,
                '<button type="button" class="btn btn-outline btn-sm" data-retry>Réessayer</button>'
            );
        } finally {
            list.setAttribute('aria-busy', 'false');
        }
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        load();
    });

    form.addEventListener('reset', () => setTimeout(load, 0));

    list.addEventListener('click', (e) => {
        if (e.target.closest('[data-retry]')) load();
    });

    load();
})();
