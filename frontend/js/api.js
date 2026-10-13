const API = '/api';
const LOGIN_PAGE = '/pages/login.html';

const DASHBOARDS = {
    ADMIN: '/pages/dashboard-admin.html',
    EMPLOYEE: '/pages/dashboard-employee.html',
    CLIENT: '/pages/dashboard-client.html'
};

const ROLE_LABELS = {
    ADMIN: 'Administrateur',
    EMPLOYEE: 'Employé',
    CLIENT: 'Client'
};

class ApiError extends Error {
    constructor(message, status = 0, code = '') {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.redirected = false;
    }
}

function token() {
    try {
        return localStorage.getItem('token');
    } catch (e) {
        return null;
    }
}

function parseJwt(jwt) {
    try {
        const part = String(jwt).split('.')[1];
        const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
        return null;
    }
}

// Le rôle est lu dans le jeton signé par le serveur, jamais dans l'objet "user"
// modifiable du navigateur. Le serveur re-vérifie de toute façon chaque appel.
function getSession() {
    const jwt = token();
    if (!jwt) return null;

    const claims = parseJwt(jwt);
    if (!claims || !claims.role) return null;
    if (claims.exp && claims.exp * 1000 <= Date.now()) return null;

    let user = {};
    try {
        user = JSON.parse(localStorage.getItem('user')) || {};
    } catch (e) {
        user = {};
    }

    const firstname = typeof user.firstname === 'string' ? user.firstname.trim() : '';

    // Ancienne session « jeton seul » (sans profil) : on la considère invalide, reconnexion demandée.
    if (!firstname) return null;

    return {
        id: claims.id,
        role: claims.role,
        firstname,
        expiresAt: claims.exp ? claims.exp * 1000 : null
    };
}

function saveSession(data) {
    if (!data || !data.token || !data.user) return false;
    if (!parseJwt(data.token)) return false;

    try {
        localStorage.setItem('token', data.token);
        localStorage.setItem(
            'user',
            JSON.stringify({
                id: data.user.id,
                firstname: data.user.firstname,
                role: data.user.role,
                must_change_password: Boolean(data.user.must_change_password)
            })
        );
        return true;
    } catch (e) {
        return false;
    }
}

function clearSession() {
    try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    } catch (e) {
        /* stockage indisponible : rien à nettoyer */
    }
}

function dashboardFor(role) {
    return DASHBOARDS[role] || null;
}

function redirectToLogin(reason) {
    if (location.pathname === LOGIN_PAGE) return false;
    location.replace(LOGIN_PAGE + (reason ? '?reason=' + encodeURIComponent(reason) : ''));
    return true;
}

function logout() {
    clearSession();
    location.replace(LOGIN_PAGE + '?reason=logout');
}

function defaultMessage(status) {
    if (status === 401) return 'Votre session a expiré. Veuillez vous reconnecter.';
    if (status === 403) return 'Accès refusé.';
    if (status === 404) return 'Ressource introuvable.';
    if (status >= 500) return 'Erreur du serveur. Réessayez dans quelques instants.';
    return 'Une erreur est survenue. Réessayez.';
}

// auth: false  -> n'envoie pas le jeton (connexion, inscription, pages publiques)
// timeout      -> délai maximal d'attente en millisecondes
// blob: true   -> renvoie un Blob au lieu de JSON (téléchargement d'un PDF)
async function api(path, options = {}) {
    const { auth = true, timeout = 15000, blob = false, ...init } = options;

    const headers = { ...(init.headers || {}) };
    let body = init.body;

    if (body !== undefined && body !== null && typeof body === 'object' && !(body instanceof FormData)) {
        body = JSON.stringify(body);
    }

    if (body !== undefined && !(body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const jwt = auth ? token() : null;
    if (jwt) headers.Authorization = 'Bearer ' + jwt;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let res;
    let data;

    try {
        res = await fetch(API + path, { ...init, body, headers, signal: controller.signal });
        data = res.ok && blob ? await res.blob() : await res.json().catch(() => ({}));
    } catch (e) {
        if (e && e.name === 'AbortError') {
            throw new ApiError('Le serveur met trop de temps à répondre. Réessayez dans un instant.', 0, 'TIMEOUT');
        }
        throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.', 0, 'NETWORK');
    } finally {
        clearTimeout(timer);
    }

    if (res.ok) return data;

    const error = new ApiError((data && data.message) || defaultMessage(res.status), res.status);

    if (res.status === 401 && jwt) {
        clearSession();
        error.redirected = redirectToLogin('expired');
    }

    throw error;
}
