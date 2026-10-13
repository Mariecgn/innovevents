import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useApp } from './context';
import { Badge, Btn, Card, H3, MetaLine, StatusBadge } from './ui';
import { EVENT_STATUS, eventImageUrl, formatEventDates } from './format';
import { HERO } from './images';
import { colors, radius } from './theme';

// Carte d'événement réutilisée par l'accueil et la page Événements (renderEventCard du site).
export default function EventCard({ event }) {
    const { go } = useApp();
    const [failed, setFailed] = useState(false);

    const url = failed ? null : eventImageUrl(event.image_url);
    const known = EVENT_STATUS[event.status];

    return (
        <Card style={s.card}>
            <View style={s.clip}>
                <View style={s.media}>
                    <Image
                        source={url ? { uri: url } : HERO}
                        onError={() => setFailed(true)}
                        resizeMode="cover"
                        accessibilityIgnoresInvertColors
                        style={s.image}
                    />
                </View>

                <View style={s.body}>
                    <View style={s.badges}>
                        {event.type ? <Badge>{event.type}</Badge> : null}
                        {event.theme ? <Badge tone="neutral">{event.theme}</Badge> : null}
                        {known && event.status !== 'ACCEPTE' ? <StatusBadge map={EVENT_STATUS} value={event.status} /> : null}
                    </View>

                    <H3 style={s.title}>{event.name}</H3>
                    <MetaLine icon="calendar">{formatEventDates(event.start_at, event.end_at)}</MetaLine>
                    <MetaLine icon="pin">{event.location}</MetaLine>

                    <Btn
                        small
                        variant="outline"
                        label="Prestations et devis"
                        onPress={() => go('quote', { event_type: event.type || '' })}
                    />
                </View>
            </View>
        </Card>
    );
}

const s = StyleSheet.create({
    card: { padding: 0 },
    clip: { overflow: 'hidden', borderRadius: radius.md - 1 },
    media: { aspectRatio: 16 / 10, backgroundColor: colors.brandSoft },
    image: { width: '100%', height: '100%' },
    body: { gap: 9.6, padding: 20 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.4 },
    title: { marginBottom: 0 }
});
