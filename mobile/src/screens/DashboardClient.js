import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api';
import { useApp } from '../context';
import { formatEventDates, formatMoney, QUOTE_STATUS } from '../format';
import { Container, Page } from '../layout';
import { colors, fonts, radius, TONES } from '../theme';
import {
    Alert,
    Btn,
    Card,
    Chip,
    Dialog,
    DialogActions,
    DialogBody,
    DialogTitle,
    EmptyState,
    H3,
    IconBadge,
    Input,
    Muted,
    StatusBadge,
    toast,
    Totals
} from '../ui';
import { DashHead, LoadError, MessagesSection, PdfButton, Section } from '../shared';

const CLIENT_QUOTE_STATUS = {
    ...QUOTE_STATUS,
    ETUDE_CLIENT: { label: 'À étudier', tone: 'info' }
};

const NOTES = {
    ACCEPTE: ['success', 'Vous avez accepté ce devis. L’agence prépare la suite de votre événement.'],
    REFUSE: ['danger', 'Vous avez refusé ce devis.'],
    MODIFICATION: [
        'warning',
        'Votre demande de modification a été transmise à l’agence. Si elle donne lieu à un nouveau devis, vous en serez informé dans votre messagerie.'
    ]
};

const MODES = {
    accept: {
        title: 'Accepter ce devis ?',
        describe: (q) =>
            `Vous acceptez le devis n° ${q.id} « ${q.event_name} » (${formatMoney(q.total_ttc)} TTC). L’agence en sera informée.`,
        confirm: 'Accepter le devis',
        comment: null
    },
    modify: {
        title: 'Demander une modification',
        describe: (q) =>
            `Indiquez à l’agence ce que vous souhaitez modifier dans le devis n° ${q.id} « ${q.event_name} ».`,
        confirm: 'Envoyer ma demande',
        comment: 'Modification souhaitée (obligatoire)'
    },
    refuse: {
        title: 'Refuser ce devis ?',
        describe: (q) => `Vous refusez le devis n° ${q.id} « ${q.event_name} ». Cette réponse est définitive.`,
        confirm: 'Refuser le devis',
        comment: 'Motif (facultatif)'
    }
};

const RESULT_TOASTS = {
    accept: 'Devis accepté : merci ! L’agence en est informée.',
    modify: 'Votre demande de modification a été transmise à l’agence.',
    refuse: 'Votre refus a bien été enregistré.'
};

function Note({ tone, children }) {
    const t = TONES[tone] || TONES.info;

    return (
        <View style={[s.note, { backgroundColor: t.bg, borderColor: t.line }]}>
            <Text style={[s.noteText, { color: t.color }]}>{children}</Text>
        </View>
    );
}

function QuoteCard({ quote: q, onRespond }) {
    const note = NOTES[q.status];
    const answerable = q.status === 'ETUDE_CLIENT';

    return (
        <Card style={s.quoteCard}>
            <View style={s.quoteHead}>
                <View style={s.quoteTitle}>
                    <H3 style={s.noMargin}>
                        Devis n° {q.id} : {q.event_name}
                    </H3>
                    <Muted style={s.quoteMeta}>
                        {formatEventDates(q.event_start, q.event_end)} · {q.event_location}
                    </Muted>
                </View>
                <StatusBadge map={CLIENT_QUOTE_STATUS} value={q.status} />
            </View>

            <View style={s.lines}>
                {(q.items || []).map((l, index) => (
                    <View key={index} style={s.line}>
                        <Text style={s.lineLabel}>{l.label}</Text>
                        <Text style={s.lineAmount}>{formatMoney(l.amount_ht)} HT</Text>
                    </View>
                ))}
            </View>

            <Totals ht={formatMoney(q.total_ht)} tva={formatMoney(q.tva)} ttc={formatMoney(q.total_ttc)} />

            {note ? <Note tone={note[0]}>{note[1]}</Note> : null}

            <View style={s.actions}>
                <PdfButton full id={q.id} label="Télécharger le PDF" />
                {answerable ? (
                    <>
                        <Btn full label="Accepter" onPress={() => onRespond('accept', q)} />
                        <Btn full variant="outline" label="Demander une modification" onPress={() => onRespond('modify', q)} />
                        <Btn full variant="dangerOutline" label="Refuser" onPress={() => onRespond('refuse', q)} />
                    </>
                ) : null}
            </View>
        </Card>
    );
}

