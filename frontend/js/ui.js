function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

/* ---------- Dates ---------- */

function toDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
    const d = toDate(value);
    return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
}

function formatTime(value) {
    const d = toDate(value);
    return d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
}

function formatDateTime(value) {
    const d = toDate(value);
    return d ? `${formatDate(d)} à ${formatTime(d)}` : '—';
}

function formatEventDates(start, end) {
    const s = toDate(start);
    const e = toDate(end);
    if (!s) return '';
    if (!e) return `${formatDate(s)} · ${formatTime(s)}`;
    if (s.toDateString() === e.toDateString()) {
        return `${formatDate(s)} · ${formatTime(s)} – ${formatTime(e)}`;
    }
    return `${formatDate(s)} ${formatTime(s)} → ${formatDate(e)} ${formatTime(e)}`;
}

/* ---------- Statuts (valeurs de l'API -> libellés) ---------- */

// ECHOUE (valeur du schéma SQL) correspond au refus d'un prospect par l'agence.
const PROSPECT_STATUS = {
    A_CONTACTER: { label: 'À contacter', tone: 'warning' },
    QUALIFIE: { label: 'Qualifié', tone: 'info' },
    ECHOUE: { label: 'Refusé', tone: 'danger' },
    CONVERTI: { label: 'Converti', tone: 'success' }
};

const EVENT_STATUS = {
    BROUILLON: { label: 'Brouillon', tone: 'neutral' },
    ACCEPTE: { label: 'Accepté', tone: 'success' },
    EN_COURS: { label: 'En cours', tone: 'info' },
    TERMINE: { label: 'Terminé', tone: 'neutral' },
    ANNULE: { label: 'Annulé', tone: 'danger' }
};

const QUOTE_STATUS = {
    BROUILLON: { label: 'Brouillon', tone: 'neutral' },
    ETUDE_CLIENT: { label: 'Envoyé · en étude', tone: 'info' },
    ACCEPTE: { label: 'Accepté', tone: 'success' },
    MODIFICATION: { label: 'Modification demandée', tone: 'warning' },
    REFUSE: { label: 'Refusé', tone: 'danger' }
};

function statusBadge(map, key) {
    const status = map[key] || { label: key || '—', tone: 'neutral' };
    return `<span class="badge badge--${status.tone}">${escapeHtml(status.label)}</span>`;
}

/* ---------- Icônes (SVG en ligne, sans dépendance) ---------- */

const ICONS = {
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    xcircle: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    presentation: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
};

function icon(name, size = 20) {
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
}

/* ---------- Messages ---------- */

const ALERT_ICONS = { success: 'check', error: 'alert', warning: 'alert', info: 'info' };

function alertHtml(type, message, actionsHtml = '') {
    const role = type === 'error' ? 'alert' : 'status';
    return `<div class="alert alert--${type}" role="${role}">
        <span class="alert__icon">${icon(ALERT_ICONS[type] || 'info')}</span>
        <div class="alert__body"><p>${escapeHtml(message)}</p>${actionsHtml ? `<div class="alert__actions">${actionsHtml}</div>` : ''}</div>
    </div>`;
}

function setMessage(container, type, message) {
    if (!container) return;
    container.innerHTML = message ? alertHtml(type, message) : '';
}

function emptyState(title, text, actionHtml = '') {
    return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p>${actionHtml}</div>`;
}

function toast(type, message, { duration } = {}) {
    let region = document.getElementById('toast-region');

    if (!region) {
        region = document.createElement('div');
        region.id = 'toast-region';
        region.className = 'toast-region';
        document.body.appendChild(region);
    }

    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span class="alert__icon">${icon(ALERT_ICONS[type] || 'info')}</span>
        <p class="toast__msg">${escapeHtml(message)}</p>
        <button type="button" class="toast__close" aria-label="Fermer ce message">×</button>`;

    const close = () => el.remove();
    el.querySelector('.toast__close').addEventListener('click', close);
    region.appendChild(el);

    const ms = duration === undefined ? (type === 'error' ? 12000 : 8000) : duration;
    if (ms > 0) setTimeout(close, ms);

    return el;
}

function setBusy(button, busy, busyLabel) {
    if (!button) return;

    if (busy) {
        if (button.dataset.label === undefined) button.dataset.label = button.textContent;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        if (busyLabel) button.textContent = busyLabel;
    } else {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        if (button.dataset.label !== undefined) {
            button.textContent = button.dataset.label;
            delete button.dataset.label;
        }
    }
}

/* ---------- Validation de formulaire (messages en français) ---------- */

function fieldMessage(el) {
    const v = el.validity;
    if (v.customError) return el.validationMessage;
    if (v.valueMissing) return el.dataset.msgRequired || 'Ce champ est obligatoire.';
    if (v.typeMismatch) {
        return el.type === 'email'
            ? 'Saisissez une adresse e-mail valide (exemple : nom@entreprise.fr).'
            : 'Le format saisi est invalide.';
    }
    if (v.patternMismatch) return el.dataset.msgPattern || 'Le format saisi est invalide.';
    if (v.rangeUnderflow) return el.dataset.msgMin || `La valeur doit être supérieure ou égale à ${el.min}.`;
    if (v.rangeOverflow) return `La valeur doit être inférieure ou égale à ${el.max}.`;
    if (v.tooLong) return `Maximum ${el.maxLength} caractères.`;
    return el.validationMessage || 'Valeur invalide.';
}

