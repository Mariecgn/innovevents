import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, openQuotePdf } from './api';
import { useApp } from './context';
import { formatDateTime, todayLong } from './format';
import { colors, fonts, radius, shadowSm } from './theme';
import { Alert, Btn, EmptyState, Eyebrow, H1, H2, Lead, Muted, RoleBadge, toast } from './ui';

// En-tête commun aux trois tableaux de bord (dash-head du site).
export function DashHead({ eyebrow, role, showRole = true, intro }) {
    const { session, go, logout } = useApp();

    return (
        <View style={s.head}>
            <View>
                <Eyebrow>{eyebrow}</Eyebrow>
                <View style={s.title}>
                    <H1 style={s.titleText}>Bonjour {session.firstname} 👋</H1>
                    {showRole ? <RoleBadge>{role}</RoleBadge> : null}
                </View>
                <Lead>{todayLong() + (intro || '')}</Lead>
            </View>

            <View style={s.actions}>
                <Btn full variant="outline" label="← Retour à l'accueil" onPress={() => go('home')} />
                <Btn full variant="outline" label="Déconnexion" onPress={() => logout()} />
            </View>
        </View>
    );
}

// Section d'un tableau de bord ; sectionRef sert aux liens d'ancre du menu de sections.
export function Section({ title, text, right, sectionRef, children, style }) {
    return (
        <View ref={sectionRef} collapsable={false} style={[s.section, style]}>
            <View style={s.sectionHead}>
                <View>
                    <H2 style={s.sectionTitle}>{title}</H2>
                    {text ? <Muted style={s.sectionText}>{text}</Muted> : null}
                </View>
                {right}
            </View>
            {children}
        </View>
    );
}

export function LoadError({ message, onRetry }) {
    return (
        <Alert type="error" message={message} style={s.error}>
            <Btn small variant="outline" label="Réessayer" onPress={onRetry} />
        </Alert>
    );
}

export function MessageList({ items, emptyTitle, emptyText }) {
    if (!items.length) return <EmptyState title={emptyTitle} text={emptyText} />;

    return (
        <View style={s.messages}>
            {items.map((n, index) => (
                <View key={String(n.id || n._id || index)} style={[s.message, !n.read && s.unread]}>
                    <View style={s.messageHead}>
                        <Text style={s.messageTitle}>{n.title}</Text>
                        <Text style={s.messageTime}>{formatDateTime(n.created_at)}</Text>
                    </View>
                    <Text style={s.messageText}>{n.message}</Text>
                </View>
            ))}
        </View>
    );
}

// Messagerie : liste des notifications + « Tout marquer comme lu » (même API pour l'admin et le client).
export function MessagesSection({ title, text, emptyText, data, error, onRetry, reload, sectionRef }) {
    const [busy, setBusy] = useState(false);
    const unread = (data && data.unread) || 0;

    async function markAllRead() {
        setBusy(true);

        try {
            await api('/notifications/read', { method: 'POST' });
            await reload();
        } catch (err) {
            if (!err.redirected) toast('error', err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Section
            title={title}
            text={text}
            sectionRef={sectionRef}
            right={
                unread ? (
                    <Btn
                        small
                        variant="outline"
                        label="Tout marquer comme lu"
                        busy={busy}
                        busyLabel="Mise à jour…"
                        onPress={markAllRead}
                    />
                ) : null
            }
        >
            {error ? <LoadError message={error} onRetry={onRetry} /> : null}
            {data ? (
                <MessageList items={data.items || []} emptyTitle="Aucun message pour le moment" emptyText={emptyText} />
            ) : null}
        </Section>
    );
}

export function PdfButton({ id, label, small, full }) {
    const [busy, setBusy] = useState(false);

    async function open() {
        setBusy(true);

        try {
            await openQuotePdf(id);
        } catch (err) {
            if (!err.redirected) toast('error', `Impossible d’ouvrir le PDF. ${err.message}`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Btn small={small} full={full} variant="outline" label={label} busy={busy} busyLabel="Ouverture…" onPress={open} />
    );
}

const s = StyleSheet.create({
    head: { gap: 16, paddingTop: 20, paddingBottom: 28 },
    title: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 9.6 },
    titleText: { marginBottom: 0 },
    actions: { gap: 9.6 },
    section: { marginTop: 40 },
    sectionHead: { gap: 16, marginBottom: 17.6 },
    sectionTitle: { marginBottom: 0 },
    sectionText: { marginTop: 6 },
    error: { marginBottom: 16 },
    messages: { gap: 11.2 },
    message: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.md,
        ...shadowSm
    },
    unread: { backgroundColor: '#fffaf2', borderColor: colors.brand, borderLeftWidth: 5 },
    messageHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 16, rowGap: 4, marginBottom: 4.8 },
    messageTitle: { flexShrink: 1, fontFamily: fonts.body, fontSize: 16, lineHeight: 24, fontWeight: '700', color: colors.text },
    messageTime: { fontFamily: fonts.body, fontSize: 13.1, lineHeight: 24, color: colors.muted },
    messageText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25.6, color: colors.text }
});
