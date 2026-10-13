import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api';
import {
    dateToIso,
    EVENT_TYPES,
    formatDate,
    formatMoney,
    frToIso,
    isoToFr,
    isTime,
    QUOTE_STATUS
} from '../format';
import { colors, fonts, radius } from '../theme';
import {
    A,
    Alert,
    Btn,
    DataCell,
    DataRow,
    DataTable,
    DateField,
    Details,
    Dialog,
    DialogActions,
    DialogBody,
    DialogTitle,
    EmptyState,
    Hint,
    Input,
    Muted,
    Select,
    StatusBadge,
    TimeField,
    toast,
    Totals
} from '../ui';
import { checkValue, useForm } from '../useForm';
import { LoadError, PdfButton, Section } from '../shared';

/* ---------- Clients ---------- */

export function ClientsSection({ clients, quotes, error, onRetry, onNewQuote, sectionRef }) {
    const countFor = (id) => (quotes || []).filter((q) => q.client_id === id).length;

    return (
        <Section
            title="Clients"
            text="Fiches clients créées par conversion d'un prospect. Créez un devis pour un client en un clic."
            sectionRef={sectionRef}
        >
            {error ? <LoadError message={error} onRetry={onRetry} /> : null}

            {clients !== null && !clients.length ? (
                <EmptyState
                    title="Aucun client pour le moment"
                    text="Convertissez un prospect pour créer une première fiche client."
                />
            ) : null}

            {clients && clients.length ? (
                <DataTable>
                    {clients.map((c, index) => (
                        <DataRow key={c.id} last={index === clients.length - 1}>
                            <DataCell label="Entreprise" strong>
                                {c.company_name || '—'}
                            </DataCell>
                            <DataCell label="Contact">{`${c.firstname} ${c.lastname}`}</DataCell>
                            <DataCell label="E-mail">
                                <A href={`mailto:${c.email}`} style={s.right}>
                                    {c.email}
                                </A>
                            </DataCell>
                            <DataCell label="Téléphone">{c.phone || ''}</DataCell>
                            <DataCell label="Devis">{String(countFor(c.id))}</DataCell>
                            <DataCell label="Action">
                                <Btn small label="Créer un devis" onPress={() => onNewQuote(c)} />
                            </DataCell>
                        </DataRow>
                    ))}
                </DataTable>
            ) : null}
        </Section>
    );
}

/* ---------- Devis ---------- */

export function QuotesSection({ quotes, error, onRetry, onSend, flashId, sectionRef }) {
    return (
        <Section
            title="Devis"
            text="Téléchargez le PDF, puis envoyez le devis : le client le retrouve dans son espace « Mes devis » et en est informé dans sa messagerie. Si un client demande une modification, créez un nouveau devis pour le même événement."
            sectionRef={sectionRef}
        >
            {error ? <LoadError message={error} onRetry={onRetry} /> : null}

            {quotes !== null && !quotes.length ? (
                <EmptyState
                    title="Aucun devis pour le moment"
                    text="Créez un devis depuis la liste des clients ci-dessus."
                />
            ) : null}

            {quotes && quotes.length ? (
                <DataTable>
                    {quotes.map((q, index) => {
                        const lines = q.items || [];

                        return (
                            <DataRow
                                key={q.id}
                                last={index === quotes.length - 1}
                                flash={flashId === q.id ? 'new' : undefined}
                            >
                                <DataCell label="N°" strong>
                                    {String(q.id)}
                                </DataCell>
                                <DataCell label="Client">
                                    <View style={s.cellBlock}>
                                        <Text style={[s.cellText, s.strong]}>{q.company_name}</Text>
                                        <Muted style={s.cellSub}>
                                            {q.firstname} {q.lastname}
                                        </Muted>
                                    </View>
                                </DataCell>
                                <DataCell label="Événement">
                                    <View style={s.cellBlock}>
                                        <Text style={s.cellText}>{q.event_name}</Text>
                                        <Muted style={s.cellSub}>{formatDate(q.event_start)}</Muted>
                                        <Details summary={`${lines.length} ligne${lines.length > 1 ? 's' : ''}`}>
                                            {lines.map((l, i) => (
                                                <Text key={i} style={s.line}>
                                                    • {l.label} : {formatMoney(l.amount_ht)} HT
                                                </Text>
                                            ))}
                                        </Details>
                                    </View>
                                </DataCell>
                                <DataCell label="Total TTC" strong>
                                    {formatMoney(q.total_ttc)}
                                </DataCell>
                                <DataCell label="Statut">
                                    <StatusBadge map={QUOTE_STATUS} value={q.status} />
                                </DataCell>
                                <DataCell label="Actions">
                                    <View style={s.rowActions}>
                                        <PdfButton small id={q.id} label="Voir le PDF" />
                                        {q.status === 'BROUILLON' ? (
                                            <Btn small label="Envoyer au client" onPress={() => onSend(q)} />
                                        ) : null}
                                    </View>
                                </DataCell>
                            </DataRow>
                        );
                    })}
                </DataTable>
            ) : null}
        </Section>
    );
}

