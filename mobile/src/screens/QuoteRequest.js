import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api';
import { useApp } from '../context';
import { EVENT_TYPES, frToIso, todayIso } from '../format';
import { Container, Page, PageHead } from '../layout';
import { colors, fonts } from '../theme';
import { Alert, Btn, Card, DateField, H2, Hint, IconBadge, Input, Muted, Select } from '../ui';
import { useForm } from '../useForm';

const RULES = {
    company_name: { required: true },
    firstname: { required: true },
    lastname: { required: true },
    email: { required: true, email: true },
    phone: {
        required: true,
        pattern: /^[0-9+.()\- ]{6,30}$/,
        patternMsg: 'Saisissez un numéro de téléphone valide (chiffres, espaces, + . - ( ) uniquement).'
    },
    event_type: { required: true },
    desired_date: {
        required: true,
        custom: (value) => {
            const iso = frToIso(value);
            if (!iso) return 'Saisissez une date valide (JJ/MM/AAAA).';
            return iso < todayIso() ? 'La date souhaitée ne peut pas être passée.' : '';
        }
    },
    estimated_participants: {
        required: true,
        number: true,
        integer: true,
        min: 1,
        max: 100000,
        minMsg: 'Indiquez au moins 1 participant.'
    },
    location: { required: true },
    need_description: { required: true }
};

const TYPE_OPTIONS = EVENT_TYPES.map((t) => ({ value: t, label: t }));

function initialValues(eventType) {
    return {
        company_name: '',
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        event_type: EVENT_TYPES.includes(eventType) ? eventType : EVENT_TYPES[0],
        desired_date: '',
        estimated_participants: '',
        location: '',
        need_description: ''
    };
}

function Legend({ children }) {
    return <Text style={s.legend}>{children}</Text>;
}

export default function QuoteRequest() {
    const { go, route } = useApp();
    const wanted = route.params && route.params.event_type;
    const form = useForm(initialValues(wanted), RULES);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(null);

    async function submit() {
        setMessage('');

        if (!form.validate()) return;

        const v = form.values;
        const data = {
            company_name: v.company_name.trim(),
            firstname: v.firstname.trim(),
            lastname: v.lastname.trim(),
            email: v.email.trim(),
            phone: v.phone.trim(),
            event_type: v.event_type,
            desired_date: frToIso(v.desired_date),
            estimated_participants: Number(v.estimated_participants),
            location: v.location.trim(),
            need_description: v.need_description.trim()
        };

        setBusy(true);

        try {
            const res = await api('/prospects', { method: 'POST', auth: false, body: data });

            setSent(res.message || 'Merci pour votre demande. Nous vous recontacterons dans les plus brefs délais.');
            form.reset(initialValues(wanted));
        } catch (err) {
            setMessage(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Page>
            <Container size="medium">
                <PageHead
                    eyebrow="Votre projet"
                    title="Demande de devis"
                    lead="Décrivez-nous votre événement : nous vous recontactons dans les plus brefs délais pour en discuter."
                />

                {sent ? (
                    <Card style={s.state}>
                        <IconBadge name="check" size={48} iconSize={26} />
                        <H2 style={s.stateTitle}>Demande envoyée</H2>
                        <Muted style={s.stateText}>{sent}</Muted>
                        <View style={s.stateActions}>
                            <Btn center label="Retour à l'accueil" onPress={() => go('home')} />
                            <Btn center variant="outline" label="Envoyer une autre demande" onPress={() => setSent(null)} />
                        </View>
                    </Card>
                ) : (
                    <Card>
                        <View style={s.form}>
                            <View style={s.fieldset}>
                                <Legend>Vous</Legend>
                                <Input
                                    label="Entreprise"
                                    required
                                    maxLength={180}
                                    {...form.bind('company_name')}
                                />
                                <Input
                                    label="Prénom"
                                    required
                                    maxLength={100}
                                    autoComplete="given-name"
                                    textContentType="givenName"
                                    {...form.bind('firstname')}
                                />
                                <Input
                                    label="Nom"
                                    required
                                    maxLength={100}
                                    autoComplete="family-name"
                                    textContentType="familyName"
                                    {...form.bind('lastname')}
                                />
                                <Input
                                    label="Adresse e-mail"
                                    required
                                    maxLength={180}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="email"
                                    textContentType="emailAddress"
                                    {...form.bind('email')}
                                />
                                <Input
                                    label="Téléphone"
                                    required
                                    maxLength={30}
                                    keyboardType="phone-pad"
                                    autoComplete="tel"
                                    textContentType="telephoneNumber"
                                    {...form.bind('phone')}
                                />
                            </View>

                            <View style={s.fieldset}>
                                <Legend>Votre événement</Legend>
                                <Select
                                    label="Type d'événement"
                                    required
                                    options={TYPE_OPTIONS}
                                    {...form.pick('event_type')}
                                />
                                <DateField label="Date souhaitée" required {...form.bind('desired_date')} />
                                <Input
                                    label="Nombre de participants"
                                    required
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    {...form.bind('estimated_participants')}
                                />
                                <Input
                                    label="Lieu"
                                    required
                                    maxLength={255}
                                    hint="Ville ou lieu envisagé."
                                    {...form.bind('location')}
                                />
                                <Input
                                    label="Votre besoin"
                                    required
                                    multiline
                                    maxLength={2000}
                                    {...form.bind('need_description')}
                                />
                            </View>

                            {message ? <Alert type="error" message={message} /> : null}

                            <View style={s.actions}>
                                <Btn label="Envoyer ma demande" busy={busy} busyLabel="Envoi en cours…" onPress={submit} />
                                <Hint>
                                    <Text style={s.req}>*</Text> Tous les champs sont obligatoires.
                                </Hint>
                            </View>
                        </View>
                    </Card>
                )}
            </Container>
        </Page>
    );
}

const s = StyleSheet.create({
    form: { gap: 16 },
    fieldset: { gap: 17.6 },
    legend: {
        fontFamily: fonts.display,
        fontSize: 18.4,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 1
    },
    req: { color: colors.danger },
    actions: { gap: 12, alignItems: 'flex-start' },
    state: { alignItems: 'center', padding: 28 },
    stateTitle: { textAlign: 'center' },
    stateText: { textAlign: 'center' },
    stateActions: { alignItems: 'center', gap: 12, marginTop: 20 }
});
