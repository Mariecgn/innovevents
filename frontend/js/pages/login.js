(function () {
    const $ = (id) => document.getElementById(id);

    const form = $('login-form');
    const submit = $('login-submit');
    const message = $('login-message');

    const NOTICES = {
        expired: ['warning', 'Votre session a expiré. Veuillez vous reconnecter.'],
        auth: ['info', 'Veuillez vous connecter pour accéder à cet espace.'],
        logout: ['success', 'Vous avez bien été déconnecté(e).']
    };

    const params = new URLSearchParams(location.search);
    const notice = NOTICES[params.get('reason')];

    if (notice) {
        setMessage($('login-notice'), notice[0], notice[1]);
        history.replaceState(null, '', location.pathname);
    }

    function loginErrorMessage(err) {
        if (err.status === 401) return 'E-mail ou mot de passe incorrect.';
        return err.message;
    }

    /* ---------- Déjà connecté ---------- */

    const current = getSession();

    if (current && current.firstname && dashboardFor(current.role)) {
        $('login-card').innerHTML = `<p>Vous êtes déjà connecté(e) en tant que <strong>${escapeHtml(current.firstname)}</strong> (${escapeHtml(ROLE_LABELS[current.role] || current.role)}).</p>
            <div class="form-actions">
                <a class="btn" href="${dashboardFor(current.role)}">Accéder à mon tableau de bord</a>
                <button type="button" class="btn btn-outline" data-logout>Déconnexion</button>
            </div>`;
        $('register-hint').hidden = true;
        return;
    }

    /* ---------- Connexion ---------- */

    liveValidation(form);

    $('toggle-password').addEventListener('click', (e) => {
        const field = $('password');
        const show = field.type === 'password';
        field.type = show ? 'text' : 'password';
        e.currentTarget.textContent = show ? 'Masquer' : 'Afficher';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.innerHTML = '';

        if (!validateForm(form)) return;

        setBusy(submit, true, 'Connexion en cours…');

        try {
            const data = await api('/auth/login', {
                method: 'POST',
                auth: false,
                body: {
                    email: form.elements.email.value.trim(),
                    password: form.elements.password.value
                }
            });

            if (!saveSession(data)) {
                throw new ApiError('Réponse inattendue du serveur. Veuillez réessayer.', 500);
            }

            const session = getSession();
            const target = session && dashboardFor(session.role);

            if (!target) {
                clearSession();
                throw new ApiError("Votre profil n'est associé à aucun espace.", 403);
            }

            setMessage(message, 'success', 'Connexion réussie. Redirection en cours…');
            location.assign(target);
        } catch (err) {
            setMessage(message, 'error', loginErrorMessage(err));
            setBusy(submit, false);
            form.elements.password.value = '';
            form.elements.password.focus();
        }
    });

    /* ---------- Mot de passe oublié ---------- */

    const dialog = $('forgot-dialog');
    const forgotForm = $('forgot-form');
    const forgotMessage = $('forgot-message');
    const forgotSubmit = $('forgot-submit');

    liveValidation(forgotForm);

    $('forgot-open').addEventListener('click', () => {
        forgotMessage.innerHTML = '';
        forgotSubmit.hidden = false;
        $('forgot-cancel').textContent = 'Annuler';
        forgotForm.elements.email.value = form.elements.email.value;

        if (typeof dialog.showModal === 'function') dialog.showModal();
    });

    $('forgot-cancel').addEventListener('click', () => dialog.close());

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        forgotMessage.innerHTML = '';

        if (!validateForm(forgotForm)) return;

        setBusy(forgotSubmit, true, 'Envoi en cours…');

        try {
            const res = await api('/auth/forgot-password', {
                method: 'POST',
                auth: false,
                body: { email: forgotForm.elements.email.value.trim() }
            });

            setMessage(forgotMessage, 'success', res.message || 'Demande envoyée.');
            forgotSubmit.hidden = true;
            $('forgot-cancel').textContent = 'Fermer';
        } catch (err) {
            setMessage(forgotMessage, 'error', err.message);
        } finally {
            setBusy(forgotSubmit, false);
        }
    });
})();