/* ---------- Envoi d'un devis ---------- */

export function SendDialog({ quote, onClose, onSent }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [fatal, setFatal] = useState(false);

    async function run() {
        setBusy(true);
        setError('');

        try {
            await api(`/quotes/${encodeURIComponent(quote.id)}/send`, { method: 'POST' });

            onClose();
            toast(
                'success',
                `Devis n° ${quote.id} envoyé à ${quote.company_name} : il le retrouve dans « Mes devis » et en est informé dans sa messagerie.`
            );

            await onSent(quote.id);
        } catch (err) {
            if (err.redirected) return;

            const client = err.status >= 400 && err.status < 500;

            setBusy(false);
            setError(err.message);
            setFatal(client);

            if (client) onSent(null);
        }
    }

    return (
        <Dialog visible onClose={onClose} dismissable={!busy}>
            <DialogBody>
                <DialogTitle>Envoyer ce devis au client ?</DialogTitle>
                <Text style={s.dialogText}>
                    {`Le devis n° ${quote.id} « ${quote.event_name} » (${formatMoney(quote.total_ttc)} TTC) sera envoyé à ${quote.company_name} (${quote.client_email}).`}
                </Text>
                <Hint>
                    Le client en est informé dans sa messagerie et retrouve le devis dans « Mes devis ». L'e-mail est simulé :
                    aucun e-mail réel n'est envoyé.
                </Hint>
                {error ? <Alert type="error" message={error} /> : null}
            </DialogBody>

            <DialogActions>
                <Btn full variant="outline" label={fatal ? 'Fermer' : 'Annuler'} disabled={busy} onPress={onClose} />
                {!fatal ? (
                    <Btn
                        full
                        label={error ? 'Réessayer' : 'Envoyer le devis'}
                        busy={busy}
                        busyLabel="Envoi en cours…"
                        onPress={run}
                    />
                ) : null}
            </DialogActions>
        </Dialog>
    );
}

/* ---------- Création d'un devis ---------- */

const NEW_EVENT_RULES = {
    name: { required: true },
    date: {
        required: true,
        custom: (value) => (frToIso(value) ? '' : 'Saisissez une date valide (JJ/MM/AAAA).')
    },
    start: { required: true, custom: (value) => (isTime(value) ? '' : 'Saisissez une heure valide (HH:MM).') },
    end: { required: true, custom: (value) => (isTime(value) ? '' : 'Saisissez une heure valide (HH:MM).') },
    location: { required: true }
};

const LINE_RULES = {
    label: { required: true },
    amount: { required: true, number: true, min: 0, max: 10000000, decimals: 2 }
};

let lineSeq = 0;
const newLine = () => ({ id: ++lineSeq, label: '', amount: '' });

function prospectFor(client, prospects) {
    const email = String(client.email || '').toLowerCase();

    return (
        (prospects || [])
            .filter((p) => String(p.email || '').toLowerCase() === email)
            .sort((a, b) => b.id - a.id)[0] || null
    );
}

function computeTotals(lines) {
    const cents = lines.reduce((sum, line) => {
        const value = Number(String(line.amount).replace(',', '.'));
        return sum + (Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0);
    }, 0);

    const tva = Math.round(cents * 0.2);

    return { ht: cents / 100, tva: tva / 100, ttc: (cents + tva) / 100 };
}

