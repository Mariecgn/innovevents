(function () {
    const session = guardPage(['ADMIN']);
    if (!session) return;

    const $ = (id) => document.getElementById(id);

    const FILTERS = [
        { key: 'all', label: 'Tous', match: () => true },
        { key: 'todo', label: 'À traiter', match: (p) => p.status === 'A_CONTACTER' || p.status === 'QUALIFIE' },
        { key: 'done', label: 'Convertis', match: (p) => p.status === 'CONVERTI' }
    ];

    const state = {
        dashboard: null,
        prospects: null,
        filter: 'all',
        pending: null,
        converting: false,
        highlightId: null,
        loaded: false
    };

    const dialog = $('convert-dialog');

    /* ---------- En-tête ---------- */

    function renderGreeting() {
        $('prenom').textContent = session.firstname;

        const today = new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        $('date-du-jour').textContent =
            today.charAt(0).toUpperCase() + today.slice(1) + ' · Voici l’activité de votre agence.';
    }

    /* ---------- Statistiques ---------- */

    function statCard(iconName, value, label, hint) {
        return `<div class="card stat-card">
            <span class="icon-badge">${icon(iconName, 24)}</span>
            <div>
                <p class="stat-card__value">${escapeHtml(value)}</p>
                <p class="stat-card__label">${escapeHtml(label)}</p>
                ${hint ? `<p class="stat-card__hint">${escapeHtml(hint)}</p>` : ''}
            </div>
        </div>`;
    }

    function statSkeleton() {
        return `<div class="card stat-card" aria-hidden="true">
            <span class="skeleton skeleton-icon"></span>
            <div><span class="skeleton skeleton-line skeleton-line--lg"></span><span class="skeleton skeleton-line"></span></div>
        </div>`;
    }

    function renderStats() {
        const host = $('stats');
        if (!host) return;

        const d = state.dashboard;
        const stats = d && d.stats;
        const pick = (v) => (v === undefined || v === null ? '—' : v);
        const todo = state.prospects ? state.prospects.filter(FILTERS[1].match).length : null;

        host.innerHTML =
            statCard('users', pick(stats && stats.clients_actifs), 'Clients actifs') +
            statCard('edit', pick(stats && stats.events_brouillon), 'Événements brouillon') +
            statCard('calendar', pick(d && Array.isArray(d.events) ? d.events.length : null), 'Prochains événements', 'Voir l’aperçu ci-dessous') +
            statCard('inbox', pick(todo), 'Prospects à traiter', 'À contacter ou qualifiés');

        host.setAttribute('aria-busy', 'false');
    }

    /* ---------- Événements ---------- */

    function eventRow(ev) {
        const start = toDate(ev.start_at);
        const end = toDate(ev.end_at);
        const day = start ? start.getDate() : '–';
        const month = start ? start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : '';
        const past = end && end < new Date();

        return `<li class="card event-row">
            <div class="event-row__date" aria-hidden="true"><strong>${escapeHtml(day)}</strong><span>${escapeHtml(month)}</span></div>
            <div class="event-row__main">
                <h3>${escapeHtml(ev.name)}</h3>
                <p>${escapeHtml(formatEventDates(ev.start_at, ev.end_at))} · ${escapeHtml(ev.location)}</p>
            </div>
            <div class="badges">${past ? '<span class="badge badge--neutral">Passé</span>' : ''}${statusBadge(EVENT_STATUS, ev.status)}</div>
        </li>`;
    }

    function renderEvents() {
        const host = $('events-list');
        if (!host) return;

        const events = state.dashboard && state.dashboard.events;

        if (!Array.isArray(events)) {
            host.innerHTML = '';
            return;
        }

        host.innerHTML = events.length
            ? `<ul class="list-plain">${events.map(eventRow).join('')}</ul>`
            : emptyState('Aucun événement pour le moment', 'Les événements créés apparaîtront ici.');
    }

    /* ---------- Prospects ---------- */

    function prospectCard(p) {
        const done = p.status === 'CONVERTI';
        const phone = String(p.phone || '');
        const tel = phone.replace(/[^\d+]/g, '');

        return `<article class="card prospect-card" data-id="${escapeHtml(p.id)}" tabindex="-1">
            <div class="prospect-card__head">
                <div>
                    <h3>${escapeHtml(p.company_name)}</h3>
                    <p>${escapeHtml(p.firstname)} ${escapeHtml(p.lastname)}</p>
                </div>
                ${statusBadge(PROSPECT_STATUS, p.status)}
            </div>

            <dl class="meta-list">
                <div><dt>E-mail</dt><dd><a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></dd></div>
                <div><dt>Téléphone</dt><dd>${tel ? `<a href="tel:${escapeHtml(tel)}">${escapeHtml(phone)}</a>` : escapeHtml(phone)}</dd></div>
                <div><dt>Type d'événement</dt><dd>${escapeHtml(p.event_type)}</dd></div>
                <div><dt>Participants</dt><dd>${escapeHtml(p.estimated_participants)}</dd></div>
                <div><dt>Date souhaitée</dt><dd>${escapeHtml(formatDate(p.desired_date))}</dd></div>
                <div><dt>Lieu</dt><dd>${escapeHtml(p.location)}</dd></div>
            </dl>

            <details>
                <summary>Besoin exprimé</summary>
                <p>${escapeHtml(p.need_description)}</p>
            </details>

            <div class="prospect-card__foot">
                ${done
                    ? `<p class="done-note">${icon('check', 18)} Converti en client</p>`
                    : `<button type="button" class="btn" data-convert="${escapeHtml(p.id)}">Convertir en client</button>`}
                <p class="hint">Reçu le ${escapeHtml(formatDate(p.created_at))}</p>
            </div>
        </article>`;
    }

    function renderFilters() {
        const host = $('prospect-filters');
        if (!host) return;

        const all = state.prospects || [];

        host.innerHTML = FILTERS.map(
            (f) =>
                `<button type="button" class="chip" data-filter="${f.key}" aria-pressed="${state.filter === f.key}">${f.label} <span class="chip__count">${all.filter(f.match).length}</span></button>`
        ).join('');
    }

    function renderProspects() {
        const host = $('prospects');
        if (!host || state.prospects === null) return;

        renderFilters();
        host.setAttribute('aria-busy', 'false');

        const all = state.prospects;
        const count = $('prospect-count');

        if (!all.length) {
            count.textContent = '';
            host.innerHTML = emptyState(
                'Aucun prospect pour le moment',
                'Les demandes de devis envoyées depuis le site apparaîtront ici.',
                '<a class="btn btn-outline btn-sm" href="/pages/quote-request.html">Voir le formulaire de demande de devis</a>'
            );
            return;
        }

        const filter = FILTERS.find((f) => f.key === state.filter) || FILTERS[0];
        const shown = all.filter(filter.match);

        count.textContent = `${shown.length} prospect${shown.length > 1 ? 's' : ''} affiché${shown.length > 1 ? 's' : ''} sur ${all.length}`;

        host.innerHTML = shown.length
            ? `<div class="prospect-grid">${shown.map(prospectCard).join('')}</div>`
            : emptyState('Aucun prospect dans cette catégorie', 'Changez de filtre pour afficher les autres prospects.');

        if (state.highlightId !== null) {
            const card = host.querySelector(`.prospect-card[data-id="${CSS.escape(String(state.highlightId))}"]`);
            state.highlightId = null;

            if (card) {
                card.classList.add('is-new');
                card.focus({ preventScroll: true });
                card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }

    function renderProspectsSkeleton() {
        $('prospects').innerHTML = `<div class="prospect-grid" aria-hidden="true">
            <div class="card"><span class="skeleton skeleton-line skeleton-line--lg"></span><span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line"></span></div>
            <div class="card"><span class="skeleton skeleton-line skeleton-line--lg"></span><span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line"></span></div>
        </div>`;
    }

    /* ---------- Chargement des données (API existantes) ---------- */

    function showError(boxId, message) {
        const box = $(boxId);
        if (box) {
            box.innerHTML = alertHtml(
                'error',
                message,
                '<button type="button" class="btn btn-outline btn-sm" data-retry>Réessayer</button>'
            );
        }
    }

    function clearError(boxId) {
        const box = $(boxId);
        if (box) box.innerHTML = '';
    }

    async function loadDashboard() {
        try {
            state.dashboard = await api('/dashboard/admin');
            clearError('stats-error');
            $('role-badge').hidden = false;
        } catch (err) {
            if (err.redirected) return;

            if (err.status === 403) {
                renderForbidden(session);
                return;
            }

            showError('stats-error', `Impossible de charger les statistiques. ${err.message}`);
        }
    }

    async function loadProspects() {
        try {
            const rows = await api('/prospects');
            state.prospects = Array.isArray(rows) ? rows : [];
            clearError('prospects-error');
        } catch (err) {
            if (err.redirected || err.status === 403) return;

            showError('prospects-error', `Impossible de charger les prospects. ${err.message}`);

            if (state.prospects === null) {
                const host = $('prospects');
                if (host) {
                    host.innerHTML = '';
                    host.setAttribute('aria-busy', 'false');
                }
            }
        }
    }

    async function refresh() {
        const button = $('refresh');
        setBusy(button, true, 'Actualisation…');

        await Promise.all([loadDashboard(), loadProspects()]);

        if (!$('stats')) return;

        renderStats();
        renderEvents();
        renderProspects();
        setBusy(button, false);
        state.loaded = true;
    }

    /* ---------- Conversion prospect -> client ---------- */

    function resetDialog() {
        $('convert-error').innerHTML = '';
        $('convert-confirm').hidden = false;
        $('convert-cancel').disabled = false;
        $('convert-cancel').textContent = 'Annuler';
        setBusy($('convert-confirm'), false);
    }

    function closeDialog() {
        if (dialog.open) dialog.close();
    }

    function conversionMessage(err) {
        if (err.status === 400 && /d[ée]j[àa] existant/i.test(err.message)) {
            return 'Un client avec la même adresse e-mail existe déjà : le prospect n’a pas été converti.';
        }
        if (err.status === 404) {
            return 'Ce prospect est introuvable (il a peut-être été supprimé). La liste a été actualisée.';
        }
        if (err.status === 403) {
            return 'Accès refusé : seul un administrateur peut convertir un prospect.';
        }
        return err.message;
    }

    function openConversion(id) {
        if (state.converting) return;

        const prospect = (state.prospects || []).find((p) => String(p.id) === String(id));
        if (!prospect || prospect.status === 'CONVERTI') return;

        state.pending = prospect;
        $('convert-company').textContent = prospect.company_name;
        $('convert-contact').textContent = `${prospect.firstname} ${prospect.lastname}`;
        resetDialog();

        if (typeof dialog.showModal === 'function') {
            dialog.showModal();
        } else if (window.confirm(`Convertir « ${prospect.company_name} » en client ?`)) {
            runConversion();
        }
    }

    async function runConversion() {
        const prospect = state.pending;
        if (!prospect || state.converting) return;

        state.converting = true;

        const confirmButton = $('convert-confirm');
        const cardButton = document.querySelector(`[data-convert="${CSS.escape(String(prospect.id))}"]`);

        $('convert-error').innerHTML = '';
        $('convert-cancel').disabled = true;
        setBusy(confirmButton, true, 'Conversion en cours…');
        setBusy(cardButton, true, 'Conversion en cours…');

        try {
            const result = await api(`/prospects/${encodeURIComponent(prospect.id)}/convert`, { method: 'POST' });

            closeDialog();

            const reference = result && result.client_id ? ` (fiche client n° ${result.client_id})` : '';
            toast('success', `« ${prospect.company_name} » a été converti en client${reference}.`);

            state.pending = null;
            state.highlightId = prospect.id;
            await refresh();
        } catch (err) {
            if (err.redirected) return;

            setBusy(confirmButton, false);
            setBusy(cardButton, false);
            $('convert-cancel').disabled = false;

            const message = conversionMessage(err);

            if (dialog.open) {
                setMessage($('convert-error'), 'error', message);

                if (err.status >= 400 && err.status < 500) {
                    confirmButton.hidden = true;
                    $('convert-cancel').textContent = 'Fermer';
                    refresh();
                } else {
                    confirmButton.textContent = 'Réessayer';
                }
            } else {
                toast('error', message);
            }
        } finally {
            state.converting = false;
        }
    }

    /* ---------- Événements de la page ---------- */

    $('prospects').addEventListener('click', (e) => {
        const button = e.target.closest('[data-convert]');
        if (button) openConversion(button.dataset.convert);
    });

    $('prospect-filters').addEventListener('click', (e) => {
        const chip = e.target.closest('[data-filter]');
        if (!chip) return;

        state.filter = chip.dataset.filter;
        renderProspects();
        const active = $('prospect-filters').querySelector(`[data-filter="${state.filter}"]`);
        if (active) active.focus();
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-retry]')) refresh();
    });

    $('refresh').addEventListener('click', refresh);
    $('convert-confirm').addEventListener('click', runConversion);
    $('convert-cancel').addEventListener('click', closeDialog);

    dialog.addEventListener('cancel', (e) => {
        if (state.converting) e.preventDefault();
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog && !state.converting) closeDialog();
    });

    /* ---------- Démarrage ---------- */

    renderGreeting();
    $('stats').innerHTML = statSkeleton().repeat(4);
    renderProspectsSkeleton();
    refresh();
})();
