import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api } from '../api';
import { useApp } from '../context';
import { EVENT_STATUS, formatEventDates } from '../format';
import { Container, Page } from '../layout';
import { A, Btn, DataCell, DataRow, DataTable, EmptyState, Skeleton, StatCard, StatusBadge } from '../ui';
import { DashHead, LoadError, Section } from '../shared';

function StatsSkeleton() {
    return (
        <View style={s.stats}>
            {[0, 1, 2].map((i) => (
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

export default function DashboardEmployee({ onForbidden }) {
    const { session } = useApp();
    const [events, setEvents] = useState(null);
    const [clients, setClients] = useState(null);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(true);
    const alive = useRef(true);

    async function load(path, setter, key, label) {
        try {
            const rows = await api(path);
            if (!alive.current) return false;

            setter(Array.isArray(rows) ? rows : []);
            setErrors((current) => ({ ...current, [key]: '' }));
            return true;
        } catch (err) {
            if (err.redirected) return false;

            if (err.status === 403) {
                onForbidden();
                return false;
            }

            if (alive.current) {
                setErrors((current) => ({ ...current, [key]: `Impossible de charger ${label}. ${err.message}` }));
            }
            return true;
        }
    }

    async function refresh() {
        setBusy(true);

        const results = await Promise.all([
            load('/admin/events', setEvents, 'events', 'les événements'),
            load('/clients', setClients, 'clients', 'les clients')
        ]);

        if (alive.current && !results.includes(false)) setBusy(false);
    }

    useEffect(() => {
        alive.current = true;
        refresh();

        return () => {
            alive.current = false;
        };
        // chargement initial uniquement
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const drafts = events ? events.filter((e) => e.status === 'BROUILLON').length : null;
    const pick = (v) => (v === null ? '—' : v);
    const loaded = events !== null || clients !== null;

    return (
        <Page>
            <Container>
                <DashHead eyebrow="Espace employé" role="EMPLOYÉ" showRole={loaded} />

                <Section
                    title="Vue d'ensemble"
                    right={
                        <Btn small variant="outline" label="Actualiser" busy={busy} busyLabel="Actualisation…" onPress={refresh} />
                    }
                    style={s.first}
                >
                    {events === null && clients === null && busy ? (
                        <StatsSkeleton />
                    ) : (
                        <View style={s.stats}>
                            <StatCard icon="calendar" value={pick(events ? events.length : null)} label="Événements" />
                            <StatCard icon="edit" value={pick(drafts)} label="Événements brouillon" />
                            <StatCard icon="users" value={pick(clients ? clients.length : null)} label="Clients" />
                        </View>
                    )}
                </Section>

                <Section title="Événements">
                    {errors.events ? <LoadError message={errors.events} onRetry={refresh} /> : null}
                    {events !== null && !events.length ? (
                        <EmptyState
                            title="Aucun événement pour le moment"
                            text="Les événements créés apparaîtront ici."
                        />
                    ) : null}
                    {events && events.length ? (
                        <DataTable>
                            {events.map((e, index) => (
                                <DataRow key={e.id} last={index === events.length - 1}>
                                    <DataCell label="Événement" strong>
                                        {e.name}
                                    </DataCell>
                                    <DataCell label="Dates">{formatEventDates(e.start_at, e.end_at)}</DataCell>
                                    <DataCell label="Lieu">{e.location}</DataCell>
                                    <DataCell label="Type">{e.type || ''}</DataCell>
                                    <DataCell label="Statut">
                                        <StatusBadge map={EVENT_STATUS} value={e.status} />
                                    </DataCell>
                                </DataRow>
                            ))}
                        </DataTable>
                    ) : null}
                </Section>

                <Section title="Clients">
                    {errors.clients ? <LoadError message={errors.clients} onRetry={refresh} /> : null}
                    {clients !== null && !clients.length ? (
                        <EmptyState
                            title="Aucun client pour le moment"
                            text="Les clients apparaîtront ici après la conversion d’un prospect."
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
                                    <DataCell label="Adresse">{c.address || '—'}</DataCell>
                                </DataRow>
                            ))}
                        </DataTable>
                    ) : null}
                </Section>
            </Container>
        </Page>
    );
}

const s = StyleSheet.create({
    first: { marginTop: 8 },
    stats: { gap: 16 },
    right: { textAlign: 'right' },
    skeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 21,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e7ded3',
        borderRadius: 14
    },
    skeletonIcon: { width: 52, height: 52, borderRadius: 14 },
    skeletonLines: { flex: 1, gap: 9.6 },
    skeletonValue: { width: '45%', height: 25.6 }
});
