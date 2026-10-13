import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api';
import { formatDate, PROSPECT_STATUS } from '../format';
import { colors, fonts } from '../theme';
import {
    A,
    Alert,
    Btn,
    Card,
    Chip,
    Details,
    Dialog,
    DialogActions,
    DialogBody,
    DialogTitle,
    EmptyState,
    H3,
    Icon,
    Muted,
    Skeleton,
    StatusBadge,
    toast
} from '../ui';
import { LoadError, Section } from '../shared';

const FILTERS = [
    { key: 'all', label: 'Tous', match: () => true },
    { key: 'todo', label: 'À traiter', match: (p) => p.status === 'A_CONTACTER' || p.status === 'QUALIFIE' },
    { key: 'done', label: 'Convertis', match: (p) => p.status === 'CONVERTI' },
    { key: 'refused', label: 'Refusés', match: (p) => p.status === 'ECHOUE' }
];

export const TODO_FILTER = FILTERS[1].match;

function conversionMessage(err) {
    if (err.status === 400 && /d[ée]j[àa] existant/i.test(err.message)) {
        return 'Un client avec la même adresse e-mail existe déjà : le prospect n’a pas été converti.';
    }
    if (err.status === 404) {
        return 'Ce prospect est introuvable (il a peut-être été supprimé). La liste a été actualisée.';
    }
    if (err.status === 403) return 'Accès refusé : seul un administrateur peut convertir un prospect.';
    return err.message;
}

function rejectionMessage(err) {
    if (err.status === 400) return 'Ce prospect a déjà été converti en client : il ne peut plus être refusé.';
    if (err.status === 404 && err.message === 'Prospect introuvable') {
        return 'Ce prospect est introuvable (il a peut-être été supprimé). La liste a été actualisée.';
    }
    if (err.status === 404) {
        return "Cette action n'est pas disponible sur le serveur actuel : redémarrez le backend pour l'activer.";
    }
    if (err.status === 403) return 'Accès refusé : seul un administrateur peut refuser un prospect.';
    return err.message;
}

function Meta({ label, children }) {
    return (
        <View style={s.meta}>
            <Text style={s.metaLabel}>{label}</Text>
            <Text style={s.metaValue}>{children}</Text>
        </View>
    );
}

function ProspectCard({ p, flash, onConvert, onReject }) {
    const done = p.status === 'CONVERTI';
    const refused = p.status === 'ECHOUE';
    const phone = String(p.phone || '');
    const tel = phone.replace(/[^\d+]/g, '');

    return (
        <Card flash={flash} style={s.card}>
            <View style={s.cardHead}>
                <View style={s.cardTitle}>
                    <H3 style={s.noMargin}>{p.company_name}</H3>
                    <Muted style={s.cardSub}>
                        {p.firstname} {p.lastname}
                    </Muted>
                </View>
                <StatusBadge map={PROSPECT_STATUS} value={p.status} />
            </View>

            <View style={s.metaGrid}>
                <Meta label="E-mail">
                    <A href={`mailto:${p.email}`}>{p.email}</A>
                </Meta>
                <Meta label="Téléphone">{tel ? <A href={`tel:${tel}`}>{phone}</A> : phone}</Meta>
                <Meta label="Type d'événement">{p.event_type}</Meta>
                <Meta label="Participants">{String(p.estimated_participants ?? '')}</Meta>
                <Meta label="Date souhaitée">{formatDate(p.desired_date)}</Meta>
                <Meta label="Lieu">{p.location}</Meta>
            </View>

            <Details summary="Besoin exprimé">
                <Text style={s.need}>{p.need_description}</Text>
            </Details>

            <View style={s.foot}>
                {done ? (
                    <View style={s.note}>
                        <Icon name="check" size={18} color={colors.success} />
                        <Text style={[s.noteText, { color: colors.success }]}>Converti en client</Text>
                    </View>
                ) : refused ? (
                    <View style={s.note}>
                        <Icon name="xcircle" size={18} color={colors.danger} />
                        <Text style={[s.noteText, { color: colors.danger }]}>Prospect refusé</Text>
                    </View>
                ) : (
                    <View style={s.actions}>
                        <Btn label="Convertir en client" onPress={() => onConvert(p)} />
                        <Btn variant="dangerOutline" label="Refuser" onPress={() => onReject(p)} />
                    </View>
                )}
                <Text style={s.received}>Reçu le {formatDate(p.created_at)}</Text>
            </View>
        </Card>
    );
}

