(function () {
    const $ = (id) => document.getElementById(id);

    const form = $('register-form');
    const submit = $('register-submit');
    const message = $('register-message');
    const password = form.elements.password;

    // Mêmes règles que le serveur : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
    const RULES = {
        length: (v) => v.length >= 8,
        lower: (v) => /[a-z]/.test(v),
        upper: (v) => /[A-Z]/.test(v),
        digit: (v) => /\d/.test(v),
        special: (v) => /[^A-Za-z0-9]/.test(v)
    };

    function checkPassword() {
        const value = password.value;
        let valid = true;

        document.querySelectorAll('#password-rules [data-rule]').forEach((item) => {
            const ok = RULES[item.dataset.rule](value);
            item.classList.toggle('is-ok', ok);
            if (!ok) valid = false;
        });

        password.setCustomValidity(valid ? '' : 'Le mot de passe ne respecte pas toutes les règles ci-dessous.');
        return valid;
    }

    liveValidation(form);
    password.addEventListener('input', checkPassword);
    checkPassword();

    $('toggle-password').addEventListener('click', (e) => {
        const show = password.type === 'password';
        password.type = show ? 'text' : 'password';
        e.currentTarget.textContent = show ? 'Masquer' : 'Afficher';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.innerHTML = '';

        if (!validateForm(form)) return;

        setBusy(submit, true, 'Création du compte…');

        const field = (name) => form.elements[name].value.trim();

        try {
            await api('/auth/register', {
                method: 'POST',
                auth: false,
                body: {
                    firstname: field('firstname'),
                    lastname: field('lastname'),
                    username: field('username'),
                    email: field('email'),
                    password: password.value
                }
            });

            $('register-card').innerHTML = `${alertHtml('success', 'Votre compte a bien été créé. Vous pouvez maintenant vous connecter.')}
                <div class="form-actions mt-2">
                    <a class="btn" href="/pages/login.html">Se connecter</a>
                    <a class="btn btn-outline" href="/">Retour à l'accueil</a>
                </div>`;
        } catch (err) {
            setMessage(message, 'error', err.message);
            setBusy(submit, false);
        }
    });
})();
