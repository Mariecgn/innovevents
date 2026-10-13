import React, { useEffect, useState } from 'react';
import {
    BackHandler,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { useApp } from './context';
import { Btn, Eyebrow, H1, Lead } from './ui';
import { colors, fonts, GUTTER, radius, shadowSm, TOP_INSET } from './theme';

const NAV_LINKS = [
    { route: 'home', label: 'Accueil' },
    { route: 'events', label: 'Événements' },
    { route: 'reviews', label: 'Avis' },
    { route: 'contact', label: 'Contact' }
];

const FOOTER_LINKS = [
    { route: 'home', label: 'Accueil' },
    { route: 'events', label: 'Événements' },
    { route: 'quote', label: 'Demande de devis' },
    { route: 'legal', label: 'Mentions légales' },
    { route: 'cgu', label: 'CGU / CGV' }
];

function NavLink({ label, active, onPress }) {
    return (
        <Pressable
            accessibilityRole="link"
            accessibilityState={{ selected: active }}
            onPress={onPress}
            style={[s.navLink, active && s.navLinkOn]}
        >
            <Text style={[s.navLinkText, active && s.navLinkTextOn]}>{label}</Text>
        </Pressable>
    );
}

export function Header() {
    const { session, route, go, logout } = useApp();
    const [open, setOpen] = useState(false);
    const { height } = useWindowDimensions();

    // Le bouton Retour d'Android referme d'abord le menu.
    useEffect(() => {
        if (!open) return undefined;

        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            setOpen(false);
            return true;
        });

        return () => subscription.remove();
    }, [open]);

    const current = (name) => route.name === name;
    const nav = (name) => {
        setOpen(false);
        go(name);
    };

    return (
        <View style={s.headerSafe}>
            <View style={s.header}>
                <View style={s.headerRow}>
                    <Pressable
                        accessibilityRole="link"
                        accessibilityLabel="Innov'Events - Accueil"
                        onPress={() => nav('home')}
                        style={s.brand}
                    >
                        <View style={s.brandMark}>
                            <MaterialCommunityIcons name="star-four-points" size={18} color="#fff" />
                        </View>
                        <Text style={s.brandText}>Innov'Events</Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: open }}
                        onPress={() => setOpen(!open)}
                        style={s.toggle}
                    >
                        <Feather name="menu" size={18} color={colors.text} />
                        <Text style={s.toggleText}>Menu</Text>
                    </Pressable>
                </View>

                {open ? (
                    <ScrollView
                        style={{ maxHeight: Math.max(240, height - 160) }}
                        contentContainerStyle={s.nav}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={s.navList}>
                            {NAV_LINKS.map((l) => (
                                <NavLink
                                    key={l.route}
                                    label={l.label}
                                    active={current(l.route)}
                                    onPress={() => nav(l.route)}
                                />
                            ))}
                        </View>

                        <View style={s.navActions}>
                            <Btn
                                full
                                label="Demande de devis"
                                active={current('quote')}
                                onPress={() => nav('quote')}
                            />

                            {session ? (
                                <>
                                    <NavLink
                                        label="Tableau de bord"
                                        active={current('dashboard')}
                                        onPress={() => nav('dashboard')}
                                    />
                                    {session.firstname ? (
                                        <View style={s.userChip}>
                                            <View style={s.avatar}>
                                                <Text style={s.avatarText}>{session.firstname.charAt(0).toUpperCase()}</Text>
                                            </View>
                                            <Text style={s.userName}>{session.firstname}</Text>
                                        </View>
                                    ) : null}
                                    <Btn
                                        full
                                        small
                                        variant="outline"
                                        label="Déconnexion"
                                        onPress={() => {
                                            setOpen(false);
                                            logout();
                                        }}
                                    />
                                </>
                            ) : (
                                <>
                                    <NavLink label="Connexion" active={current('login')} onPress={() => nav('login')} />
                                    <NavLink
                                        label="Inscription"
                                        active={current('register')}
                                        onPress={() => nav('register')}
                                    />
                                </>
                            )}
                        </View>
                    </ScrollView>
                ) : null}
            </View>
        </View>
    );
}

export function Footer() {
    const { go } = useApp();

    return (
        <View style={s.footer}>
            <View>
                <Text style={s.footerBrand}>Innov'Events</Text>
                <Text style={s.footerText}>Agence événementielle haut de gamme.</Text>
            </View>

            <View style={s.footerLinks}>
                {FOOTER_LINKS.map((l) => (
                    <Pressable key={l.route} accessibilityRole="link" onPress={() => go(l.route)} style={s.footerLink}>
                        <Text style={s.footerLinkText}>{l.label}</Text>
                    </Pressable>
                ))}
            </View>

            <Text style={s.footerText}>© {new Date().getFullYear()} Innov'Events</Text>
        </View>
    );
}

