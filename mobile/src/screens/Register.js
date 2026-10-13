import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api';
import { useApp } from '../context';
import { Container, Page, PageHead } from '../layout';
import { colors, fonts } from '../theme';
import { Alert, Btn, Card, Hint, Input, PasswordInput } from '../ui';
import { useForm } from '../useForm';

// Mêmes règles que le serveur : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
const PASSWORD_RULES = [
    { key: 'length', label: '8 caractères minimum', test: (v) => v.length >= 8 },
    { key: 'lower', label: '1 lettre minuscule', test: (v) => /[a-z]/.test(v) },
    { key: 'upper', label: '1 lettre majuscule', test: (v) => /[A-Z]/.test(v) },
    { key: 'digit', label: '1 chiffre', test: (v) => /\d/.test(v) },
    { key: 'special', label: '1 caractère spécial', test: (v) => /[^A-Za-z0-9]/.test(v) }
];

const RULES = {
    firstname: { required: true },
    lastname: { required: true },
    username: { required: true },
    email: { required: true, email: true },
    password: {
        required: true,
        keepSpaces: true,
        custom: (value) =>
            PASSWORD_RULES.every((r) => r.test(value)) ? '' : 'Le mot de passe ne respecte pas toutes les règles ci-dessous.'
    }
};

const EMPTY = { firstname: '', lastname: '', username: '', email: '', password: '' };

export default function Register() {
    const { go } = useApp();
    const form = useForm(EMPTY, RULES);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [done, setDone] = useState(false);

    async function submit() {
        setMessage('');

        if (!form.validate()) return;

        const v = form.values;
        setBusy(true);

        try {
            await api('/auth/register', {
                method: 'POST',
                auth: false,
                body: {
                    firstname: v.firstname.trim(),
                    lastname: v.lastname.trim(),
                    username: v.username.trim(),
                    email: v.email.trim(),
                    password: v.password
                }
            });

            setDone(true);
        } catch (err) {
            setMessage(err.message);
            setBusy(false);
        }
    }

    return (
        <Page>
            <Container size="medium">
                <PageHead
                    eyebrow="Espace client"
                    title="Créer un compte"
                    lead="Rejoignez Innov'Events pour accéder à votre espace personnel."
                />

                {done ? (
                    <Card style={s.form}>
                        <Alert type="success" message="Votre compte a bien été créé. Vous pouvez maintenant vous connecter." />
                        <View style={s.actions}>
                            <Btn label="Se connecter" onPress={() => go('login')} />
                            <Btn variant="outline" label="Retour à l'accueil" onPress={() => go('home')} />
                        </View>
                    </Card>
                ) : (
                    <Card style={s.form}>
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
                            label="Nom d'utilisateur"
                            required
                            maxLength={100}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="username"
                            textContentType="username"
                            {...form.bind('username')}
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

                        <View style={s.passwordBlock}>
                            <PasswordInput
                                label="Mot de passe"
                                required
                                autoComplete="new-password"
                                textContentType="newPassword"
                                {...form.bind('password')}
                            />
                            <View accessibilityLabel="Règles du mot de passe" style={s.rules}>
                                {PASSWORD_RULES.map((rule) => {
                                    const ok = rule.test(form.values.password);

                                    return (
                                        <Text key={rule.key} style={[s.rule, ok && s.ruleOk]}>
                                            {ok ? '✓' : '○'}  {rule.label}
                                        </Text>
                                    );
                                })}
                            </View>
                        </View>

                        {message ? <Alert type="error" message={message} /> : null}

                        <View style={s.actions}>
                            <Btn label="Créer mon compte" busy={busy} busyLabel="Création du compte…" onPress={submit} />
                            <Hint>
                                Déjà inscrit(e) ?{' '}
                                <Text accessibilityRole="link" style={s.link} onPress={() => go('login')}>
                                    Se connecter
                                </Text>
                            </Hint>
                        </View>
                    </Card>
                )}
            </Container>
        </Page>
    );
}

const s = StyleSheet.create({
    form: { gap: 17.6 },
    passwordBlock: { gap: 8 },
    rules: { gap: 4 },
    rule: { fontFamily: fonts.body, fontSize: 13.6, lineHeight: 20, color: colors.muted },
    ruleOk: { color: colors.success, fontWeight: '700' },
    actions: { gap: 12, alignItems: 'flex-start' },
    link: { color: colors.brandDark, textDecorationLine: 'underline' }
});
