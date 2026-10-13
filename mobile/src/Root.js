import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StatusBar, StyleSheet, Text, View } from 'react-native';

import { ROLE_LABELS, setToken, setUnauthorizedHandler } from './api';
import { AppContext } from './context';
import { Page, Container } from './layout';
import { colors, fonts } from './theme';
import { Btn, Card, Eyebrow, H1, Muted, ToastHost } from './ui';
import Contact from './screens/Contact';
import DashboardAdmin from './screens/DashboardAdmin';
import DashboardClient from './screens/DashboardClient';
import DashboardEmployee from './screens/DashboardEmployee';
import Events from './screens/Events';
import Home from './screens/Home';
import { Cgu, Legal } from './screens/Legal';
import Login from './screens/Login';
import QuoteRequest from './screens/QuoteRequest';
import Register from './screens/Register';
import Reviews from './screens/Reviews';

const SCREENS = {
    home: Home,
    events: Events,
    reviews: Reviews,
    contact: Contact,
    quote: QuoteRequest,
    login: Login,
    register: Register,
    legal: Legal,
    cgu: Cgu
};

const DASHBOARDS = {
    ADMIN: DashboardAdmin,
    EMPLOYEE: DashboardEmployee,
    CLIENT: DashboardClient
};

// Page « Accès refusé » (renderForbidden du site).
function Forbidden({ session, go, logout }) {
    const role = session ? ROLE_LABELS[session.role] || session.role : '';

    return (
        <Page>
            <Container size="narrow">
                <Card accessibilityRole="alert" style={s.forbidden}>
                    <Eyebrow>Erreur 403</Eyebrow>
                    <H1 style={s.center}>Accès refusé</H1>
                    <Muted style={s.center}>
                        Cette page n'est pas accessible avec votre profil{role ? ` (${role})` : ''}.
                    </Muted>
                    <View style={s.forbiddenActions}>
                        {session ? <Btn center label="Aller à mon tableau de bord" onPress={() => go('dashboard')} /> : null}
                        <Btn center variant="outline" label="Retour à l'accueil" onPress={() => go('home')} />
                        {session ? <Btn center variant="ghost" label="Déconnexion" onPress={() => logout()} /> : null}
                    </View>
                </Card>
            </Container>
        </Page>
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (!this.state.failed) return this.props.children;

        return (
            <View style={s.crash}>
                <Text style={s.crashTitle}>Une erreur est survenue</Text>
                <Text style={s.crashText}>Fermez puis rouvrez l'application pour continuer.</Text>
            </View>
        );
    }
}

export default function Root() {
    const [session, setSession] = useState(null);
    const [route, setRoute] = useState({ name: 'home', params: {}, key: 0 });
    const [forbidden, setForbidden] = useState(false);
    const history = useRef([]);
    const current = useRef(route);
    const seq = useRef(0);

    const show = useCallback((next) => {
        current.current = next;
        setForbidden(false);
        setRoute(next);
    }, []);

    // Navigation : un historique simple, pour que le bouton Retour d'Android remonte d'un écran.
    const go = useCallback(
        (name, params = {}, { reset = false } = {}) => {
            if (reset || name === 'home') history.current = [];
            else history.current.push(current.current);

            seq.current += 1;
            show({ name, params, key: seq.current });
        },
        [show]
    );

    const goBack = useCallback(() => {
        const previous = history.current.pop();
        if (!previous) return false;

        show(previous);
        return true;
    }, [show]);

    const logout = useCallback(
        (reason = 'logout') => {
            setToken(null);
            setSession(null);
            go('login', { reason }, { reset: true });
        },
        [go]
    );

    const login = useCallback(
        (data) => {
            setToken(data.token);
            setSession({ id: data.user.id, role: data.user.role, firstname: String(data.user.firstname || '').trim() });
            go('dashboard', {}, { reset: true });
        },
        [go]
    );

    // 401 : le serveur n'accepte plus le jeton (session expirée) -> retour à la connexion.
    useEffect(() => {
        setUnauthorizedHandler(() => logout('expired'));
    }, [logout]);

    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => goBack());
        return () => subscription.remove();
    }, [goBack]);

    let screen;

    if (route.name === 'dashboard') {
        const Dashboard = session && DASHBOARDS[session.role];

        if (!Dashboard) {
            screen = <Login key="auth" />;
        } else if (forbidden) {
            screen = <Forbidden session={session} go={go} logout={logout} />;
        } else {
            screen = <Dashboard key={route.key} onForbidden={() => setForbidden(true)} />;
        }
    } else {
        const Screen = SCREENS[route.name] || Home;
        screen = <Screen key={route.key} />;
    }

    // Tableau de bord demandé sans être connecté : connexion avec le message du site.
    const effectiveRoute =
        route.name === 'dashboard' && !(session && DASHBOARDS[session.role])
            ? { name: 'login', params: { reason: 'auth' }, key: route.key }
            : route;

    return (
        <ErrorBoundary>
            <AppContext.Provider value={{ session, route: effectiveRoute, go, goBack, login, logout }}>
                <View style={s.root}>
                    <StatusBar barStyle="dark-content" />
                    {screen}
                    <ToastHost />
                </View>
            </AppContext.Provider>
        </ErrorBoundary>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    forbidden: { alignItems: 'center', padding: 28 },
    center: { textAlign: 'center' },
    forbiddenActions: { alignItems: 'center', gap: 12, marginTop: 20 },
    crash: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
    crashTitle: { fontFamily: fonts.display, fontSize: 24, fontWeight: '700', color: colors.text },
    crashText: { marginTop: 8, fontFamily: fonts.body, fontSize: 16, color: colors.muted, textAlign: 'center' }
});
