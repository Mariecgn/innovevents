import { SITE_URL } from './config';

/* ---------- Dates (mêmes rendus que frontend/js/ui.js, sans dépendre d'Intl) ---------- */

const MONTHS = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];
const MONTHS_SHORT = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const pad = (n) => String(n).padStart(2, '0');

export function toDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value) {
    const d = toDate(value);
    return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '—';
}

export function formatTime(value) {
    const d = toDate(value);
    return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
}

export function formatDateTime(value) {
    const d = toDate(value);
    return d ? `${formatDate(d)} à ${formatTime(d)}` : '—';
}

export function formatEventDates(start, end) {
    const s = toDate(start);
    const e = toDate(end);
    if (!s) return '';
    if (!e) return `${formatDate(s)} · ${formatTime(s)}`;
    if (s.toDateString() === e.toDateString()) {
        return `${formatDate(s)} · ${formatTime(s)} – ${formatTime(e)}`;
    }
    return `${formatDate(s)} ${formatTime(s)} → ${formatDate(e)} ${formatTime(e)}`;
}

export function monthShort(value) {
    const d = toDate(value);
    return d ? MONTHS_SHORT[d.getMonth()] : '';
}

export function todayLong() {
    const d = new Date();
    const text = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------- Saisie des dates et des heures (pas de sélecteur natif : JJ/MM/AAAA et HH:MM) ---------- */

export function maskDate(text) {
    const digits = String(text || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function maskTime(text) {
    const digits = String(text || '').replace(/\D/g, '').slice(0, 4);
    return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// "10/12/2026" -> "2026-12-10" ; null si la date n'existe pas.
export function frToIso(text) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(text || '').trim());
    if (!m) return null;

    const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const d = new Date(year, month - 1, day);

    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
}

export function isoToFr(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function dateToIso(value) {
    const d = toDate(value);
    return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';
}

export function todayIso() {
    return dateToIso(new Date());
}

export function isTime(text) {
    const m = /^(\d{2}):(\d{2})$/.exec(String(text || '').trim());
    return Boolean(m) && Number(m[1]) < 24 && Number(m[2]) < 60;
}

/* ---------- Statuts (valeurs de l'API -> libellés) ---------- */

// ECHOUE (valeur du schéma SQL) correspond au refus d'un prospect par l'agence.
export const PROSPECT_STATUS = {
    A_CONTACTER: { label: 'À contacter', tone: 'warning' },
    QUALIFIE: { label: 'Qualifié', tone: 'info' },
    ECHOUE: { label: 'Refusé', tone: 'danger' },
    CONVERTI: { label: 'Converti', tone: 'success' }
};

export const EVENT_STATUS = {
    BROUILLON: { label: 'Brouillon', tone: 'neutral' },
    ACCEPTE: { label: 'Accepté', tone: 'success' },
    EN_COURS: { label: 'En cours', tone: 'info' },
    TERMINE: { label: 'Terminé', tone: 'neutral' },
    ANNULE: { label: 'Annulé', tone: 'danger' }
};

export const QUOTE_STATUS = {
    BROUILLON: { label: 'Brouillon', tone: 'neutral' },
    ETUDE_CLIENT: { label: 'Envoyé · en étude', tone: 'info' },
    ACCEPTE: { label: 'Accepté', tone: 'success' },
    MODIFICATION: { label: 'Modification demandée', tone: 'warning' },
    REFUSE: { label: 'Refusé', tone: 'danger' }
};

export const EVENT_TYPES = ['Séminaire', 'Conférence', "Soirée d'entreprise", 'Autre'];

/* ---------- Montants ---------- */

// Rendu de Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }) : « 5 760,00 € ».
export function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';

    const [int, dec] = Math.abs(n).toFixed(2).split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');

    return `${n < 0 ? '-' : ''}${grouped},${dec}\u00a0€`;
}

/* ---------- Images d'événements ---------- */

// null = image par défaut (illustration d'accueil), comme FALLBACK_EVENT_IMAGE sur le site.
export function eventImageUrl(url) {
    const value = String(url || '').trim();

    if (!value || /(^|\/)event\.jpg$/i.test(value)) return null;
    if (/^\/(?!\/)/.test(value)) return SITE_URL + value;
    if (/^https?:\/\//i.test(value)) return value;

    return null;
}
