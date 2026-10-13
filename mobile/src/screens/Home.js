import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { api } from '../api';
import { useApp } from '../context';
import EventCard from '../EventCard';
import { toDate } from '../format';
import { HERO } from '../images';
import { Page } from '../layout';
import { colors, fonts, GUTTER, radius, shadowLg } from '../theme';
import { Btn, Card, Eyebrow, H2, H3, IconBadge, Lead, Muted } from '../ui';

const FEATURES = [
    {
        icon: 'briefcase',
        title: 'Séminaires',
        text: "Réunissez vos équipes autour d'un programme pensé pour vos objectifs.",
        type: 'Séminaire'
    },
    {
        icon: 'presentation',
        title: 'Conférences',
        text: 'Des conférences professionnelles pour partager, inspirer et fédérer.',
        type: 'Conférence'
    },
    {
        icon: 'star',
        title: "Soirées d'entreprise",
        text: "Des soirées professionnelles sur mesure, à l'image de votre entreprise.",
        type: "Soirée d'entreprise"
    }
];

const STEPS = [
    {
        title: 'Vous nous écrivez',
        text: "Décrivez votre projet via le formulaire de demande de devis : type d'événement, date, lieu et nombre de participants."
    },
    {
        title: 'Nous échangeons',
        text: 'Chloé vous recontacte dans les plus brefs délais pour discuter de votre projet.'
    },
    {
        title: 'Nous préparons votre événement',
        text: 'Une fois votre projet validé, nous organisons votre événement sur mesure.'
    }
];

