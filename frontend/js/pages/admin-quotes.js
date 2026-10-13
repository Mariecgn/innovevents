(function () {
    const session = getSession();
    if (!session || session.role !== 'ADMIN' || !document.getElementById('quotes-list')) return;

    const $ = (id) => document.getElementById(id);
    const esc = escapeHtml;

    const state = {
        clients: null,
        quotes: null,
        events: null,
        prospects: null,
        messages: null,
        dialog: null,
        creating: false,
        pendingSend: null,
        sending: false,
        highlight: null,
        lastLoad: 0
    };

    const quoteDialog = $('quote-dialog');
    const quoteForm = $('quote-form');
    const sendDialog = $('send-dialog');

    /* ---------- Chargement (API existantes) ---------- */

    function showError(boxId, message) {
        const box = $(boxId);

        if (box) {
            box.innerHTML = alertHtml(
                'error',
                message,
                '<button type="button" class="btn btn-outline btn-sm" data-retry-admin>Réessayer</button>'
            );
        }
    }

    function clearError(boxId) {
        const box = boxId ? $(boxId) : null;
        if (box) box.innerHTML = '';
    }

    async function fetchInto(key, path, errorBox, label) {
        try {
            const data = await api(path);
            state[key] = key === 'messages' ? data : Array.isArray(data) ? data : [];
            clearError(errorBox);
        } catch (err) {
            if (err.redirected || err.status === 403) return;
            if (errorBox) showError(errorBox, `Impossible de charger ${label}. ${err.message}`);
        }
    }

    async function loadAll() {
        state.lastLoad = Date.now();

        await Promise.all([
            fetchInto('clients', '/clients', 'clients-error', 'les clients'),
            fetchInto('quotes', '/quotes', 'quotes-error', 'les devis'),
            fetchInto('events', '/admin/events', null, 'les événements'),
            fetchInto('prospects', '/prospects', null, 'les prospects'),
            fetchInto('messages', '/notifications', 'messages-error', 'les messages')
        ]);

        if (!$('quotes-list')) return;

        renderClients();
        renderQuotes();
        renderMessages();
    }

    /* ---------- Affichage ---------- */

    function table(label, headers, rows) {
        return `<div class="table-wrap">
            <table class="table--stack">
                <caption class="sr-only">${esc(label)}</caption>
                <thead><tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
                <tbody>${rows.join('')}</tbody>
            </table>
        </div>`;
    }

    function quoteCountFor(clientId) {
        return (state.quotes || []).filter((q) => q.client_id === clientId).length;
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
            host.innerHTML = emptyState(
                'Aucun client pour le moment',
                'Convertissez un prospect pour créer une première fiche client.'
            );
            return;
        }

        const headers = ['Entreprise', 'Contact', 'E-mail', 'Téléphone', 'Devis', 'Action'];

        host.innerHTML = table(
            'Liste des clients',
            headers,
            state.clients.map(
                (c) => `<tr>
                    <td data-label="${headers[0]}"><strong>${esc(c.company_name || '—')}</strong></td>
                    <td data-label="${headers[1]}">${esc(c.firstname)} ${esc(c.lastname)}</td>
                    <td data-label="${headers[2]}"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></td>
                    <td data-label="${headers[3]}">${esc(c.phone)}</td>
                    <td data-label="${headers[4]}">${quoteCountFor(c.id)}</td>
                    <td data-label="${headers[5]}"><button type="button" class="btn btn-sm" data-new-quote="${esc(c.id)}">Créer un devis</button></td>
                </tr>`
            )
        );
    }

    function renderQuotes() {
        const host = $('quotes-list');
        if (!host) return;

        host.setAttribute('aria-busy', 'false');

        if (state.quotes === null) {
            host.innerHTML = '';
            return;
        }

        if (!state.quotes.length) {
            host.innerHTML = emptyState(
                'Aucun devis pour le moment',
                'Créez un devis depuis la liste des clients ci-dessus.'
            );
            return;
        }

        const headers = ['N°', 'Client', 'Événement', 'Total TTC', 'Statut', 'Actions'];

        host.innerHTML = table(
            'Liste des devis',
            headers,
            state.quotes.map((q) => {
                const lines = q.items || [];

                return `<tr data-quote="${esc(q.id)}" tabindex="-1">
                    <td data-label="${headers[0]}"><strong>${esc(q.id)}</strong></td>
                    <td data-label="${headers[1]}"><div class="cell"><strong>${esc(q.company_name)}</strong><br><span class="muted">${esc(q.firstname)} ${esc(q.lastname)}</span></div></td>
                    <td data-label="${headers[2]}"><div class="cell">${esc(q.event_name)}<br><span class="muted">${esc(formatDate(q.event_start))}</span>
                        <details><summary>${lines.length} ligne${lines.length > 1 ? 's' : ''}</summary>
                            <ul>${lines.map((l) => `<li>${esc(l.label)} : ${esc(formatMoney(l.amount_ht))} HT</li>`).join('')}</ul>
                        </details>
                    </div></td>
                    <td data-label="${headers[3]}"><strong>${esc(formatMoney(q.total_ttc))}</strong></td>
                    <td data-label="${headers[4]}">${statusBadge(QUOTE_STATUS, q.status)}</td>
                    <td data-label="${headers[5]}"><div class="row-actions">
                        <button type="button" class="btn btn-outline btn-sm" data-pdf="${esc(q.id)}">Voir le PDF</button>
                        ${q.status === 'BROUILLON' ? `<button type="button" class="btn btn-sm" data-send="${esc(q.id)}">Envoyer au client</button>` : ''}
                    </div></td>
                </tr>`;
            })
        );

        if (state.highlight !== null) {
            const row = host.querySelector(`tr[data-quote="${CSS.escape(String(state.highlight))}"]`);
            state.highlight = null;

            if (row) {
                row.classList.add('is-new');
                row.focus({ preventScroll: true });
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }

    function renderMessages() {
        const host = $('messages-list');
        if (!host) return;

        host.setAttribute('aria-busy', 'false');

        const data = state.messages;

        if (!data) {
            host.innerHTML = '';
            return;
        }

        host.innerHTML = messageList(
            data.items || [],
            'Aucun message pour le moment',
            'Les réponses des clients à vos devis apparaîtront ici.'
        );

        const unread = data.unread || 0;
        const counter = $('nav-messages-count');

        $('messages-read').hidden = unread === 0;
        counter.hidden = unread === 0;
        counter.textContent = unread;
    }

    /* ---------- PDF ---------- */

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

    /* ---------- Envoi d'un devis ---------- */

    function openSend(id) {
        if (state.sending) return;

        const quote = (state.quotes || []).find((q) => String(q.id) === String(id));
        if (!quote || quote.status !== 'BROUILLON') return;

        state.pendingSend = quote;

        $('send-desc').textContent = `Le devis n° ${quote.id} « ${quote.event_name} » (${formatMoney(quote.total_ttc)} TTC) sera envoyé à ${quote.company_name} (${quote.client_email}).`;
        $('send-error').innerHTML = '';
        setBusy($('send-confirm'), false);
        $('send-confirm').textContent = 'Envoyer le devis';
        $('send-confirm').hidden = false;
        $('send-cancel').disabled = false;
        $('send-cancel').textContent = 'Annuler';

        if (typeof sendDialog.showModal === 'function') sendDialog.showModal();
        else if (window.confirm(`Envoyer le devis n° ${quote.id} ?`)) runSend();
    }

    function closeSend() {
        if (sendDialog.open) sendDialog.close();
    }

    async function runSend() {
        const quote = state.pendingSend;
        if (!quote || state.sending) return;

        state.sending = true;

        const confirmButton = $('send-confirm');
        const rowButton = document.querySelector(`[data-send="${CSS.escape(String(quote.id))}"]`);

        $('send-error').innerHTML = '';
        $('send-cancel').disabled = true;
        setBusy(confirmButton, true, 'Envoi en cours…');
        setBusy(rowButton, true, 'Envoi en cours…');

        try {
            await api(`/quotes/${encodeURIComponent(quote.id)}/send`, { method: 'POST' });

            closeSend();
            toast('success', `Devis n° ${quote.id} envoyé à ${quote.company_name} : il le retrouve dans « Mes devis » et en est informé dans sa messagerie.`);

            state.pendingSend = null;
            state.highlight = quote.id;
            await loadAll();
        } catch (err) {
            if (err.redirected) return;

            setBusy(confirmButton, false);
            setBusy(rowButton, false);
            $('send-cancel').disabled = false;

            if (sendDialog.open) {
                setMessage($('send-error'), 'error', err.message);

                if (err.status >= 400 && err.status < 500) {
                    confirmButton.hidden = true;
                    $('send-cancel').textContent = 'Fermer';
                    loadAll();
                } else {
                    confirmButton.textContent = 'Réessayer';
                }
            } else {
                toast('error', err.message);
            }
        } finally {
            state.sending = false;
        }
    }

    /* ---------- Création d'un devis ---------- */

    const pad = (n) => String(n).padStart(2, '0');

    function toInputDate(value) {
        const d = toDate(value);
        return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';
    }

    function prospectFor(client) {
        const email = String(client.email || '').toLowerCase();

        return (state.prospects || [])
            .filter((p) => String(p.email || '').toLowerCase() === email)
            .sort((a, b) => b.id - a.id)[0] || null;
    }

    function ensureTypeOption(type) {
        const select = $('ev-type');

        if (!Array.from(select.options).some((o) => o.value === type)) {
            select.insertAdjacentHTML('beforeend', `<option value="${esc(type)}">${esc(type)}</option>`);
        }
    }

    function toggleNewEvent() {
        const isNew = $('quote-event').value === 'new';

        $('quote-new-event').hidden = !isNew;
        $('quote-new-event')
            .querySelectorAll('input, select')
            .forEach((el) => {
                el.disabled = !isNew;
            });
    }

    function computeTotals() {
        const cents = Array.from($('quote-lines').querySelectorAll('.line-amount')).reduce((sum, input) => {
            const value = Number(input.value);
            return sum + (Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0);
        }, 0);

        const tva = Math.round(cents * 0.2);

        return { ht: cents / 100, tva: tva / 100, ttc: (cents + tva) / 100 };
    }

    function renderTotals() {
        const t = computeTotals();

        $('quote-totals').innerHTML = `<div><dt>Total HT</dt><dd>${esc(formatMoney(t.ht))}</dd></div>
            <div><dt>TVA (20 %)</dt><dd>${esc(formatMoney(t.tva))}</dd></div>
            <div class="totals__ttc"><dt>Total TTC</dt><dd>${esc(formatMoney(t.ttc))}</dd></div>`;
    }

    function renumberLines() {
        const rows = $('quote-lines').querySelectorAll('.quote-line');

        rows.forEach((row, index) => {
            row.querySelector('.line-label').setAttribute('aria-label', `Désignation de la ligne ${index + 1}`);
            row.querySelector('.line-amount').setAttribute('aria-label', `Montant HT de la ligne ${index + 1}, en euros`);
            row.querySelector('[data-remove-line]').setAttribute('aria-label', `Supprimer la ligne ${index + 1}`);
            row.querySelector('[data-remove-line]').hidden = rows.length === 1;
        });
    }

    function addLine(label = '', amount = '') {
        $('quote-lines').insertAdjacentHTML(
            'beforeend',
            `<div class="quote-line">
                <div class="field">
                    <input class="line-label" maxlength="180" placeholder="Désignation (ex. Location de la salle)" value="${esc(label)}" required>
                    <p class="field-error" hidden></p>
                </div>
                <div class="field">
                    <input class="line-amount" type="number" min="0" max="10000000" step="0.01" inputmode="decimal" placeholder="Montant HT (€)" value="${esc(amount)}" required>
                    <p class="field-error" hidden></p>
                </div>
                <button type="button" class="btn btn-ghost btn-sm" data-remove-line>✕</button>
            </div>`
        );

        renumberLines();
        renderTotals();
    }

    function openQuoteDialog(clientId) {
        if (state.creating) return;

        const client = (state.clients || []).find((c) => String(c.id) === String(clientId));
        if (!client) return;

        const prospect = prospectFor(client);
        const type = prospect && prospect.event_type ? prospect.event_type : 'Séminaire';
        const existing = (state.events || []).filter((e) => e.client_id === client.id);

        state.dialog = { client, createdEventId: null };

        $('quote-client').textContent = `${client.company_name || ''} — ${client.firstname} ${client.lastname} (${client.email})`;

        $('quote-event').innerHTML =
            '<option value="new">Nouvel événement</option>' +
            existing
                .map((e) => `<option value="${esc(e.id)}">${esc(e.name)} — ${esc(formatDate(e.start_at))}</option>`)
                .join('');

        $('quote-event').value = existing.length ? String(existing[0].id) : 'new';

        ensureTypeOption(type);
        $('ev-type').value = type;
        $('ev-name').value = `${type} - ${client.company_name || client.lastname}`.slice(0, 180);
        $('ev-date').value = prospect ? toInputDate(prospect.desired_date) : '';
        $('ev-location').value = prospect ? prospect.location : client.address || '';
        $('ev-start').value = '09:00';
        $('ev-end').value = '18:00';

        $('quote-lines').innerHTML = '';
        addLine();

        $('quote-error').innerHTML = '';
        quoteForm.querySelectorAll('[aria-invalid]').forEach((el) => setFieldError(el, ''));
        $('quote-cancel').disabled = false;
        setBusy($('quote-submit'), false);
        toggleNewEvent();

        if (typeof quoteDialog.showModal === 'function') quoteDialog.showModal();
    }

    function closeQuoteDialog() {
        if (quoteDialog.open) quoteDialog.close();
    }

    async function submitQuote(e) {
        e.preventDefault();

        if (state.creating || !state.dialog) return;

        const client = state.dialog.client;
        const error = $('quote-error');
        error.innerHTML = '';

        if (!validateForm(quoteForm)) {
            setMessage(error, 'error', 'Vérifiez les champs signalés en rouge.');
            return;
        }

        const isNew = $('quote-event').value === 'new';

        if (isNew && $('ev-end').value <= $('ev-start').value) {
            setMessage(error, 'error', "L'heure de fin doit être postérieure à l'heure de début.");
            return;
        }

        const items = Array.from($('quote-lines').querySelectorAll('.quote-line')).map((row) => ({
            label: row.querySelector('.line-label').value.trim(),
            amount_ht: Number(row.querySelector('.line-amount').value)
        }));

        state.creating = true;
        $('quote-cancel').disabled = true;
        setBusy($('quote-submit'), true, 'Création en cours…');

        try {
            let eventId = Number($('quote-event').value);

            if (isNew) {
                if (!state.dialog.createdEventId) {
                    const created = await api('/admin/events', {
                        method: 'POST',
                        body: {
                            client_id: client.id,
                            name: $('ev-name').value.trim(),
                            start_at: `${$('ev-date').value} ${$('ev-start').value}:00`,
                            end_at: `${$('ev-date').value} ${$('ev-end').value}:00`,
                            location: $('ev-location').value.trim(),
                            type: $('ev-type').value,
                            theme: null,
                            status: 'BROUILLON',
                            is_public: false,
                            image_url: null
                        }
                    });

                    state.dialog.createdEventId = created.id;
                }

                eventId = state.dialog.createdEventId;
            }

            const quote = await api('/quotes', {
                method: 'POST',
                body: { event_id: eventId, client_id: client.id, items }
            });

            let pdfReady = true;

            try {
                await api(`/quotes/${encodeURIComponent(quote.id)}/pdf`, { method: 'POST', timeout: 30000 });
            } catch (pdfError) {
                if (pdfError.redirected) return;
                pdfReady = false;
            }

            closeQuoteDialog();
            toast(
                'success',
                `Devis n° ${quote.id} créé pour ${client.company_name || client.lastname} (${formatMoney(quote.total_ttc)} TTC)${pdfReady ? ', PDF prêt' : ''}. Envoyez-le au client depuis la liste des devis.`
            );

            state.dialog = null;
            state.highlight = quote.id;
            await loadAll();
        } catch (err) {
            if (err.redirected) return;

            setMessage(error, 'error', err.message);
            setBusy($('quote-submit'), false);
            $('quote-cancel').disabled = false;
        } finally {
            state.creating = false;
        }
    }

    /* ---------- Événements de la page ---------- */

    $('clients-list').addEventListener('click', (e) => {
        const button = e.target.closest('[data-new-quote]');
        if (button) openQuoteDialog(button.dataset.newQuote);
    });

    $('quotes-list').addEventListener('click', (e) => {
        const pdf = e.target.closest('[data-pdf]');

        if (pdf) {
            showPdf(pdf.dataset.pdf, pdf);
            return;
        }

        const send = e.target.closest('[data-send]');
        if (send) openSend(send.dataset.send);
    });

    $('messages-read').addEventListener('click', async (e) => {
        const button = e.currentTarget;
        setBusy(button, true, 'Mise à jour…');

        try {
            await api('/notifications/read', { method: 'POST' });
            await fetchInto('messages', '/notifications', 'messages-error', 'les messages');
            renderMessages();
        } catch (err) {
            if (!err.redirected) toast('error', err.message);
        } finally {
            setBusy(button, false);
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-retry-admin]')) loadAll();
    });

    document.addEventListener('admin:refreshed', () => {
        if (Date.now() - state.lastLoad > 1500) loadAll();
    });

    quoteForm.addEventListener('submit', submitQuote);
    liveValidation(quoteForm);

    $('quote-event').addEventListener('change', toggleNewEvent);
    $('quote-add-line').addEventListener('click', () => addLine());
    $('quote-cancel').addEventListener('click', closeQuoteDialog);

    $('quote-lines').addEventListener('input', renderTotals);

    $('quote-lines').addEventListener('click', (e) => {
        const remove = e.target.closest('[data-remove-line]');
        if (!remove) return;

        remove.closest('.quote-line').remove();
        renumberLines();
        renderTotals();
    });

    quoteDialog.addEventListener('cancel', (e) => {
        if (state.creating) e.preventDefault();
    });

    $('send-confirm').addEventListener('click', runSend);
    $('send-cancel').addEventListener('click', closeSend);

    sendDialog.addEventListener('cancel', (e) => {
        if (state.sending) e.preventDefault();
    });

    sendDialog.addEventListener('click', (e) => {
        if (e.target === sendDialog && !state.sending) closeSend();
    });

    /* ---------- Démarrage ---------- */

    loadAll();
})();
