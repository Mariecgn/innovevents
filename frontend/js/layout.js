(function () {
    const NAV_LINKS = [
        { href: '/', label: 'Accueil' },
        { href: '/pages/events.html', label: 'Événements' },
        { href: '/pages/reviews.html', label: 'Avis' },
        { href: '/pages/contact.html', label: 'Contact' }
    ];

    const QUOTE_URL = '/pages/quote-request.html';

    function currentPath() {
        const path = location.pathname.replace(/\/index\.html$/, '/');
        return path === '' ? '/' : path;
    }

    function current(href) {
        return currentPath() === href ? ' aria-current="page"' : '';
    }

    function renderHeader(session) {
        const host = document.getElementById('site-header');
        if (!host) return;

        const links = NAV_LINKS.map(
            (l) => `<li><a href="${l.href}"${current(l.href)}>${l.label}</a></li>`
        ).join('');

        const home = session ? dashboardFor(session.role) : null;
        let auth;

        if (home) {
            const name = session.firstname;
            const chip = name
                ? `<li><span class="user-chip"><span class="user-chip__avatar" aria-hidden="true">${escapeHtml(name.charAt(0).toUpperCase())}</span><span class="user-chip__name">${escapeHtml(name)}</span></span></li>`
                : '';
            auth = `<li><a href="${home}"${current(home)}>Tableau de bord</a></li>
                ${chip}
                <li><button type="button" class="btn btn-outline btn-sm" data-logout>Déconnexion</button></li>`;
        } else {
            auth = `<li><a href="/pages/login.html"${current('/pages/login.html')}>Connexion</a></li>
                <li><a href="/pages/register.html"${current('/pages/register.html')}>Inscription</a></li>`;
        }

        host.innerHTML = `<div class="site-header__inner">
            <a class="brand" href="/" aria-label="Innov'Events - Accueil">
                <span class="brand__mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" focusable="false"><path d="M12 2l2.2 6.3 6.3 2.2-6.3 2.2L12 19l-2.2-6.3-6.3-2.2 6.3-2.2z"/></svg></span>
                <span>Innov'Events</span>
            </a>
            <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav">
                <span class="nav-toggle__bars" aria-hidden="true"></span>
                <span>Menu</span>
            </button>
            <nav id="site-nav" class="site-nav" aria-label="Navigation principale">
                <ul>${links}</ul>
                <ul class="site-nav__actions">
                    <li><a class="cta" href="${QUOTE_URL}"${current(QUOTE_URL)}>Demande de devis</a></li>
                    ${auth}
                </ul>
            </nav>
        </div>`;

        const toggle = host.querySelector('.nav-toggle');
        const nav = host.querySelector('.site-nav');

        const setOpen = (open) => {
            nav.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', String(open));
        };

        toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));

        nav.addEventListener('click', (e) => {
            if (e.target.closest('a')) setOpen(false);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                setOpen(false);
                toggle.focus();
            }
        });
    }

    function renderFooter() {
        const host = document.getElementById('site-footer');
        if (!host) return;

        host.innerHTML = `<div class="site-footer__inner">
            <div>
                <p class="site-footer__brand">Innov'Events</p>
                <p>Agence événementielle haut de gamme.</p>
            </div>
            <nav aria-label="Liens du pied de page">
                <ul>
                    <li><a href="/">Accueil</a></li>
                    <li><a href="/pages/events.html">Événements</a></li>
                    <li><a href="${QUOTE_URL}">Demande de devis</a></li>
                    <li><a href="/pages/legal.html">Mentions légales</a></li>
                    <li><a href="/pages/cgu-cgv.html">CGU / CGV</a></li>
                </ul>
            </nav>
            <p>© ${new Date().getFullYear()} Innov'Events</p>
        </div>`;
    }

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-logout]')) {
            e.preventDefault();
            logout();
        }
    });

    renderHeader(getSession());
    onReady(renderFooter);
})();

function renderForbidden(session) {
    const main = document.getElementById('contenu') || document.body;
    const home = session ? dashboardFor(session.role) : null;
    const role = session ? ROLE_LABELS[session.role] || session.role : '';

    document.title = "Accès refusé - Innov'Events";
    main.hidden = false;

    main.innerHTML = `<div class="container container--narrow">
        <div class="card state-card" role="alert">
            <p class="eyebrow">Erreur 403</p>
            <h1>Accès refusé</h1>
            <p class="muted">Cette page n'est pas accessible avec votre profil${role ? ` (${escapeHtml(role)})` : ''}.</p>
            <div class="actions">
                ${home ? `<a class="btn" href="${home}">Aller à mon tableau de bord</a>` : ''}
                <a class="btn btn-outline" href="/">Retour à l'accueil</a>
                <button type="button" class="btn btn-ghost" data-logout>Déconnexion</button>
            </div>
        </div>
    </div>`;
}

// Protège une page réservée à certains rôles. Renvoie la session, ou null
// (redirection vers la connexion / page « Accès refusé » déjà déclenchée).
// Le contenu de la page (<main hidden>) n'est affiché qu'une fois l'accès validé.
// Le serveur reste l'autorité : chaque appel API re-vérifie le jeton et le rôle.
function guardPage(roles) {
    if (!token()) {
        redirectToLogin('auth');
        return null;
    }

    const session = getSession();

    if (!session) {
        clearSession();
        redirectToLogin('expired');
        return null;
    }

    if (roles && !roles.includes(session.role)) {
        renderForbidden(session);
        return null;
    }

    const main = document.getElementById('contenu');
    if (main) main.hidden = false;

    window.addEventListener('storage', (e) => {
        if (e.key === 'token' && !e.newValue) redirectToLogin('logout');
    });

    return session;
}