export function QuoteDialog({ client, events, prospects, onClose, onCreated }) {
    const [prospect] = useState(() => prospectFor(client, prospects));
    const [existing] = useState(() => (events || []).filter((e) => e.client_id === client.id));

    const baseType = prospect && prospect.event_type ? prospect.event_type : 'Séminaire';
    const types = EVENT_TYPES.includes(baseType) ? EVENT_TYPES : [...EVENT_TYPES, baseType];

    const [eventId, setEventId] = useState(existing.length ? String(existing[0].id) : 'new');
    const [lines, setLines] = useState(() => [newLine()]);
    const [lineErrors, setLineErrors] = useState({});
    const [createdEventId, setCreatedEventId] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const isNew = eventId === 'new';

    const form = useForm(
        {
            name: `${baseType} - ${client.company_name || client.lastname}`.slice(0, 180),
            date: prospect ? isoToFr(dateToIso(prospect.desired_date)) : '',
            type: baseType,
            start: '09:00',
            end: '18:00',
            location: prospect ? prospect.location || '' : client.address || ''
        },
        isNew ? NEW_EVENT_RULES : {}
    );

    const totals = computeTotals(lines);

    const eventOptions = [
        { value: 'new', label: 'Nouvel événement' },
        ...existing.map((e) => ({ value: String(e.id), label: `${e.name} — ${formatDate(e.start_at)}` }))
    ];

    function setLine(id, field, value) {
        setLines((current) => current.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
        setLineErrors((current) => (current[id] && current[id][field] ? { ...current, [id]: { ...current[id], [field]: '' } } : current));
    }

    function validateLines() {
        const found = {};
        let ok = true;

        lines.forEach((line) => {
            const messages = {
                label: checkValue(line.label, LINE_RULES.label),
                amount: checkValue(line.amount, LINE_RULES.amount)
            };

            if (messages.label || messages.amount) {
                found[line.id] = messages;
                ok = false;
            }
        });

        setLineErrors(found);
        return ok;
    }

    async function submit() {
        if (busy) return;

        setError('');

        const eventOk = form.validate();
        const linesOk = validateLines();

        if (!eventOk || !linesOk) {
            setError('Vérifiez les champs signalés en rouge.');
            return;
        }

        const v = form.values;

        if (isNew && v.end <= v.start) {
            setError("L'heure de fin doit être postérieure à l'heure de début.");
            return;
        }

        const items = lines.map((line) => ({
            label: line.label.trim(),
            amount_ht: Number(String(line.amount).replace(',', '.'))
        }));

        setBusy(true);

        try {
            let target = Number(eventId);

            if (isNew) {
                let created = createdEventId;

                if (!created) {
                    const day = frToIso(v.date);
                    const event = await api('/admin/events', {
                        method: 'POST',
                        body: {
                            client_id: client.id,
                            name: v.name.trim(),
                            start_at: `${day} ${v.start}:00`,
                            end_at: `${day} ${v.end}:00`,
                            location: v.location.trim(),
                            type: v.type,
                            theme: null,
                            status: 'BROUILLON',
                            is_public: false,
                            image_url: null
                        }
                    });

                    created = event.id;
                    setCreatedEventId(created);
                }

                target = created;
            }

            const quote = await api('/quotes', {
                method: 'POST',
                body: { event_id: target, client_id: client.id, items }
            });

            let pdfReady = true;

            try {
                await api(`/quotes/${encodeURIComponent(quote.id)}/pdf`, { method: 'POST', timeout: 30000 });
            } catch (pdfError) {
                if (pdfError.redirected) return;
                pdfReady = false;
            }

            onClose();
            toast(
                'success',
                `Devis n° ${quote.id} créé pour ${client.company_name || client.lastname} (${formatMoney(quote.total_ttc)} TTC)${pdfReady ? ', PDF prêt' : ''}. Envoyez-le au client depuis la liste des devis.`
            );

            await onCreated(quote.id);
        } catch (err) {
            if (err.redirected) return;

            setError(err.message);
            setBusy(false);
        }
    }

    return (
        <Dialog visible wide onClose={onClose} dismissable={!busy}>
            <DialogBody>
                <DialogTitle>Nouveau devis</DialogTitle>
                <Muted>
                    {`${client.company_name || ''} — ${client.firstname} ${client.lastname} (${client.email})`}
                </Muted>

                <View style={s.fieldset}>
                    <Text style={s.legend}>Événement</Text>

                    <Select
                        label="Événement concerné"
                        options={eventOptions}
                        value={eventId}
                        onChange={(value) => setEventId(value)}
                    />

                    {isNew ? (
                        <View style={s.fields}>
                            <Input label="Nom de l'événement" required maxLength={180} {...form.bind('name')} />
                            <DateField label="Date" required {...form.bind('date')} />
                            <Select
                                label="Type"
                                required
                                options={types.map((t) => ({ value: t, label: t }))}
                                {...form.pick('type')}
                            />
                            <TimeField label="Début" {...form.bind('start')} />
                            <TimeField label="Fin" {...form.bind('end')} />
                            <Input label="Lieu" required maxLength={255} {...form.bind('location')} />
                        </View>
                    ) : null}
                </View>

                <View style={s.fieldset}>
                    <Text style={s.legend}>Lignes du devis (montants HT)</Text>

                    {lines.map((line, index) => {
                        const errs = lineErrors[line.id] || {};

                        return (
                            <View key={line.id} style={s.quoteLine}>
                                <View style={s.lineFields}>
                                    <Input
                                        accessibilityLabel={`Désignation de la ligne ${index + 1}`}
                                        placeholder="Désignation (ex. Location de la salle)"
                                        maxLength={180}
                                        value={line.label}
                                        error={errs.label}
                                        onChangeText={(text) => setLine(line.id, 'label', text)}
                                    />
                                    <Input
                                        accessibilityLabel={`Montant HT de la ligne ${index + 1}, en euros`}
                                        placeholder="Montant HT (€)"
                                        keyboardType="decimal-pad"
                                        value={line.amount}
                                        error={errs.amount}
                                        onChangeText={(text) => setLine(line.id, 'amount', text)}
                                    />
                                </View>
                                {lines.length > 1 ? (
                                    <Btn
                                        variant="ghost"
                                        small
                                        label="✕"
                                        accessibilityLabel={`Supprimer la ligne ${index + 1}`}
                                        style={s.remove}
                                        onPress={() => setLines((current) => current.filter((l) => l.id !== line.id))}
                                    />
                                ) : null}
                            </View>
                        );
                    })}

                    <Btn small variant="outline" label="+ Ajouter une ligne" onPress={() => setLines((c) => [...c, newLine()])} />

                    <Totals ht={formatMoney(totals.ht)} tva={formatMoney(totals.tva)} ttc={formatMoney(totals.ttc)} />
                    <Hint>Calcul indicatif : le serveur recalcule les totaux (TVA 20 %).</Hint>
                </View>

                {error ? <Alert type="error" message={error} /> : null}
            </DialogBody>

            <DialogActions>
                <Btn full variant="outline" label="Annuler" disabled={busy} onPress={onClose} />
                <Btn full label="Créer le devis" busy={busy} busyLabel="Création en cours…" onPress={submit} />
            </DialogActions>
        </Dialog>
    );
}

const s = StyleSheet.create({
    right: { textAlign: 'right' },
    strong: { fontWeight: '700' },
    cellBlock: { alignItems: 'flex-end', width: '100%' },
    cellText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text, textAlign: 'right' },
    cellSub: { textAlign: 'right', marginBottom: 0, fontSize: 14.4, lineHeight: 21 },
    line: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted },
    rowActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
    dialogText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25.6, color: colors.text },
    fieldset: {
        gap: 14.4,
        paddingVertical: 16,
        paddingHorizontal: 17.6,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.md
    },
    legend: { fontFamily: fonts.display, fontSize: 16, fontWeight: '700', color: colors.text },
    fields: { gap: 14.4 },
    quoteLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 9.6 },
    lineFields: { flex: 1, gap: 9.6, minWidth: 0 },
    remove: { alignSelf: 'flex-start', minHeight: 46, paddingHorizontal: 10 }
});
