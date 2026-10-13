(function () {
    const session = guardPage(['EMPLOYEE']);
    if (!session) return;

    const $ = (id) => document.getElementById(id);
    const state = { events: null, clients: null };

    function renderGreeting() {
        $('prenom').textContent = session.firstname;

        const today = new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        $('date-du-jour').textContent = today.charAt(0).toUpperCase() + today.slice(1);
    }

    function statCard(iconName, value, label) {
        return `<div class="card stat-card">
            <span class="icon-badge">${icon(iconName, 24)}</span>
            <div>
                <p class="stat-card__value">${escapeHtml(value)}</p>
                <p class="stat-card__label">${escapeHtml(label)}</p>
            </div>
        </div>`;
    }

    function renderStats() {
        const host = $('stats');
        if (!host) return;

        const events = state.events;
        const drafts = events ? events.filter((e) => e.status === 'BROUILLON').length : null;
        const pick = (v) => (v === null ? '—' : v);

        host.innerHTML =
            statCard('calendar', pick(events ? events.length : null), 'Événements') +
            statCard('edit', pick(drafts), 'Événements brouillon') +
            statCard('users', pick(state.clients ? state.clients.length : null), 'Clients');

        host.setAttribute('aria-busy', 'false');
    }

    function table(label, headers, rows) {
        return `<div class="table-wrap">
            <table class="table--stack">
                <caption class="sr-only">${escapeHtml(label)}</caption>
                <thead><tr>${headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('')}</tr></thead>
                <tbody>${rows.join('')}</tbody>
            </table>
        </div>`;
    }

    function renderEvents() {
        const host = $('events-list');
        if (!host) return;

        host.setAttribute('aria-busy', 'false');

        if (state.events === null) {
            host.innerHTML = '';
            return;
        }

        if (!state.events.length) {
            host.innerHTML = emptyState('Aucun événement pour le moment', 'Les événements créés apparaîtront ici.');
            return;
        }

        const headers = ['Événement', 'Dates', 'Lieu', 'Type', 'Statut'];
        const rows = state.events.map(
            (e) => `<tr>
                <td data-label="${headers[0]}"><strong>${escapeHtml(e.name)}</strong></td>
                <td data-label="${headers[1]}">${escapeHtml(formatEventDates(e.start_at, e.end_at))}</td>
                <td data-label="${headers[2]}">${escapeHtml(e.location)}</td>
                <td data-label="${headers[3]}">${escapeHtml(e.type)}</td>
                <td data-label="${headers[4]}">${statusBadge(EVENT_STATUS, e.status)}</td>
            </tr>`
        );

        host.innerHTML = table('Liste des événements', headers, rows);
    }

    function renderClients() {
        const host = $('clients-list');
        if (!host) return;

        host.setAttribute('aria-busy', 'false');

        if (state.clients === null) {
            host.innerHTML = '';
            return;
        }

        if (!state.clients.length) {
            host.innerHTML = emptyState('Aucun client pour le moment', 'Les clients apparaîtront ici après la conversion d’un prospect.');
            return;
        }

        const headers = ['Entreprise', 'Contact', 'E-mail', 'Téléphone', 'Adresse'];
        const rows = state.clients.map(
            (c) => `<tr>
                <td data-label="${headers[0]}"><strong>${escapeHtml(c.company_name || '—')}</strong></td>
                <td data-label="${headers[1]}">${escapeHtml(c.firstname)} ${escapeHtml(c.lastname)}</td>
                <td data-label="${headers[2]}"><a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a></td>
                <td data-label="${headers[3]}">${escapeHtml(c.phone)}</td>
                <td data-label="${headers[4]}">${escapeHtml(c.address || '—')}</td>
            </tr>`
        );

        host.innerHTML = table('Liste des clients', headers, rows);
    }

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

    async function load(path, key, errorBox, label) {
        try {
            const rows = await api(path);
            state[key] = Array.isArray(rows) ? rows : [];
            const box = $(errorBox);
            if (box) box.innerHTML = '';
            return true;
        } catch (err) {
            if (err.redirected) return false;
            if (err.status === 403) {
                renderForbidden(session);
                return false;
            }
            showError(errorBox, `Impossible de charger ${label}. ${err.message}`);
            return true;
        }
    }

    async function refresh() {
        const button = $('refresh');
        setBusy(button, true, 'Actualisation…');

        const results = await Promise.all([
            load('/admin/events', 'events', 'events-error', 'les événements'),
            load('/clients', 'clients', 'clients-error', 'les clients')
        ]);

        if (!$('stats') || results.includes(false)) return;

        if (state.events !== null || state.clients !== null) $('role-badge').hidden = false;

        renderStats();
        renderEvents();
        renderClients();
        setBusy(button, false);
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-retry]')) refresh();
    });

    $('refresh').addEventListener('click', refresh);

    renderGreeting();
    refresh();
})();
