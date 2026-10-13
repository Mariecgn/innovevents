import { useRef, useState } from 'react';

const REQUIRED = 'Ce champ est obligatoire.';

// Même règle que <input type="email"> dans les navigateurs.
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Renvoie le message d'erreur (en français) ou '' si la valeur est valide.
// Ordre des contrôles identique au navigateur : champ vide, format, motif, bornes.
export function checkValue(raw, rule = {}) {
    const value = typeof raw === 'string' && !rule.keepSpaces ? raw.trim() : raw;
    const empty = value === '' || value === undefined || value === null;

    if (empty) return rule.required ? rule.requiredMsg || REQUIRED : '';

    if (rule.email && !EMAIL.test(value)) {
        return 'Saisissez une adresse e-mail valide (exemple : nom@entreprise.fr).';
    }

    if (rule.pattern && !rule.pattern.test(value)) {
        return rule.patternMsg || 'Le format saisi est invalide.';
    }

    if (rule.number) {
        const n = Number(String(value).replace(',', '.'));

        if (!Number.isFinite(n)) return 'Saisissez un nombre valide.';
        if (rule.integer && !Number.isInteger(n)) return 'Indiquez un nombre entier.';
        if (rule.decimals !== undefined && Math.round(n * 10 ** rule.decimals) / 10 ** rule.decimals !== n) {
            return `Indiquez au plus ${rule.decimals} décimales.`;
        }
        if (rule.min !== undefined && n < rule.min) {
            return rule.minMsg || `La valeur doit être supérieure ou égale à ${rule.min}.`;
        }
        if (rule.max !== undefined && n > rule.max) return `La valeur doit être inférieure ou égale à ${rule.max}.`;
    }

    if (rule.custom) return rule.custom(value) || '';

    return '';
}

// Petit gestionnaire de formulaire : valeurs, erreurs par champ, focus sur le premier champ invalide.
export function useForm(initial, rules) {
    const [values, setValues] = useState(initial);
    const [errors, setErrors] = useState({});
    const refs = useRef({});

    function set(name, value) {
        setValues((current) => ({ ...current, [name]: value }));

        // Comme liveValidation() du site : l'erreur disparaît dès que la saisie devient valide.
        setErrors((current) => (current[name] && !checkValue(value, rules[name]) ? { ...current, [name]: '' } : current));
    }

    function bind(name) {
        return {
            value: values[name],
            error: errors[name],
            onChangeText: (text) => set(name, text),
            inputRef: (el) => {
                refs.current[name] = el;
            }
        };
    }

    function pick(name) {
        return { value: values[name], error: errors[name], onChange: (value) => set(name, value) };
    }

    function validate(extra = {}) {
        const found = {};
        let first = null;

        Object.keys(rules).forEach((name) => {
            const message = extra[name] || checkValue(values[name], rules[name]);

            if (message) {
                found[name] = message;
                if (!first) first = name;
            }
        });

        setErrors(found);

        if (first && refs.current[first] && refs.current[first].focus) refs.current[first].focus();

        return !first;
    }

    function reset(next = initial) {
        setValues(next);
        setErrors({});
    }

    return { values, errors, set, bind, pick, validate, reset, setErrors };
}
