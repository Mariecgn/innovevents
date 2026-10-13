import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, ApiError, ROLE_LABELS } from '../api';
import { useApp } from '../context';
import { Container, Page, PageHead } from '../layout';
import { colors, fonts } from '../theme';
import { Alert, Btn, Card, Hint, Input, PasswordInput } from '../ui';
import { useForm } from '../useForm';

const NOTICES = {
    expired: ['warning', 'Votre session a expiré. Veuillez vous reconnecter.'],
    auth: ['info', 'Veuillez vous connecter pour accéder à cet espace.'],
    logout: ['success', 'Vous avez bien été déconnecté(e).']
};

const RULES = {
    email: { required: true, email: true },
    password: { required: true, keepSpaces: true }
};

export default function Login() {
    const { session, route, go, login, logout } = useApp();
    const form = useForm({ email: '', password: '' }, RULES);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    const notice = NOTICES[route.params && route.params.reason];

    async function submit() {
        setMessage(null);

        if (!form.validate()) return;

        setBusy(true);

        try {
            const data = await api('/auth/login', {
                method: 'POST',
                auth: false,
                body: { email: form.values.email.trim(), password: form.values.password }
            });

            if (!data || !data.token || !data.user) {
                throw new ApiError('Réponse inattendue du serveur. Veuillez réessayer.', 500);
            }

            if (!ROLE_LABELS[data.user.role]) {
                throw new ApiError("Votre profil n'est associé à aucun espace.", 403);
            }

            setMessage({ type: 'success', text: 'Connexion réussie. Redirection en cours…' });
            login(data);
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.status === 401 ? 'E-mail ou mot de passe incorrect.' : err.message
            });
            setBusy(false);
            form.set('password', '');
        }
    }

    return (
        <Page>
            <Container size="narrow">
                <PageHead eyebrow="Espace personnel" title="Connexion" lead="Accédez à votre espace Innov'Events." />

                {notice ? <Alert type={notice[0]} message={notice[1]} style={s.notice} /> : null}

                {session ? (
                    <Card style={s.card}>
                        <Text style={s.text}>
                            Vous êtes déjà connecté(e) en tant que <Text style={s.bold}>{session.firstname}</Text> (
                            {ROLE_LABELS[session.role] || session.role}).
                        </Text>
                        <View style={s.actions}>
                            <Btn label="Accéder à mon tableau de bord" onPress={() => go('dashboard')} />
                            <Btn variant="outline" label="Déconnexion" onPress={() => logout()} />
                        </View>
                    </Card>
                ) : (
                    <>
                        <Card style={s.card}>
                            <Input
                                label="Adresse e-mail"
                                maxLength={180}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="username"
                                textContentType="username"
                                returnKeyType="next"
                                {...form.bind('email')}
                            />

                            <PasswordInput
                                label="Mot de passe"
                                autoComplete="current-password"
                                textContentType="password"
                                returnKeyType="go"
                                onSubmitEditing={submit}
                                {...form.bind('password')}
                            />

                            {message ? <Alert type={message.type} message={message.text} /> : null}

                            <Btn label="Se connecter" busy={busy} busyLabel="Connexion en cours…" onPress={submit} />
                        </Card>

                        <View style={s.register}>
                            <Hint>
                                Pas encore de compte ?{' '}
                                <Text accessibilityRole="link" style={s.link} onPress={() => go('register')}>
                                    Créer un compte
                                </Text>
                            </Hint>
                        </View>
                    </>
                )}
            </Container>
        </Page>
    );
}

const s = StyleSheet.create({
    notice: { marginBottom: 16 },
    card: { gap: 16 },
    text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25.6, color: colors.text },
    bold: { fontWeight: '700' },
    actions: { gap: 12 },
    register: { marginTop: 24 },
    link: { color: colors.brandDark, textDecorationLine: 'underline' }
});