export default function DashboardClient({ onForbidden }) {
    const { go } = useApp();
    const [quotes, setQuotes] = useState(null);
    const [messages, setMessages] = useState(null);
    const [errors, setErrors] = useState({});
    const [respond, setRespond] = useState(null);
    const scrollRef = useRef(null);
    const containerRef = useRef(null);
    const sectionRefs = useRef({});
    const alive = useRef(true);

    async function fetchInto(path, setter, key, label) {
        try {
            const data = await api(path);
            if (!alive.current) return;

            setter(key === 'messages' ? data : Array.isArray(data) ? data : []);
            setErrors((current) => ({ ...current, [key]: '' }));
        } catch (err) {
            if (err.redirected) return;

            if (err.status === 403) {
                onForbidden();
                return;
            }

            if (alive.current) {
                setErrors((current) => ({ ...current, [key]: `Impossible de charger ${label}. ${err.message}` }));
            }
        }
    }

    const loadMessages = () => fetchInto('/notifications', setMessages, 'messages', 'votre messagerie');
    const loadQuotes = () => fetchInto('/quotes/mine', setQuotes, 'quotes', 'vos devis');
    const loadAll = () => Promise.all([loadMessages(), loadQuotes()]);

    useEffect(() => {
        alive.current = true;
        loadAll();

        return () => {
            alive.current = false;
        };
        // chargement initial uniquement
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reg = (key) => (node) => {
        sectionRefs.current[key] = node;
    };

    // Position de la section mesurée au moment du clic : elle change quand les listes ci-dessus se remplissent.
    const jump = (key) => {
        const node = sectionRefs.current[key];

        if (!node || !containerRef.current || !scrollRef.current) return;

        node.measureLayout(
            containerRef.current,
            (x, y) => scrollRef.current.scrollTo({ y: Math.max(0, y - 8), animated: true }),
            () => {}
        );
    };

    /* ---------- Réponse à un devis ---------- */

    function openRespond(action, quote) {
        if (respond && respond.busy) return;
        if (!MODES[action] || quote.status !== 'ETUDE_CLIENT') return;

        setRespond({ action, quote, comment: '', commentError: '', error: '', busy: false, fatal: false });
    }

    function closeRespond() {
        setRespond((current) => (current && current.busy ? current : null));
    }

    async function submitRespond() {
        if (!respond || respond.busy) return;

        const { action, quote } = respond;
        const comment = respond.comment.trim();

        if (action === 'modify' && !comment) {
            setRespond({ ...respond, commentError: 'Précisez la modification souhaitée.' });
            return;
        }

        setRespond({ ...respond, busy: true, error: '' });

        try {
            await api(`/quotes/${encodeURIComponent(quote.id)}/respond`, {
                method: 'POST',
                body: { action, comment }
            });

            setRespond(null);
            toast('success', RESULT_TOASTS[action]);
            await loadAll();
        } catch (err) {
            if (err.redirected) return;

            const fatal = err.status >= 400 && err.status < 500;

            setRespond((current) => (current ? { ...current, busy: false, error: err.message, fatal } : current));
            if (fatal) loadAll();
        }
    }

    const mode = respond ? MODES[respond.action] : null;
    const unread = (messages && messages.unread) || 0;

    return (
        <Page scrollRef={scrollRef}>
            <Container innerRef={containerRef}>
                <DashHead eyebrow="Espace client" role="CLIENT" />

                <View style={s.pills}>
                    <Chip label="Messagerie" count={unread || undefined} onPress={() => jump('messages')} />
                    <Chip label="Mes devis" onPress={() => jump('quotes')} />
                    <Chip label="Autres actions" onPress={() => jump('actions')} />
                </View>

                <MessagesSection
                    title="Messagerie"
                    text="Les informations de l'agence sur vos demandes et vos devis."
                    emptyText="L’agence vous informera ici de l’avancement de votre demande et de vos devis."
                    data={messages}
                    error={errors.messages}
                    onRetry={loadAll}
                    reload={loadMessages}
                    sectionRef={reg('messages')}
                />

                <Section
                    title="Mes devis"
                    text="Consultez vos devis, téléchargez-les en PDF et répondez à l'agence."
                    sectionRef={reg('quotes')}
                >
                    {errors.quotes ? <LoadError message={errors.quotes} onRetry={loadAll} /> : null}

                    {quotes !== null && !quotes.length ? (
                        <EmptyState
                            title="Aucun devis pour le moment"
                            text="Dès que l’agence vous enverra un devis, il apparaîtra ici et vous en serez informé dans votre messagerie."
                        >
                            <Btn small variant="outline" label="Demander un devis" onPress={() => go('quote')} />
                        </EmptyState>
                    ) : null}

                    {quotes && quotes.length ? (
                        <View style={s.quoteList}>
                            {quotes.map((q) => (
                                <QuoteCard key={q.id} quote={q} onRespond={openRespond} />
                            ))}
                        </View>
                    ) : null}
                </Section>

                <Section title="Que souhaitez-vous faire d'autre ?" sectionRef={reg('actions')}>
                    <View style={s.features}>
                        <Card style={s.feature}>
                            <IconBadge name="calendar" />
                            <H3 style={s.noMargin}>Découvrir nos événements</H3>
                            <Muted>Parcourez les événements publics organisés par l'agence.</Muted>
                            <Btn small variant="outline" label="Voir les événements" onPress={() => go('events')} />
                        </Card>

                        <Card style={s.feature}>
                            <IconBadge name="edit" />
                            <H3 style={s.noMargin}>Un nouveau projet ?</H3>
                            <Muted>Décrivez votre besoin, l'agence vous recontacte dans les plus brefs délais.</Muted>
                            <Btn small label="Demander un devis" onPress={() => go('quote')} />
                        </Card>

                        <Card style={s.feature}>
                            <IconBadge name="mail" />
                            <H3 style={s.noMargin}>Une question ?</H3>
                            <Muted>Contactez directement l'équipe Innov'Events.</Muted>
                            <Btn small variant="outline" label="Nous contacter" onPress={() => go('contact')} />
                        </Card>
                    </View>
                </Section>
            </Container>

            <Dialog visible={Boolean(respond)} onClose={closeRespond}>
                {respond ? (
                    <>
                        <DialogBody>
                            <DialogTitle>{mode.title}</DialogTitle>
                            <Text style={s.dialogText}>{mode.describe(respond.quote)}</Text>

                            {mode.comment !== null ? (
                                <Input
                                    label={mode.comment}
                                    multiline
                                    maxLength={1000}
                                    value={respond.comment}
                                    error={respond.commentError}
                                    style={s.comment}
                                    onChangeText={(text) => setRespond({ ...respond, comment: text, commentError: '' })}
                                />
                            ) : null}

                            {respond.error ? <Alert type="error" message={respond.error} /> : null}
                        </DialogBody>

                        <DialogActions>
                            <Btn
                                full
                                variant="outline"
                                label={respond.fatal ? 'Fermer' : 'Annuler'}
                                disabled={respond.busy}
                                onPress={closeRespond}
                            />
                            {!respond.fatal ? (
                                <Btn
                                    full
                                    variant={respond.action === 'refuse' ? 'danger' : 'primary'}
                                    label={mode.confirm}
                                    busy={respond.busy}
                                    busyLabel="Envoi en cours…"
                                    onPress={submitRespond}
                                />
                            ) : null}
                        </DialogActions>
                    </>
                ) : null}
            </Dialog>
        </Page>
    );
}

const s = StyleSheet.create({
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    noMargin: { marginBottom: 0 },
    features: { gap: 20 },
    feature: { gap: 8 },
    quoteList: { gap: 17.6 },
    quoteCard: { gap: 16 },
    quoteHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 9.6 },
    quoteTitle: { flexShrink: 1, minWidth: 200 },
    quoteMeta: { marginTop: 1.6, marginBottom: 0 },
    lines: { borderTopWidth: 1, borderTopColor: colors.line },
    line: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        paddingVertical: 8.8,
        borderBottomWidth: 1,
        borderBottomColor: colors.line
    },
    lineLabel: { flex: 1, fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text },
    lineAmount: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, fontWeight: '700', color: colors.text },
    note: { paddingVertical: 11.2, paddingHorizontal: 15.2, borderWidth: 1, borderRadius: radius.sm },
    noteText: { fontFamily: fonts.body, fontSize: 14.9, lineHeight: 23 },
    actions: { gap: 8 },
    dialogText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25.6, color: colors.text },
    comment: { minHeight: 110 }
});