function ConvertDialog({ prospect, onClose, onSwitchToReject, onFlash, refresh }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [fatal, setFatal] = useState(false);
    const [duplicate, setDuplicate] = useState(false);

    async function run() {
        setBusy(true);
        setError('');

        try {
            const result = await api(`/prospects/${encodeURIComponent(prospect.id)}/convert`, { method: 'POST' });

            onClose();

            const reference = result && result.client_id ? ` (fiche client n° ${result.client_id})` : '';
            toast('success', `« ${prospect.company_name} » a été converti en client${reference}.`);

            onFlash({ id: prospect.id, kind: 'converted' });
            await refresh();
        } catch (err) {
            if (err.redirected) return;

            const client = err.status >= 400 && err.status < 500;

            setBusy(false);
            setError(conversionMessage(err));
            setFatal(client);
            setDuplicate(client && err.status === 400 && /d[ée]j[àa] existant/i.test(err.message));

            if (client) refresh();
        }
    }

    return (
        <Dialog visible onClose={onClose} dismissable={!busy}>
            <DialogBody>
                <DialogTitle>Convertir ce prospect en client ?</DialogTitle>
                <Text style={s.dialogText}>
                    Une fiche client sera créée pour <Text style={s.bold}>{prospect.company_name}</Text> ({prospect.firstname}{' '}
                    {prospect.lastname}) à partir des informations du prospect. Le prospect passera au statut « Converti ».
                </Text>
                <Text style={s.dialogHint}>
                    Le demandeur en est informé dans sa messagerie s'il a un compte. Cette action ne peut pas être annulée
                    depuis l'interface.
                </Text>
                {error ? <Alert type="error" message={error} /> : null}
            </DialogBody>

            <DialogActions>
                <Btn full variant="outline" label={fatal ? 'Fermer' : 'Annuler'} disabled={busy} onPress={onClose} />
                {duplicate ? (
                    <Btn full variant="dangerOutline" label="Refuser ce prospect" onPress={() => onSwitchToReject(prospect)} />
                ) : null}
                {!fatal ? (
                    <Btn
                        full
                        label={error ? 'Réessayer' : 'Confirmer la conversion'}
                        busy={busy}
                        busyLabel="Conversion en cours…"
                        onPress={run}
                    />
                ) : null}
            </DialogActions>
        </Dialog>
    );
}

function RejectDialog({ prospect, duplicate, onClose, onFlash, refresh }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [fatal, setFatal] = useState(false);

    async function run() {
        setBusy(true);
        setError('');

        try {
            await api(`/prospects/${encodeURIComponent(prospect.id)}/reject`, { method: 'POST' });

            onClose();
            toast('success', `« ${prospect.company_name} » a été refusé : il ne figure plus dans les prospects à traiter.`);

            onFlash({ id: prospect.id, kind: 'refused' });
            await refresh();
        } catch (err) {
            if (err.redirected) return;

            const client = err.status >= 400 && err.status < 500;

            setBusy(false);
            setError(rejectionMessage(err));
            setFatal(client);

            if (client) refresh();
        }
    }

    return (
        <Dialog visible onClose={onClose} dismissable={!busy}>
            <DialogBody>
                <DialogTitle>Refuser ce prospect ?</DialogTitle>
                <Text style={s.dialogText}>
                    La demande de <Text style={s.bold}>{prospect.company_name}</Text> ({prospect.firstname} {prospect.lastname})
                    passera au statut « Refusé » et ne sera plus à traiter.
                </Text>
                {duplicate ? (
                    <Text style={s.dialogText}>
                        Cette demande est un doublon : un client avec la même adresse e-mail existe déjà.
                    </Text>
                ) : null}
                <Text style={s.dialogHint}>
                    Le demandeur en est informé dans sa messagerie s'il a un compte ; aucun e-mail n'est envoyé. Cette
                    action ne peut pas être annulée depuis l'interface.
                </Text>
                {error ? <Alert type="error" message={error} /> : null}
            </DialogBody>

            <DialogActions>
                <Btn full variant="outline" label={fatal ? 'Fermer' : 'Annuler'} disabled={busy} onPress={onClose} />
                {!fatal ? (
                    <Btn
                        full
                        variant="danger"
                        label={error ? 'Réessayer' : 'Confirmer le refus'}
                        busy={busy}
                        busyLabel="Refus en cours…"
                        onPress={run}
                    />
                ) : null}
            </DialogActions>
        </Dialog>
    );
}

