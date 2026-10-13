import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api';
import { EVENT_STATUS, formatEventDates, monthShort, toDate } from '../format';
import { Container, Page } from '../layout';
import { colors, fonts } from '../theme';
import { Badge, Btn, Card, Chip, EmptyState, H3, Skeleton, StatCard, StatusBadge } from '../ui';
import { DashHead, LoadError, MessagesSection, Section } from '../shared';
import { ProspectsSection, TODO_FILTER } from './AdminProspects';
import { ClientsSection, QuoteDialog, QuotesSection, SendDialog } from './AdminQuotes';

const FETCHES = [
    ['dashboard', '/dashboard/admin', 'les statistiques'],
    ['prospects', '/prospects', 'les prospects'],
    ['clients', '/clients', 'les clients'],
    ['quotes', '/quotes', 'les devis'],
    ['events', '/admin/events', null],
    ['messages', '/notifications', 'les messages']
];

function EventRow({ ev }) {
    const start = toDate(ev.start_at);
    const end = toDate(ev.end_at);
    const past = end && end < new Date();

    return (
        <Card style={s.eventRow}>
            <View style={s.eventDate}>
                <Text style={s.eventDay}>{start ? start.getDate() : '–'}</Text>
                <Text style={s.eventMonth}>{start ? monthShort(ev.start_at) : ''}</Text>
            </View>

            <View style={s.eventMain}>
                <H3 style={s.eventName}>{ev.name}</H3>
                <Text style={s.eventMeta}>
                    {formatEventDates(ev.start_at, ev.end_at)} · {ev.location}
                </Text>
            </View>

            <View style={s.badges}>
                {past ? <Badge tone="neutral">Passé</Badge> : null}
                <StatusBadge map={EVENT_STATUS} value={ev.status} />
            </View>
        </Card>
    );
}

function StatsSkeleton() {
    return (
        <View style={s.stats}>
            {[0, 1, 2, 3].map((i) => (
                <View key={i} style={s.skeleton}>
                    <Skeleton style={s.skeletonIcon} />
                    <View style={s.skeletonLines}>
                        <Skeleton style={s.skeletonValue} />
                        <Skeleton />
                    </View>
                </View>
            ))}
        </View>
    );
}