export default function Home() {
    const { go } = useApp();
    const [upcoming, setUpcoming] = useState([]);

    useEffect(() => {
        let alive = true;

        api('/events', { auth: false })
            .then((rows) => {
                if (!alive) return;

                const now = new Date();

                setUpcoming(
                    (Array.isArray(rows) ? rows : [])
                        .filter((e) => {
                            const end = toDate(e.end_at) || toDate(e.start_at);
                            return end && end >= now;
                        })
                        .sort((a, b) => toDate(a.start_at) - toDate(b.start_at))
                        .slice(0, 3)
                );
            })
            .catch(() => {
                /* section facultative : on la laisse masquée si l'API est indisponible */
            });

        return () => {
            alive = false;
        };
    }, []);

    return (
        <Page>
            <View style={s.hero}>
                <View style={s.visual}>
                    <View style={s.visualBack} />
                    <View style={[s.imageShadow, shadowLg]}>
                        <View style={s.imageClip}>
                            <View style={s.imageBox}>
                                <Image
                                    source={HERO}
                                    resizeMode="cover"
                                    accessibilityIgnoresInvertColors
                                    style={s.imageFill}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <View>
                    <Eyebrow>Événements d'entreprise sur mesure</Eyebrow>
                    <Text accessibilityRole="header" style={s.heroTitle}>
                        Innov'Events Manager
                    </Text>
                    <Lead style={s.heroLead}>
                        Agence événementielle haut de gamme spécialisée dans les séminaires, conférences et soirées
                        professionnelles sur mesure.
                    </Lead>

                    <View style={s.heroActions}>
                        <Btn full label="Demander un devis" onPress={() => go('quote')} />
                        <Btn full variant="outline" label="Découvrir nos événements" onPress={() => go('events')} />
                    </View>

                    <View style={s.chipList}>
                        {['Séminaires', 'Conférences', "Soirées d'entreprise"].map((label) => (
                            <View key={label} style={s.formatChip}>
                                <Text style={s.formatChipText}>{label}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            <View style={[s.section, s.sectionAlt]}>
                <View style={s.sectionInner}>
                    <View style={s.sectionHead}>
                        <Eyebrow>Nos prestations</Eyebrow>
                        <H2 style={s.sectionTitle}>Un événement à l'image de votre entreprise</H2>
                    </View>

                    <View style={s.stack}>
                        {FEATURES.map((f) => (
                            <Card key={f.title} style={s.feature}>
                                <IconBadge name={f.icon} />
                                <H3 style={s.noMargin}>{f.title}</H3>
                                <Muted>{f.text}</Muted>
                                <Btn
                                    small
                                    variant="outline"
                                    label="Demander un devis"
                                    onPress={() => go('quote', { event_type: f.type })}
                                />
                            </Card>
                        ))}
                    </View>
                </View>
            </View>

            <View style={s.section}>
                <View style={s.sectionInner}>
                    <View style={s.sectionHead}>
                        <Eyebrow>Comment ça se passe</Eyebrow>
                        <H2 style={s.sectionTitle}>De votre demande à votre événement</H2>
                    </View>

                    <View style={s.steps}>
                        {STEPS.map((step, index) => (
                            <View key={step.title} style={s.step}>
                                <View style={s.stepNumber}>
                                    <Text style={s.stepNumberText}>{index + 1}</Text>
                                </View>
                                <H3 style={s.stepTitle}>{step.title}</H3>
                                <Muted>{step.text}</Muted>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {upcoming.length ? (
                <View style={[s.section, s.sectionAlt]}>
                    <View style={s.sectionInner}>
                        <View style={s.sectionHeadRow}>
                            <View>
                                <Eyebrow>À venir</Eyebrow>
                                <H2 style={s.sectionTitle}>Prochains événements</H2>
                            </View>
                            <Btn small variant="outline" label="Voir tous les événements" onPress={() => go('events')} />
                        </View>

                        <View style={s.stack}>
                            {upcoming.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </View>
                    </View>
                </View>
            ) : null}

            <View style={s.section}>
                <View style={s.sectionInner}>
                    <View style={s.cta}>
                        <View>
                            <Text accessibilityRole="header" style={s.ctaTitle}>
                                Un projet d'événement ?
                            </Text>
                            <Text style={s.ctaText}>
                                Parlons-en : décrivez-nous votre besoin, nous vous recontactons dans les plus brefs délais.
                            </Text>
                        </View>
                        <Btn variant="light" label="Demander un devis" onPress={() => go('quote')} />
                    </View>
                </View>
            </View>
        </Page>
    );
}

const s = StyleSheet.create({
    hero: { gap: 24, paddingVertical: 40, paddingHorizontal: GUTTER },
    visual: { width: '100%', maxWidth: 520, alignSelf: 'center' },
    visualBack: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: -8,
        bottom: -8,
        backgroundColor: colors.brandSoft,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.lg
    },
    imageShadow: { borderRadius: radius.lg, backgroundColor: colors.brandDeep },
    imageClip: { overflow: 'hidden', borderRadius: radius.lg },
    imageBox: { width: '100%', aspectRatio: 5 / 4 },
    imageFill: { width: '100%', height: '100%' },
    heroTitle: {
        fontFamily: fonts.display,
        fontSize: 37.3,
        lineHeight: 44.8,
        fontWeight: '700',
        letterSpacing: -0.37,
        color: colors.text,
        marginBottom: 15
    },
    heroLead: { marginBottom: 28 },
    heroActions: { gap: 12 },
    chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 28 },
    formatChip: {
        paddingVertical: 4.8,
        paddingHorizontal: 13.6,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.pill
    },
    formatChipText: { fontFamily: fonts.body, fontSize: 14.1, fontWeight: '700', color: colors.brandDark },

    section: { paddingVertical: 40 },
    sectionAlt: { backgroundColor: colors.bgAlt },
    sectionInner: { paddingHorizontal: GUTTER },
    sectionHead: { maxWidth: 640, marginBottom: 32 },
    sectionHeadRow: { gap: 16, marginBottom: 32 },
    sectionTitle: { marginBottom: 0 },
    stack: { gap: 20 },
    feature: { gap: 8 },
    noMargin: { marginBottom: 0 },
    steps: { gap: 24 },
    step: { paddingTop: 54.4 },
    stepNumber: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 41.6,
        height: 41.6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 21,
        backgroundColor: colors.brand
    },
    stepNumberText: { fontFamily: fonts.display, fontSize: 19.2, fontWeight: '700', color: '#fff' },
    stepTitle: { marginBottom: 4.8 },

    cta: { gap: 24, padding: 28, backgroundColor: colors.brandDeep, borderRadius: radius.lg },
    ctaTitle: {
        fontFamily: fonts.display,
        fontSize: 23.2,
        lineHeight: 27.8,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4.8
    },
    ctaText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25.6, color: '#f3e9de' }
});