export function ProspectsSection({ prospects, error, onRetry, flash, onFlash, refresh, sectionRef }) {
    const [filter, setFilter] = useState('all');
    const [convert, setConvert] = useState(null);
    const [reject, setReject] = useState(null);

    const all = prospects || [];
    const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];
    const shown = all.filter(active.match);

    const flashFor = (p) => (flash && flash.id === p.id ? flash.kind : undefined);

    return (
        <Section
            title="Prospects"
            text="Demandes de devis reçues depuis le site. Convertissez un prospect pour créer sa fiche client, ou refusez-le s'il ne donne pas suite."
            sectionRef={sectionRef}
        >
            {prospects !== null ? (
                <View style={s.toolbar}>
                    <View style={s.chips}>
                        {FILTERS.map((f) => (
                            <Chip
                                key={f.key}
                                label={f.label}
                                count={all.filter(f.match).length}
                                pressed={filter === f.key}
                                onPress={() => setFilter(f.key)}
                            />
                        ))}
                    </View>
                    {all.length ? (
                        <Muted>
                            {shown.length} prospect{shown.length > 1 ? 's' : ''} affiché{shown.length > 1 ? 's' : ''} sur{' '}
                            {all.length}
                        </Muted>
                    ) : null}
                </View>
            ) : null}

            {error ? <LoadError message={error} onRetry={onRetry} /> : null}

            {prospects === null && !error ? (
                <View style={s.list}>
                    {[0, 1].map((i) => (
                        <Card key={i} style={s.skeletonCard}>
                            <Skeleton style={s.skeletonTitle} />
                            <Skeleton />
                            <Skeleton />
                        </Card>
                    ))}
                </View>
            ) : null}

            {prospects !== null && !all.length ? (
                <EmptyState
                    title="Aucun prospect pour le moment"
                    text="Les demandes de devis envoyées depuis le site apparaîtront ici."
                />
            ) : null}

            {prospects !== null && all.length && !shown.length ? (
                <EmptyState
                    title="Aucun prospect dans cette catégorie"
                    text="Changez de filtre pour afficher les autres prospects."
                />
            ) : null}

            {shown.length ? (
                <View style={s.list}>
                    {shown.map((p) => (
                        <ProspectCard
                            key={p.id}
                            p={p}
                            flash={flashFor(p)}
                            onConvert={(prospect) => setConvert(prospect)}
                            onReject={(prospect) => setReject({ prospect, duplicate: false })}
                        />
                    ))}
                </View>
            ) : null}

            {convert ? (
                <ConvertDialog
                    prospect={convert}
                    onClose={() => setConvert(null)}
                    onSwitchToReject={(prospect) => {
                        setConvert(null);
                        setReject({ prospect, duplicate: true });
                    }}
                    onFlash={onFlash}
                    refresh={refresh}
                />
            ) : null}

            {reject ? (
                <RejectDialog
                    prospect={reject.prospect}
                    duplicate={reject.duplicate}
                    onClose={() => setReject(null)}
                    onFlash={onFlash}
                    refresh={refresh}
                />
            ) : null}
        </Section>
    );
}

const s = StyleSheet.create({
    toolbar: { gap: 12, marginBottom: 17.6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    list: { gap: 17.6 },
    card: { gap: 16 },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    cardTitle: { flex: 1, minWidth: 0 },
    cardSub: { marginTop: 1.6 },
    noMargin: { marginBottom: 0 },
    metaGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 11.2 },
    meta: { width: '47%', flexGrow: 1, minWidth: 130 },
    metaLabel: {
        fontFamily: fonts.body,
        fontSize: 11.5,
        fontWeight: '700',
        letterSpacing: 0.92,
        textTransform: 'uppercase',
        color: colors.muted
    },
    metaValue: { marginTop: 1.6, fontFamily: fonts.body, fontSize: 14.9, lineHeight: 22, color: colors.text },
    need: { fontFamily: fonts.body, fontSize: 14.9, lineHeight: 22, color: colors.muted },
    foot: { gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9.6 },
    note: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    noteText: { fontFamily: fonts.body, fontSize: 14.9, fontWeight: '700' },
    received: { fontFamily: fonts.body, fontSize: 13.6, color: colors.muted },
    dialogText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25.6, color: colors.text },
    dialogHint: { fontFamily: fonts.body, fontSize: 13.6, lineHeight: 20, color: colors.muted },
    bold: { fontWeight: '700' },
    skeletonCard: { gap: 9.6 },
    skeletonTitle: { width: '45%', height: 25.6 }
});
