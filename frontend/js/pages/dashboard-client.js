(function () {
    const session = guardPage(['CLIENT']);
    if (!session) return;

    const $ = (id) => document.getElementById(id);
    const esc = escapeHtml;

    const CLIENT_QUOTE_STATUS = {
        ...QUOTE_STATUS,
        ETUDE_CLIENT: { label: 'À étudier', tone: 'info' }
    };

    const NOTES = {
        ACCEPTE: ['success', 'Vous avez accepté ce devis. L’agence prépare la suite de votre événement.'],
        REFUSE: ['danger', 'Vous avez refusé ce devis.'],
        MODIFICATION: ['warning', 'Votre demande de modification a été transmise à l’agence. Si elle donne lieu à un nouveau devis, vous en serez informé dans votre messagerie.']
    };

    const MODES = {
        accept: {
            title: 'Accepter ce devis ?',
            describe: (q) => `Vous acceptez le devis n° ${q.id} « ${q.event_name} » (${formatMoney(q.total_ttc)} TTC). L’agence en sera informée.`,
            confirm: 'Accepter le devis',
            comment: null
        },
        modify: {
            title: 'Demander une modification',
            describe: (q) => `Indiquez à l’agence ce que vous souhaitez modifier dans le devis n° ${q.id} « ${q.event_name} ».`,
            confirm: 'Envoyer ma demande',
            comment: 'Modification souhaitée (obligatoire)'
        },
        refuse: {
            title: 'Refuser ce devis ?',
            describe: (q) => `Vous refusez le devis n° ${q.id} « ${q.event_name} ». Cette réponse est définitive.`,
            confirm: 'Refuser le devis',
            comment: 'Motif (facultatif)'
        }
    };

    const state = { quotes: null, messages: null, pending: null, responding: false };
    const dialog = $('respond-dialog');
    const form = $('respond-form');

    /* ---------- En-tête ---------- */

    $('prenom').textContent = session.firstname;

    const today = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    $('date-du-jour').textContent = today.charAt(0).toUpperCase() + today.slice(1);

    $('icon-events').innerHTML = icon('calendar', 24);
    $('icon-quote').innerHTML = icon('edit', 24);
    $('icon-contact').innerHTML = icon('mail', 24);

    /* ---------- Chargement ---------- */

    function showError(boxId, message) {
        $(boxId).innerHTML = alertHtml(
            'error',
            message,
            '<button type="button" class="btn btn-outline btn-sm" data-retry-client>Réessayer</button>'
        );
    }

    async function fetchInto(key, path, errorBox, label) {
        try {
            const data = await api(path);
            state[key] = key === 'messages' ? data : Array.isArray(data) ? data : [];
            $(errorBox).innerHTML = '';
        } catch (err) {
            if (err.redirected) return;
            if (err.status === 403) {
                renderForbidden(session);
                return;
            }
            showError(errorBox, `Impossible de charger ${label}. ${err.message}`);
        }
    }

    async function loadAll() {
        await Promise.all([
            fetchInto('messages', '/notifications', 'messages-error', 'votre messagerie'),
            fetchInto('quotes', '/quotes/mine', 'quotes-error', 'vos devis')
        ]);

        if (!$('quotes-list')) return;

        renderMessages();
        renderQuotes();
    }

    /* ---------- Messagerie ---------- */

    function renderMessages() {
        const host = $('messages-list');
        host.setAttribute('aria-busy', 'false');

        const data = state.messages;

        if (!data) {
            host.innerHTML = '';
            return;
        }

        host.innerHTML = messageList(
            data.items || [],
            'Aucun message pour le moment',
            'L’agence vous informera ici de l’avancement de votre demande et de vos devis.'
        );

        const unread = data.unread || 0;
        const counter = $('nav-messages-count');

        $('messages-read').hidden = unread === 0;
        counter.hidden = unread === 0;
        counter.textContent = unread;
    }

    /* ---------- Devis ---------- */

    function quoteCard(q) {
        const note = NOTES[q.status];
        const answerable = q.status === 'ETUDE_CLIENT';

        return `<article class="card quote-card" data-quote="${esc(q.id)}">
            <div class="quote-card__head">
                <div>
                    <h3>Devis n° ${esc(q.id)} : ${esc(q.event_name)}</h3>
                    <p>${esc(formatEventDates(q.event_start, q.event_end))} · ${esc(q.event_location)}</p>
                </div>
                ${statusBadge(CLIENT_QUOTE_STATUS, q.status)}
            </div>

            <ul class="quote-lines">
                ${(q.items || []).map((l) => `<li><span>${esc(l.label)}</span><span>${esc(formatMoney(l.amount_ht))} HT</span></li>`).join('')}
            </ul>

            <dl class="totals">
                <div><dt>Total HT</dt><dd>${esc(formatMoney(q.total_ht))}</dd></div>
                <div><dt>TVA (20 %)</dt><dd>${esc(formatMoney(q.tva))}</dd></div>
                <div class="totals__ttc"><dt>Total TTC</dt><dd>${esc(formatMoney(q.total_ttc))}</dd></div>
            </dl>

            ${note ? `<p class="quote-note quote-note--${note[0]}">${esc(note[1])}</p>` : ''}

            <div class="quote-card__actions">
                <button type="button" class="btn btn-outline" data-pdf="${esc(q.id)}">Télécharger le PDF</button>
                ${answerable
                    ? `<button type="button" class="btn" data-respond="accept" data-id="${esc(q.id)}">Accepter</button>
                       <button type="button" class="btn btn-outline" data-respond="modify" data-id="${esc(q.id)}">Demander une modification</button>
                       <button type="button" class="btn btn-danger-outline" data-respond="refuse" data-id="${esc(q.id)}">Refuser</button>`
                    : ''}
            </div>
        </article>`;
    }

    function renderQuotes() {
        const host = $('quotes-list');
        host.setAttribute('aria-busy', 'false');

        if (state.quotes === null) {
            host.innerHTML = '';
            return;
        }

        host.innerHTML = state.quotes.length
            ? `<div class="quote-list">${state.quotes.map(quoteCard).join('')}</div>`
            : emptyState(
                'Aucun devis pour le moment',
                'Dès que l’agence vous enverra un devis, il apparaîtra ici et vous en serez informé dans votre messagerie.',
                '<a class="btn btn-outline btn-sm" href="/pages/quote-request.html">Demander un devis</a>'
            );
    }

    async function showPdf(id, button) {
        setBusy(button, true, 'Ouverture…');

        try {
            await openQuotePdf(id);
        } catch (err) {
            if (!err.redirected) toast('error', `Impossible d’ouvrir le PDF. ${err.message}`);
        } finally {
            setBusy(button, false);
        }
    }

    /* ---------- Réponse à un devis ---------- */

    function openRespond(action, id) {
        if (state.responding) return;

        const quote = (state.quotes || []).find((q) => String(q.id) === String(id));
        const mode = MODES[action];
        if (!quote || !mode || quote.status !== 'ETUDE_CLIENT') return;

        state.pending = { quote, action };

        $('respond-title').textContent = mode.title;
        $('respond-desc').textContent = mode.describe(quote);
        $('respond-comment-field').hidden = mode.comment === null;
        $('respond-comment-label').textContent = mode.comment || '';
        $('respond-comment').value = '';
        setFieldError($('respond-comment'), '');
        $('respond-error').innerHTML = '';
        $('respond-cancel').disabled = false;
        $('respond-cancel').textContent = 'Annuler';

        const confirm = $('respond-confirm');
        setBusy(confirm, false);
        confirm.hidden = false;
        confirm.className = action === 'refuse' ? 'btn btn-danger' : 'btn';
        confirm.textContent = mode.confirm;

        if (typeof dialog.showModal === 'function') dialog.showModal();
        else if (window.confirm(`${mode.title} (devis n° ${quote.id})`) && action !== 'modify') submitRespond();
    }

    function closeRespond() {
        if (dialog.open) dialog.close();
    }

    const RESULT_TOASTS = {
        accept: 'Devis accepté : merci ! L’agence en est informée.',
        modify: 'Votre demande de modification a été transmise à l’agence.',
        refuse: 'Votre refus a bien été enregistré.'
    };

    async function submitRespond(e) {
        if (e) e.preventDefault();

        const pending = state.pending;
        if (!pending || state.responding) return;

        const comment = $('respond-comment').value.trim();

        if (pending.action === 'modify' && !comment) {
            setFieldError($('respond-comment'), 'Précisez la modification souhaitée.');
            $('respond-comment').focus();
            return;
        }

        state.responding = true;
        $('respond-cancel').disabled = true;
        $('respond-error').innerHTML = '';
        setBusy($('respond-confirm'), true, 'Envoi en cours…');

        try {
            await api(`/quotes/${encodeURIComponent(pending.quote.id)}/respond`, {
                method: 'POST',
                body: { action: pending.action, comment }
            });

            closeRespond();
            toast('success', RESULT_TOASTS[pending.action]);

            state.pending = null;
            await loadAll();
        } catch (err) {
            if (err.redirected) return;

            setBusy($('respond-confirm'), false);
            $('respond-cancel').disabled = false;
            setMessage($('respond-error'), 'error', err.message);

            if (err.status >= 400 && err.status < 500) {
                $('respond-confirm').hidden = true;
                $('respond-cancel').textContent = 'Fermer';
                loadAll();
            }
        } finally {
            state.responding = false;
        }
    }

    /* ---------- Événements de la page ---------- */

    $('quotes-list').addEventListener('click', (e) => {
        const pdf = e.target.closest('[data-pdf]');

        if (pdf) {
            showPdf(pdf.dataset.pdf, pdf);
            return;
        }

        const respond = e.target.closest('[data-respond]');
        if (respond) openRespond(respond.dataset.respond, respond.dataset.id);
    });

    $('messages-read').addEventListener('click', async (e) => {
        const button = e.currentTarget;
        setBusy(button, true, 'Mise à jour…');

        try {
            await api('/notifications/read', { method: 'POST' });
            await fetchInto('messages', '/notifications', 'messages-error', 'votre messagerie');
            renderMessages();
        } catch (err) {
            if (!err.redirected) toast('error', err.message);
        } finally {
            setBusy(button, false);
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-retry-client]')) loadAll();
    });

    form.addEventListener('submit', submitRespond);
    $('respond-cancel').addEventListener('click', closeRespond);

    $('respond-comment').addEventListener('input', () => setFieldError($('respond-comment'), ''));

    dialog.addEventListener('cancel', (e) => {
        if (state.responding) e.preventDefault();
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog && !state.responding) closeRespond();
    });

    /* ---------- Démarrage ---------- */

    loadAll();
})();