export default function DashboardAdmin({ onForbidden }) {
    const [data, setData] = useState({
        dashboard: null,
        prospects: null,
        clients: null,
        quotes: null,
        events: null,
        messages: null
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [flash, setFlash] = useState(null);
    const [quoteFor, setQuoteFor] = useState(null);
    const [sendQuote, setSendQuote] = useState(null);
    const scrollRef = useRef(null);
    const containerRef = useRef(null);
    const sectionRefs = useRef({});
    const alive = useRef(true);

    async function fetchInto(key, path, label) {
        try {
            const value = await api(path);
            if (!alive.current) return;

            const next = key === 'messages' || key === 'dashboard' ? value : Array.isArray(value) ? value : [];

            setData((current) => ({ ...current, [key]: next }));
            setErrors((current) => ({ ...current, [key]: '' }));
        } catch (err) {
            if (err.redirected) return;

            if (err.status === 403) {
                if (key === 'dashboard') onForbidden();
                return;
            }

            if (label && alive.current) {
                setErrors((current) => ({ ...current, [key]: `Impossible de charger ${label}. ${err.message}` }));
            }
        }
    }

    async function loadAll() {
        setBusy(true);
        await Promise.all(FETCHES.map(([key, path, label]) => fetchInto(key, path, label)));

        if (alive.current) {
            setBusy(false);
            setLoaded(true);
        }
    }

    const reloadMessages = () => fetchInto('messages', '/notifications', 'les messages');

    useEffect(() => {
        alive.current = true;
        loadAll();

        return () => {
            alive.current = false;
        };
        // chargement initial uniquement
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!flash) return undefined;

        const timer = setTimeout(() => setFlash(null), 3200);
        return () => clearTimeout(timer);
    }, [flash]);

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

    // Après l'envoi ou la création d'un devis : on recharge, puis on met la ligne en évidence.
    async function reloadQuotes(id) {
        if (id !== null && id !== undefined) setFlash({ quote: id });
        await loadAll();
        if (id !== null && id !== undefined) jump('quotes');
    }

    const { dashboard, prospects } = data;
    const stats = dashboard && dashboard.stats;
    const pick = (v) => (v === undefined || v === null ? '—' : v);
    const todo = prospects ? prospects.filter(TODO_FILTER).length : null;
    const unread = (data.messages && data.messages.unread) || 0;
    const events = dashboard && Array.isArray(dashboard.events) ? dashboard.events : null;

    return (
        <Page scrollRef={scrollRef}>
            <Container innerRef={containerRef}>
                <DashHead
                    eyebrow="Espace administrateur"
                    role="ADMIN"
                    showRole={Boolean(dashboard)}
                    intro=" · Voici l’activité de votre agence."
                />

                <View style={s.pills}>
                    <Chip label="Prospects" onPress={() => jump('prospects')} />
                    <Chip label="Clients" onPress={() => jump('clients')} />
                    <Chip label="Devis" onPress={() => jump('quotes')} />
                    <Chip label="Messages" count={unread || undefined} onPress={() => jump('messages')} />
                </View>

                <Section
                    title="Vue d'ensemble"
                    style={s.first}
                    right={
                        <Btn small variant="outline" label="Actualiser" busy={busy} busyLabel="Actualisation…" onPress={loadAll} />
                    }
                >
                    {errors.dashboard ? <LoadError message={errors.dashboard} onRetry={loadAll} /> : null}

                    {!loaded ? (
                        <StatsSkeleton />
                    ) : (
                        <View style={s.stats}>
                            <StatCard icon="users" value={pick(stats && stats.clients_actifs)} label="Clients actifs" />
                            <StatCard icon="edit" value={pick(stats && stats.events_brouillon)} label="Événements brouillon" />
                            <StatCard
                                icon="calendar"
                                value={pick(events ? events.length : null)}
                                label="Prochains événements"
                                hint="Voir l’aperçu ci-dessous"
                            />
                            <StatCard
                                icon="inbox"
                                value={pick(todo)}
                                label="Prospects à traiter"
                                hint="À contacter ou qualifiés"
                            />
                        </View>
                    )}
                </Section>

                <Section title="Prochains événements">
                    {events && events.length ? (
                        <View style={s.eventList}>
                            {events.map((ev) => (
                                <EventRow key={ev.id} ev={ev} />
                            ))}
                        </View>
                    ) : null}
                    {events && !events.length ? (
                        <EmptyState title="Aucun événement pour le moment" text="Les événements créés apparaîtront ici." />
                    ) : null}
                </Section>

                <ProspectsSection
                    prospects={prospects}
                    error={errors.prospects}
                    onRetry={loadAll}
                    flash={flash && flash.kind ? flash : null}
                    onFlash={setFlash}
                    refresh={loadAll}
                    sectionRef={reg('prospects')}
                />

                <ClientsSection
                    clients={data.clients}
                    quotes={data.quotes}
                    error={errors.clients}
                    onRetry={loadAll}
                    onNewQuote={(client) => setQuoteFor(client)}
                    sectionRef={reg('clients')}
                />

                <QuotesSection
                    quotes={data.quotes}
                    error={errors.quotes}
                    onRetry={loadAll}
                    onSend={(quote) => setSendQuote(quote)}
                    flashId={flash && flash.quote !== undefined ? flash.quote : null}
                    sectionRef={reg('quotes')}
                />

                <MessagesSection
                    title="Messages reçus"
                    text="Réponses des clients à vos devis (acceptation, refus, demande de modification)."
                    emptyText="Les réponses des clients à vos devis apparaîtront ici."
                    data={data.messages}
                    error={errors.messages}
                    onRetry={loadAll}
                    reload={reloadMessages}
                    sectionRef={reg('messages')}
                />
            </Container>

            {quoteFor ? (
                <QuoteDialog
                    client={quoteFor}
                    events={data.events}
                    prospects={data.prospects}
                    onClose={() => setQuoteFor(null)}
                    onCreated={reloadQuotes}
                />
            ) : null}

            {sendQuote ? (
                <SendDialog quote={sendQuote} onClose={() => setSendQuote(null)} onSent={reloadQuotes} />
            ) : null}
        </Page>
    );
}

const s = StyleSheet.create({
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    first: { marginTop: 8 },
    stats: { gap: 16 },
    eventList: { gap: 12 },
    eventRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
        paddingHorizontal: 20
    },
    eventDate: {
        width: 58,
        alignItems: 'center',
        paddingVertical: 6.4,
        backgroundColor: colors.brandSoft,
        borderRadius: 12
    },
    eventDay: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, fontWeight: '700', color: colors.brandDeep },
    eventMonth: {
        fontFamily: fonts.body,
        fontSize: 11.5,
        lineHeight: 13,
        fontWeight: '700',
        letterSpacing: 0.92,
        textTransform: 'uppercase',
        color: colors.brandDeep
    },
    eventMain: { flex: 1, flexBasis: 140, minWidth: 0 },
    eventName: { fontSize: 16.8, lineHeight: 21, marginBottom: 0 },
    eventMeta: { fontFamily: fonts.body, fontSize: 14.4, lineHeight: 21, color: colors.muted },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.4 },
    skeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 21,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 14
    },
    skeletonIcon: { width: 52, height: 52, borderRadius: 14 },
    skeletonLines: { flex: 1, gap: 9.6 },
    skeletonValue: { width: '45%', height: 25.6 }
});