// Écran type : en-tête fixe, contenu défilant, pied de page (comme main + footer sur le site).
export function Page({ children, scrollRef }) {
    return (
        <View style={s.screen}>
            <Header />
            <ScrollView
                ref={scrollRef}
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                automaticallyAdjustKeyboardInsets
            >
                <View style={s.main}>{children}</View>
                <Footer />
            </ScrollView>
        </View>
    );
}

const WIDTHS = { narrow: 600, medium: 860, default: 1160 };

export function Container({ children, size = 'default', style, innerRef }) {
    return (
        <View ref={innerRef} collapsable={false} style={[s.container, { maxWidth: WIDTHS[size] || WIDTHS.default }, style]}>
            {children}
        </View>
    );
}

export function PageHead({ eyebrow, title, lead, back = true }) {
    const { go } = useApp();

    return (
        <View style={s.pageHead}>
            {back ? (
                <Pressable accessibilityRole="link" onPress={() => go('home')} style={s.back}>
                    <Text style={s.backText}>← Retour à l'accueil</Text>
                </Pressable>
            ) : null}
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <H1>{title}</H1>
            {lead ? <Lead>{lead}</Lead> : null}
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    main: { flexGrow: 1 },
    container: {
        width: '100%',
        alignSelf: 'center',
        paddingTop: 24,
        paddingHorizontal: GUTTER,
        paddingBottom: 48
    },
    pageHead: { paddingTop: 24, paddingBottom: 28 },
    back: { alignSelf: 'flex-start', paddingVertical: 10, marginBottom: 6 },
    backText: { fontFamily: fonts.body, fontSize: 16, fontWeight: '700', color: colors.brandDark },

    headerSafe: {
        backgroundColor: '#fff',
        paddingTop: TOP_INSET,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        zIndex: 10,
        ...shadowSm
    },
    header: { minHeight: 72, paddingVertical: 11.2, paddingHorizontal: GUTTER, justifyContent: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 9.6, minHeight: 44 },
    brandMark: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: colors.brand
    },
    brandText: {
        fontFamily: fonts.display,
        fontSize: 22.4,
        fontWeight: '700',
        letterSpacing: -0.22,
        color: colors.text
    },
    toggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        paddingVertical: 8,
        paddingHorizontal: 14.4,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: colors.fieldBorder,
        borderRadius: 10
    },
    toggleText: { fontFamily: fonts.body, fontSize: 16, fontWeight: '700', color: colors.text },

    nav: {
        gap: 12,
        paddingTop: 12,
        paddingBottom: 16,
        marginTop: 11.2,
        borderTopWidth: 1,
        borderTopColor: colors.line
    },
    navList: { gap: 3.2 },
    navActions: { gap: 8 },
    navLink: { justifyContent: 'center', minHeight: 44, paddingVertical: 12, paddingHorizontal: 13.6, borderRadius: radius.sm },
    navLinkOn: { backgroundColor: colors.brandSoft },
    navLinkText: { fontFamily: fonts.body, fontSize: 15.2, fontWeight: '700', color: colors.text },
    navLinkTextOn: { color: colors.brandDark },
    userChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        paddingVertical: 3.2,
        paddingLeft: 4,
        paddingRight: 12,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.pill
    },
    avatar: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: colors.brand
    },
    avatarText: { fontFamily: fonts.body, fontSize: 13.6, fontWeight: '700', color: '#fff' },
    userName: { fontFamily: fonts.body, fontSize: 14.4, fontWeight: '700', color: colors.text },

    footer: {
        gap: 20,
        paddingTop: 32,
        paddingHorizontal: GUTTER,
        paddingBottom: Platform.select({ ios: 48, android: 56, default: 32 }),
        backgroundColor: colors.brandDeep
    },
    footerBrand: { fontFamily: fonts.display, fontSize: 20, fontWeight: '700', color: '#fff' },
    footerText: { fontFamily: fonts.body, fontSize: 14.4, lineHeight: 22, color: '#eadfd2' },
    footerLinks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20 },
    footerLink: { paddingVertical: 8 },
    footerLinkText: {
        fontFamily: fonts.body,
        fontSize: 14.4,
        color: '#f6efe7',
        textDecorationLine: 'underline'
    }
});
