import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../api';
import { useApp } from '../context';
import EventCard from '../EventCard';
import { EVENT_TYPES, frToIso, toDate } from '../format';
import { Container, Page, PageHead } from '../layout';
import { colors, fonts } from '../theme';
import { Alert, Btn, Card, CountPill, DateField, EmptyState, H2, Input, Muted, Skeleton } from '../ui';

const EMPTY = { type: '', theme: '', from: '', to: '' };

function EventsSkeleton() {
    return (
        <View style={s.stack}>
            {[0, 1, 2].map((i) => (
                <Card key={i} style={s.skeletonCard}>
                    <Skeleton style={s.skeletonMedia} />
                    <View style={s.skeletonBody}>
                        <Skeleton style={s.skeletonTitle} />
                        <Skeleton />
                        <Skeleton />
                    </View>
                </Card>
            ))}
        </View>
    );
}

function Group({ title, rows }) {
    if (!rows.length) return null;

    return (
        <View>
            <View style={s.groupTitle}>
                <H2 style={s.groupText}>{title}</H2>
                <CountPill value={rows.length} />
            </View>
            <View style={s.stack}>
                {rows.map((event) => (
                    <EventCard key={event.id} event={event} />
                ))}
            </View>
        </View>
    );
}

export default function Events() {
    const { go } = useApp();
    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [rows, setRows] = useState(null);
    const [loading, setLoading] = useState(true);
    const [failure, setFailure] = useState('');
    const [filtered, setFiltered] = useState(false);

    const change = (name) => (text) => {
        setValues((current) => ({ ...current, [name]: text }));
        setErrors((current) => (current[name] ? { ...current, [name]: '' } : current));
    };

    async function load(next = values) {
        setMessage('');

        const fromIso = next.from.trim() ? frToIso(next.from) : '';
        const toIso = next.to.trim() ? frToIso(next.to) : '';
        const found = {};

        if (next.from.trim() && !fromIso) found.from = 'Saisissez une date valide (JJ/MM/AAAA).';
        if (next.to.trim() && !toIso) found.to = 'Saisissez une date valide (JJ/MM/AAAA).';

        setErrors(found);
        if (Object.keys(found).length) return;

        if (fromIso && toIso && fromIso > toIso) {
            setMessage('La date de début doit précéder la date de fin.');
            return;
        }

        const query = [];
        if (next.type.trim()) query.push('type=' + encodeURIComponent(next.type.trim()));
        if (next.theme.trim()) query.push('theme=' + encodeURIComponent(next.theme.trim()));
        if (fromIso) query.push('from=' + encodeURIComponent(fromIso + ' 00:00:00'));
        if (toIso) query.push('to=' + encodeURIComponent(toIso + ' 23:59:59'));

        setLoading(true);
        setFailure('');
        setRows(null);

        try {
            const data = await api('/events' + (query.length ? '?' + query.join('&') : ''), { auth: false });
            setRows(Array.isArray(data) ? data : []);
            setFiltered(query.length > 0);
        } catch (err) {
            setFailure(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load(EMPTY);
        // chargement initial uniquement
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function reset() {
        setValues(EMPTY);
        load(EMPTY);
    }

    const now = new Date();
    const endOf = (e) => toDate(e.end_at) || toDate(e.start_at);
    const upcoming = (rows || [])
        .filter((e) => !endOf(e) || endOf(e) >= now)
        .sort((a, b) => toDate(a.start_at) - toDate(b.start_at));
    const past = (rows || [])
        .filter((e) => endOf(e) && endOf(e) < now)
        .sort((a, b) => toDate(b.start_at) - toDate(a.start_at));

    return (
        <Page>
            <Container>
                <PageHead
                    eyebrow="Nos réalisations"
                    title="Événements publics"
                    lead="Parcourez les événements d'entreprise organisés par l'agence et filtrez-les par type, thème ou période."
                />

                <Card style={s.filters}>
                    <View style={s.suggestWrap}>
                        <Input
                            label="Type"
                            placeholder="Ex. Séminaire"
                            value={values.type}
                            onChangeText={change('type')}
                            autoCorrect={false}
                            maxLength={100}
                        />
                        <View style={s.suggestions}>
                            {EVENT_TYPES.map((type) => (
                                <Pressable
                                    key={type}
                                    accessibilityRole="button"
                                    onPress={() => change('type')(type)}
                                    style={s.suggestion}
                                >
                                    <Text style={s.suggestionText}>{type}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <Input
                        label="Thème"
                        placeholder="Ex. Leadership"
                        value={values.theme}
                        onChangeText={change('theme')}
                        autoCorrect={false}
                        maxLength={100}
                    />
                    <DateField label="À partir du" value={values.from} error={errors.from} onChangeText={change('from')} />
                    <DateField label="Jusqu'au" value={values.to} error={errors.to} onChangeText={change('to')} />

                    <View style={s.actions}>
                        <Btn label="Filtrer" onPress={() => load()} />
                        <Btn variant="outline" label="Réinitialiser" onPress={reset} />
                        {rows && rows.length ? (
                            <Muted accessibilityRole="text">
                                {rows.length} événement{rows.length > 1 ? 's' : ''}
                            </Muted>
                        ) : null}
                    </View>
                </Card>

                {message ? <Alert type="error" message={message} style={s.gap} /> : null}

                <View style={s.gap}>
                    {loading ? <EventsSkeleton /> : null}

                    {failure ? (
                        <Alert type="error" message={`Impossible de charger les événements. ${failure}`}>
                            <Btn small variant="outline" label="Réessayer" onPress={() => load()} />
                        </Alert>
                    ) : null}

                    {rows && !rows.length ? (
                        <EmptyState
                            title={
                                filtered
                                    ? 'Aucun événement ne correspond à votre recherche'
                                    : 'Aucun événement public pour le moment'
                            }
                            text={
                                filtered
                                    ? 'Modifiez ou réinitialisez les filtres pour élargir la recherche.'
                                    : 'Les événements publics apparaîtront ici dès leur publication.'
                            }
                        >
                            <Btn small variant="outline" label="Demander un devis" onPress={() => go('quote')} />
                        </EmptyState>
                    ) : null}

                    {rows && rows.length ? (
                        <View style={s.groups}>
                            <Group title="À venir" rows={upcoming} />
                            <Group title="Événements passés" rows={past} />
                        </View>
                    ) : null}
                </View>
            </Container>
        </Page>
    );
}

const s = StyleSheet.create({
    filters: { gap: 17.6, marginBottom: 24 },
    suggestWrap: { gap: 8 },
    suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    suggestion: {
        paddingVertical: 5,
        paddingHorizontal: 11,
        backgroundColor: colors.brandSoft,
        borderRadius: 999
    },
    suggestionText: { fontFamily: fonts.body, fontSize: 13.6, fontWeight: '700', color: colors.brandDark },
    actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
    gap: { marginBottom: 16 },
    stack: { gap: 20 },
    groups: { gap: 0 },
    groupTitle: { flexDirection: 'row', alignItems: 'center', gap: 9.6, marginTop: 36, marginBottom: 16 },
    groupText: { marginBottom: 0 },
    skeletonCard: { padding: 0, overflow: 'hidden' },
    skeletonMedia: { aspectRatio: 16 / 10, borderRadius: 0 },
    skeletonBody: { gap: 9.6, padding: 20 },
    skeletonTitle: { width: '45%', height: 25.6 }
});