function setFieldError(el, message) {
    const field = el.closest('.field');
    const box = field ? field.querySelector('.field-error') : null;

    if (message) {
        el.setAttribute('aria-invalid', 'true');
    } else {
        el.removeAttribute('aria-invalid');
    }

    if (box) {
        box.textContent = message || '';
        box.hidden = !message;
    }
}

function validateForm(form) {
    let firstInvalid = null;

    form.querySelectorAll('input, select, textarea').forEach((el) => {
        if (el.type === 'hidden' || el.disabled) return;
        const message = el.validity.valid ? '' : fieldMessage(el);
        setFieldError(el, message);
        if (message && !firstInvalid) firstInvalid = el;
    });

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
}

function liveValidation(form) {
    form.addEventListener('input', (e) => {
        const el = e.target;
        if (el.getAttribute && el.getAttribute('aria-invalid') === 'true' && el.validity.valid) {
            setFieldError(el, '');
        }
    });
}

/* ---------- Devis et messagerie (partagés admin / client) ---------- */

const MONEY_FORMAT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function formatMoney(value) {
    const n = Number(value);
    return Number.isFinite(n) ? MONEY_FORMAT.format(n) : '—';
}

function messageList(items, emptyTitle, emptyText) {
    if (!items.length) return emptyState(emptyTitle, emptyText);

    return `<ul class="message-list">${items
        .map(
            (n) => `<li class="message${n.read ? '' : ' is-unread'}">
                <div class="message__head">
                    <strong>${n.read ? '' : '<span class="sr-only">Nouveau message : </span>'}${escapeHtml(n.title)}</strong>
                    <time datetime="${escapeHtml(n.created_at)}">${escapeHtml(formatDateTime(n.created_at))}</time>
                </div>
                <p>${escapeHtml(n.message)}</p>
            </li>`
        )
        .join('')}</ul>`;
}

// Ouvre le PDF d'un devis (route protégée : le jeton est envoyé par fetch, pas par un simple lien).
// La fenêtre est ouverte tout de suite (clic de l'utilisateur) pour ne pas être bloquée par le navigateur.
async function openQuotePdf(id) {
    const win = window.open('', '_blank');
    const name = `devis-${id}.pdf`;

    const note = (html) => {
        try {
            win.document.title = `Devis n° ${id}`;
            win.document.body.innerHTML = `<p style="font:16px Arial,sans-serif;padding:2rem">${html}</p>`;
        } catch (e) {
            /* la fenêtre n'est pas modifiable : sans importance */
        }
    };

    if (win) note('Chargement du devis…');

    try {
        const blob = await api(`/quotes/${encodeURIComponent(id)}/pdf`, { blob: true, timeout: 30000 });
        const url = URL.createObjectURL(blob);

        if (win) {
            note(`Si le devis ne s'affiche pas, <a href="${url}" download="${name}">téléchargez-le</a>.`);
            win.location.href = url;
        } else {
            const link = document.createElement('a');
            link.href = url;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }

        setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
    } catch (err) {
        if (win) win.close();
        throw err;
    }
}

/* ---------- Événements (carte réutilisée : accueil + page Événements) ---------- */

const FALLBACK_EVENT_IMAGE = '/assets/hero.svg';

function eventImage(url) {
    const value = String(url || '').trim();
    if (!value || /(^|\/)event\.jpg$/i.test(value)) return FALLBACK_EVENT_IMAGE;
    return /^(\/(?!\/)|https?:\/\/)/i.test(value) ? value : FALLBACK_EVENT_IMAGE;
}

function renderEventCard(e) {
    const status = EVENT_STATUS[e.status];
    const type = e.type ? `<span class="badge">${escapeHtml(e.type)}</span>` : '';
    const theme = e.theme ? `<span class="badge badge--neutral">${escapeHtml(e.theme)}</span>` : '';
    const state = status && e.status !== 'ACCEPTE' ? statusBadge(EVENT_STATUS, e.status) : '';
    const quote = '/pages/quote-request.html' + (e.type ? '?event_type=' + encodeURIComponent(e.type) : '');

    return `<article class="card event-card">
        <div class="event-card__media">
            <img src="${escapeHtml(eventImage(e.image_url))}" alt="" loading="lazy" width="640" height="400">
        </div>
        <div class="event-card__body">
            <div class="badges">${type}${theme}${state}</div>
            <h3>${escapeHtml(e.name)}</h3>
            <p class="meta-line">${icon('calendar', 16)}<span>${escapeHtml(formatEventDates(e.start_at, e.end_at))}</span></p>
            <p class="meta-line">${icon('pin', 16)}<span>${escapeHtml(e.location)}</span></p>
            <a class="btn btn-outline btn-sm" href="${quote}">Prestations et devis</a>
        </div>
    </article>`;
}

function bindImageFallback(container) {
    container.addEventListener(
        'error',
        (e) => {
            const img = e.target;
            if (img && img.tagName === 'IMG' && !img.dataset.fallback) {
                img.dataset.fallback = '1';
                img.src = FALLBACK_EVENT_IMAGE;
            }
        },
        true
    );
}
