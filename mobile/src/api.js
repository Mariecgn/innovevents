import { Linking } from 'react-native';

import { API_URL, SITE_URL } from './config';

export const ROLE_LABELS = {
    ADMIN: 'Administrateur',
    EMPLOYEE: 'Employé',
    CLIENT: 'Client'
};

export class ApiError extends Error {
    constructor(message, status = 0, code = '') {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.redirected = false;
    }
}

// Le jeton reste en mémoire : il disparaît à la fermeture de l'application.
let jwt = null;
let onUnauthorized = null;

export function setToken(value) {
    jwt = value || null;
}

export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}

function defaultMessage(status) {
    if (status === 401) return 'Votre session a expiré. Veuillez vous reconnecter.';
    if (status === 403) return 'Accès refusé.';
    if (status === 404) return 'Ressource introuvable.';
    if (status >= 500) return 'Erreur du serveur. Réessayez dans quelques instants.';
    return 'Une erreur est survenue. Réessayez.';
}

// Même contrat que frontend/js/api.js :
// auth: false -> n'envoie pas le jeton (connexion, inscription, pages publiques)
// timeout     -> délai maximal d'attente en millisecondes
export async function api(path, options = {}) {
    const { auth = true, timeout = 15000, ...init } = options;

    const headers = { ...(init.headers || {}) };
    let body = init.body;

    if (body !== undefined && body !== null && typeof body === 'object') {
        body = JSON.stringify(body);
    }

    if (body !== undefined && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const token = auth ? jwt : null;
    if (token) headers.Authorization = 'Bearer ' + token;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let res;
    let data;

    try {
        res = await fetch(API_URL + path, { ...init, body, headers, signal: controller.signal });
        data = await res.json().catch(() => ({}));
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

    if (res.status === 401 && token) {
        jwt = null;
        error.redirected = true;
        if (onUnauthorized) onUnauthorized();
    }

    throw error;
}

// Le PDF est une route protégée : le serveur délivre d'abord un lien à durée de vie courte,
// que le téléphone ouvre dans son navigateur (il ne peut pas y joindre l'en-tête Authorization).
export async function openQuotePdf(id) {
    const link = await api(`/quotes/${encodeURIComponent(id)}/pdf-link`, { method: 'POST', timeout: 30000 });

    if (!link || !link.path) {
        throw new ApiError('Réponse inattendue du serveur. Veuillez réessayer.', 500);
    }

    try {
        await Linking.openURL(SITE_URL + link.path);
    } catch (e) {
        throw new ApiError("Impossible d'ouvrir le PDF sur cet appareil.", 0);
    }
}
