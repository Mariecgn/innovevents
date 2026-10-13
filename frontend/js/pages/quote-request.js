(function () {
    const $ = (id) => document.getElementById(id);

    const form = $('quote-form');
    const submit = $('quote-submit');
    const message = $('quote-message');

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    form.elements.desired_date.min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const wanted = new URLSearchParams(location.search).get('event_type');
    if (wanted && Array.from(form.elements.event_type.options).some((o) => o.value === wanted)) {
        form.elements.event_type.value = wanted;
    }

    $('quote-success-icon').innerHTML = icon('check', 26);

    liveValidation(form);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.innerHTML = '';

        if (!validateForm(form)) return;

        const data = Object.fromEntries(new FormData(form));
        Object.keys(data).forEach((key) => {
            data[key] = String(data[key]).trim();
        });
        data.estimated_participants = Number(data.estimated_participants);

        setBusy(submit, true, 'Envoi en cours…');

        try {
            const res = await api('/prospects', { method: 'POST', auth: false, body: data });

            $('quote-success-text').textContent =
                res.message || 'Merci pour votre demande. Nous vous recontacterons dans les plus brefs délais.';
            $('quote-card').hidden = true;
            $('quote-success').hidden = false;
            $('quote-success').focus();
            form.reset();
        } catch (err) {
            setMessage(message, 'error', err.message);
        } finally {
            setBusy(submit, false);
        }
    });

    $('quote-again').addEventListener('click', () => {
        $('quote-success').hidden = true;
        $('quote-card').hidden = false;
        form.elements.company_name.focus();
    });
})();
