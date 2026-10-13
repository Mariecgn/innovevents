import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, fonts, radius, shadowLg, shadowSm, TONES } from './theme';
import { maskDate, maskTime } from './format';

/* ---------- Texte ---------- */

export function Txt({ style, ...props }) {
    return <Text {...props} style={[s.body, style]} />;
}

export function H1({ style, ...props }) {
    return <Text accessibilityRole="header" {...props} style={[s.h1, style]} />;
}

export function H2({ style, ...props }) {
    return <Text accessibilityRole="header" {...props} style={[s.h2, style]} />;
}

export function H3({ style, ...props }) {
    return <Text accessibilityRole="header" {...props} style={[s.h3, style]} />;
}

export function Eyebrow({ style, ...props }) {
    return <Text {...props} style={[s.eyebrow, style]} />;
}

export function Lead({ style, ...props }) {
    return <Text {...props} style={[s.lead, style]} />;
}

export function Muted({ style, ...props }) {
    return <Text {...props} style={[s.body, s.muted, style]} />;
}

export function Hint({ style, ...props }) {
    return <Text {...props} style={[s.hint, style]} />;
}

export function openLink(url) {
    Linking.openURL(url).catch(() => toast('error', "Impossible d'ouvrir ce lien sur cet appareil."));
}

// Lien dans un texte (mailto:, tel:, adresse web).
export function A({ href, children, style }) {
    return (
        <Text accessibilityRole="link" onPress={() => openLink(href)} style={[s.link, style]}>
            {children}
        </Text>
    );
}

export function LinkBtn({ label, onPress, style }) {
    return (
        <Pressable accessibilityRole="button" onPress={onPress} style={s.linkBtn}>
            <Text style={[s.linkBtnText, style]}>{label}</Text>
        </Pressable>
    );
}

/* ---------- Icônes (jeu Feather : celui des icônes du site) ---------- */

const FEATHER = {
    users: 'users',
    calendar: 'calendar',
    edit: 'edit',
    inbox: 'inbox',
    pin: 'map-pin',
    check: 'check-circle',
    xcircle: 'x-circle',
    alert: 'alert-circle',
    info: 'info',
    briefcase: 'briefcase',
    presentation: 'monitor',
    star: 'star',
    mail: 'mail',
    refresh: 'refresh-cw',
    message: 'message-square'
};

export function Icon({ name, size = 20, color = colors.brandDark, style }) {
    return <Feather name={FEATHER[name] || name} size={size} color={color} style={style} />;
}

export function IconBadge({ name, size = 48, iconSize = 24, style }) {
    return (
        <View style={[s.iconBadge, { width: size, height: size }, style]}>
            <Icon name={name} size={iconSize} />
        </View>
    );
}

/* ---------- Cartes, badges, alertes ---------- */

export function Card({ style, flat, flash, children, ...props }) {
    const Wrapper = flash ? FlashView : View;

    return (
        <Wrapper {...props} {...(flash ? { kind: flash } : {})} style={[s.card, !flat && shadowSm, style]}>
            {children}
        </Wrapper>
    );
}

export function Badge({ tone = 'info', children, style }) {
    const t = TONES[tone] || TONES.info;

    return (
        <View style={[s.badge, { backgroundColor: t.bg, borderColor: t.line }, style]}>
            <Text style={[s.badgeText, { color: t.color }]}>{children}</Text>
        </View>
    );
}

export function StatusBadge({ map, value }) {
    const status = map[value] || { label: value || '—', tone: 'neutral' };
    return <Badge tone={status.tone}>{status.label}</Badge>;
}

export function RoleBadge({ children }) {
    return (
        <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>{children}</Text>
        </View>
    );
}

export function CountPill({ value, style }) {
    return (
        <View style={[s.count, style]}>
            <Text style={s.countText}>{value}</Text>
        </View>
    );
}

const ALERT_ICONS = { success: 'check', error: 'alert', warning: 'alert', info: 'info' };

export function Alert({ type = 'info', message, children, style }) {
    const t = TONES[type === 'error' ? 'danger' : type] || TONES.info;

    return (
        <View
            accessibilityRole={type === 'error' ? 'alert' : undefined}
            style={[s.alert, { backgroundColor: t.bg, borderColor: t.line }, style]}
        >
            <Icon name={ALERT_ICONS[type] || 'info'} size={20} color={t.color} style={s.alertIcon} />
            <View style={s.alertBody}>
                <Text style={[s.alertText, { color: t.color }]}>{message}</Text>
                {children ? <View style={s.alertActions}>{children}</View> : null}
            </View>
        </View>
    );
}

export function EmptyState({ title, text, children }) {
    return (
        <View style={s.empty}>
            <Text style={s.emptyTitle}>{title}</Text>
            <Text style={s.emptyText}>{text}</Text>
            {children ? <View style={s.emptyActions}>{children}</View> : null}
        </View>
    );
}

export function Spinner({ size = 'small', color = colors.brand }) {
    return <ActivityIndicator size={size} color={color} />;
}

const pulse = new Animated.Value(0.45);
let pulseRunning = false;

function startPulse() {
    if (pulseRunning) return;
    pulseRunning = true;

    Animated.loop(
        Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: Platform.OS !== 'web' })
        ])
    ).start();
}

// Remplace le « shimmer » du site pendant le chargement des données.
export function Skeleton({ style }) {
    useEffect(startPulse, []);
    return <Animated.View accessibilityElementsHidden style={[s.skeleton, { opacity: pulse }, style]} />;
}

// Surlignage temporaire d'une carte nouvellement créée ou refusée (flash-success / flash-danger).
export function FlashView({ kind, style, children }) {
    const value = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!kind) return;

        value.setValue(1);
        Animated.timing(value, { toValue: 0, duration: 2600, useNativeDriver: false }).start();
    }, [kind, value]);

    const backgroundColor = value.interpolate({
        inputRange: [0, 1],
        outputRange: ['#ffffff', kind === 'refused' ? '#fbe9e9' : '#e3f3e7']
    });

    return <Animated.View style={[style, { backgroundColor }]}>{children}</Animated.View>;
}

/* ---------- Boutons ---------- */

const VARIANTS = {
    primary: { bg: colors.brand, border: colors.brand, color: '#fff', pressed: colors.brandDark },
    outline: { bg: 'transparent', border: colors.brand, color: colors.brandDark, pressed: colors.brandSoft },
    ghost: { bg: 'transparent', border: 'transparent', color: colors.brandDark, pressed: colors.brandSoft },
    light: { bg: '#fff', border: '#fff', color: colors.brandDeep, pressed: colors.brandSoft },
    danger: { bg: colors.danger, border: colors.danger, color: '#fff', pressed: colors.dangerDark },
    dangerOutline: { bg: 'transparent', border: colors.danger, color: colors.danger, pressed: colors.dangerBg }
};

export function Btn({
    label,
    onPress,
    variant = 'primary',
    small,
    busy,
    busyLabel,
    disabled,
    full,
    center,
    active,
    style,
    accessibilityLabel
}) {
    const v = VARIANTS[variant] || VARIANTS.primary;
    const off = Boolean(disabled || busy);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled: off, busy: Boolean(busy) }}
            disabled={off}
            onPress={onPress}
            style={({ pressed }) => [
                s.btn,
                small && s.btnSm,
                full && s.btnFull,
                center && s.btnCenter,
                {
                    backgroundColor: pressed || active ? v.pressed : v.bg,
                    borderColor: variant === 'outline' && (pressed || active) ? colors.brandDark : v.border
                },
                off && s.btnOff,
                style
            ]}
        >
            {busy ? <ActivityIndicator size="small" color={v.color} /> : null}
            <Text style={[s.btnText, small && s.btnTextSm, { color: v.color }]}>
                {busy && busyLabel ? busyLabel : label}
            </Text>
        </Pressable>
    );
}

export function Chip({ label, count, pressed, onPress }) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(pressed) }}
            onPress={onPress}
            style={[s.chip, pressed && s.chipOn]}
        >
            <Text style={[s.chipText, pressed && s.chipTextOn]}>{label}</Text>
            {count !== undefined ? (
                <View style={[s.chipCount, pressed && s.chipCountOn]}>
                    <Text style={[s.chipCountText, pressed && s.chipTextOn]}>{count}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}

/* ---------- Formulaires ---------- */

export function Field({ label, required, hint, error, children, style }) {
    return (
        <View style={[s.field, style]}>
            {label ? (
                <Text style={s.label}>
                    {label}
                    {required ? <Text style={s.req}> *</Text> : null}
                </Text>
            ) : null}
            {children}
            {hint ? <Text style={s.hint}>{hint}</Text> : null}
            {error ? (
                <Text accessibilityRole="alert" style={s.fieldError}>
                    {error}
                </Text>
            ) : null}
        </View>
    );
}

export function Input({ label, required, hint, error, inputRef, right, multiline, style, fieldStyle, ...props }) {
    const [focus, setFocus] = useState(false);

    const input = (
        <TextInput
            ref={inputRef}
            accessibilityLabel={label}
            placeholderTextColor={colors.placeholder}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            style={[
                s.input,
                multiline && s.textarea,
                focus && s.inputFocus,
                error ? s.inputError : null,
                right ? s.inputGrow : null,
                style
            ]}
            {...props}
        />
    );

    return (
        <Field label={label} required={required} hint={hint} error={error} style={fieldStyle}>
            {right ? (
                <View style={s.group}>
                    {input}
                    {right}
                </View>
            ) : (
                input
            )}
        </Field>
    );
}

export function PasswordInput(props) {
    const [show, setShow] = useState(false);

    return (
        <Input
            {...props}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            right={
                <Btn
                    variant="outline"
                    label={show ? 'Masquer' : 'Afficher'}
                    onPress={() => setShow(!show)}
                    style={s.groupBtn}
                />
            }
        />
    );
}

export function DateField({ onChangeText, ...props }) {
    return (
        <Input
            keyboardType="number-pad"
            maxLength={10}
            placeholder="JJ/MM/AAAA"
            autoCorrect={false}
            {...props}
            onChangeText={(text) => onChangeText(maskDate(text))}
        />
    );
}

export function TimeField({ onChangeText, ...props }) {
    return (
        <Input
            keyboardType="number-pad"
            maxLength={5}
            placeholder="HH:MM"
            autoCorrect={false}
            {...props}
            onChangeText={(text) => onChangeText(maskTime(text))}
        />
    );
}

export function Select({ label, required, hint, error, value, options, onChange }) {
    const [open, setOpen] = useState(false);
    const current = options.find((o) => String(o.value) === String(value));

    return (
        <>
            <Field label={label} required={required} hint={hint} error={error}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    onPress={() => setOpen(true)}
                    style={[s.input, s.select, error ? s.inputError : null]}
                >
                    <Text numberOfLines={1} style={s.selectText}>
                        {current ? current.label : ''}
                    </Text>
                    <Feather name="chevron-down" size={18} color={colors.muted} />
                </Pressable>
            </Field>

            <Dialog visible={open} onClose={() => setOpen(false)}>
                <View style={s.dialogBody}>
                    <Text style={s.selectTitle}>{label}</Text>
                    {options.map((o) => {
                        const on = String(o.value) === String(value);

                        return (
                            <Pressable
                                key={String(o.value)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: on }}
                                onPress={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                                style={[s.option, on && s.optionOn]}
                            >
                                <Text style={[s.optionText, on && s.optionTextOn]}>{o.label}</Text>
                                {on ? <Feather name="check" size={18} color={colors.brandDark} /> : null}
                            </Pressable>
                        );
                    })}
                </View>
            </Dialog>
        </>
    );
}

/* ---------- Fenêtres de dialogue ---------- */

export function Dialog({ visible, onClose, wide, dismissable = true, children }) {
    const close = () => {
        if (dismissable && onClose) onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.backdrop}>
                <Pressable accessibilityLabel="Fermer" style={StyleSheet.absoluteFill} onPress={close} />
                <View style={[s.dialog, wide && s.dialogWide]}>
                    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" bounces={false}>
                        {children}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export function DialogBody({ children, style }) {
    return <View style={[s.dialogBody, style]}>{children}</View>;
}

export function DialogTitle({ children }) {
    return (
        <Text accessibilityRole="header" style={s.dialogTitle}>
            {children}
        </Text>
    );
}

export function DialogActions({ children }) {
    return <View style={s.dialogActions}>{children}</View>;
}

/* ---------- Blocs de page ---------- */

export function SectionHead({ eyebrow, title, text, right, style }) {
    return (
        <View style={[s.sectionHead, style]}>
            <View style={s.sectionHeadMain}>
                {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
                <H2 style={s.sectionTitle}>{title}</H2>
                {text ? <Muted style={s.sectionText}>{text}</Muted> : null}
            </View>
            {right}
        </View>
    );
}

export function StatCard({ icon, value, label, hint }) {
    return (
        <Card style={s.stat}>
            <IconBadge name={icon} size={52} style={{ marginBottom: 0 }} />
            <View style={s.statBody}>
                <Text style={s.statValue}>{value}</Text>
                <Text style={s.statLabel}>{label}</Text>
                {hint ? <Text style={s.statHint}>{hint}</Text> : null}
            </View>
        </Card>
    );
}

export function MetaLine({ icon, children }) {
    return (
        <View style={s.metaLine}>
            <Icon name={icon} size={16} style={s.metaIcon} />
            <Text style={s.metaText}>{children}</Text>
        </View>
    );
}

// Équivalent de <details><summary> : un titre qui déplie son contenu.
export function Details({ summary, children }) {
    const [open, setOpen] = useState(false);

    return (
        <View>
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpen(!open)}
                style={s.summary}
            >
                <Feather name={open ? 'chevron-down' : 'chevron-right'} size={16} color={colors.brandDark} />
                <Text style={s.summaryText}>{summary}</Text>
            </Pressable>
            {open ? <View style={s.detailsBody}>{children}</View> : null}
        </View>
    );
}

// Tableau « empilé » du site sur mobile : une carte par ligne, chaque cellule avec son libellé.
export function DataTable({ children }) {
    return <View style={s.table}>{children}</View>;
}

export function DataRow({ children, last, flash }) {
    const Wrapper = flash ? FlashView : View;

    return (
        <Wrapper {...(flash ? { kind: flash } : {})} style={[s.dataRow, last && s.dataRowLast]}>
            {children}
        </Wrapper>
    );
}

export function DataCell({ label, children, align = 'right', strong }) {
    return (
        <View style={s.cell}>
            <Text style={s.cellLabel}>{label}</Text>
            <View style={[s.cellValue, align === 'left' && { alignItems: 'flex-start' }]}>
                {typeof children === 'string' || typeof children === 'number' ? (
                    <Text style={[s.cellText, strong && s.cellStrong]}>{children}</Text>
                ) : (
                    children
                )}
            </View>
        </View>
    );
}

export function Totals({ ht, tva, ttc }) {
    return (
        <View style={s.totals}>
            <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Total HT</Text>
                <Text style={s.totalsValue}>{ht}</Text>
            </View>
            <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>TVA (20 %)</Text>
                <Text style={s.totalsValue}>{tva}</Text>
            </View>
            <View style={[s.totalsRow, s.totalsTtc]}>
                <Text style={[s.totalsLabel, s.totalsTtcLabel]}>Total TTC</Text>
                <Text style={[s.totalsValue, s.totalsTtcValue]}>{ttc}</Text>
            </View>
        </View>
    );
}

/* ---------- Notifications éphémères (toast) ---------- */

let toastSeq = 0;
let toasts = [];
const listeners = new Set();

function emit() {
    listeners.forEach((listener) => listener(toasts));
}

function dismiss(id) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
}

export function toast(type, message, { duration } = {}) {
    const id = ++toastSeq;
    toasts = [...toasts, { id, type, message }];
    emit();

    const ms = duration === undefined ? (type === 'error' ? 12000 : 8000) : duration;
    if (ms > 0) setTimeout(() => dismiss(id), ms);
}

const TOAST_BORDER = { success: colors.success, error: colors.danger, info: colors.brand };

export function ToastHost() {
    const [items, setItems] = useState(toasts);

    useEffect(() => {
        listeners.add(setItems);
        return () => listeners.delete(setItems);
    }, []);

    if (!items.length) return null;

    return (
        <View style={[s.toastRegion, { pointerEvents: 'box-none' }]}>
            {items.map((t) => (
                <View
                    key={t.id}
                    accessibilityRole={t.type === 'error' ? 'alert' : undefined}
                    style={[s.toast, { borderLeftColor: TOAST_BORDER[t.type] || colors.brand }]}
                >
                    <Icon
                        name={ALERT_ICONS[t.type] || 'info'}
                        size={20}
                        color={TOAST_BORDER[t.type] || colors.brand}
                        style={s.alertIcon}
                    />
                    <Text style={s.toastMsg}>{t.message}</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Fermer ce message"
                        onPress={() => dismiss(t.id)}
                        hitSlop={8}
                        style={s.toastClose}
                    >
                        <Text style={s.toastCloseText}>×</Text>
                    </Pressable>
                </View>
            ))}
        </View>
    );
}

/* ---------- Styles ---------- */

const webNoOutline = Platform.select({ web: { outlineStyle: 'none' }, default: {} });

const s = StyleSheet.create({
    body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25.6, color: colors.text },
    muted: { color: colors.muted },
    h1: {
        fontFamily: fonts.display,
        fontSize: 32,
        lineHeight: 38.4,
        fontWeight: '700',
        letterSpacing: -0.32,
        color: colors.text,
        marginBottom: 16
    },
    h2: {
        fontFamily: fonts.display,
        fontSize: 23.2,
        lineHeight: 27.8,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 11.6
    },
    h3: {
        fontFamily: fonts.display,
        fontSize: 19.2,
        lineHeight: 23,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 9.6
    },
    eyebrow: {
        fontFamily: fonts.body,
        fontSize: 12.5,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: colors.brandDark,
        marginBottom: 9.6
    },
    lead: { fontFamily: fonts.body, fontSize: 17.6, lineHeight: 28.2, color: colors.muted },
    hint: { fontFamily: fonts.body, fontSize: 13.6, lineHeight: 20, color: colors.muted },
    link: { color: colors.brandDark, textDecorationLine: 'underline' },
    linkBtn: { paddingVertical: 11, paddingHorizontal: 4, alignSelf: 'flex-start' },
    linkBtnText: {
        fontFamily: fonts.body,
        fontSize: 16,
        fontWeight: '700',
        color: colors.brandDark,
        textDecorationLine: 'underline'
    },

    iconBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brandSoft,
        borderRadius: 14,
        marginBottom: 6.4
    },
    card: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.md,
        padding: 24
    },
    badge: {
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingVertical: 3.2,
        paddingHorizontal: 10.4
    },
    badgeText: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 17.5, fontWeight: '700' },
    roleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.brandDeep,
        borderColor: colors.brandDeep,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingVertical: 4.8,
        paddingHorizontal: 13.6
    },
    roleBadgeText: {
        fontFamily: fonts.body,
        fontSize: 12.8,
        fontWeight: '700',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        color: '#fff'
    },
    count: {
        minWidth: 24,
        paddingHorizontal: 6.4,
        borderRadius: radius.pill,
        backgroundColor: 'rgba(148, 107, 75, 0.16)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    countText: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 20, fontWeight: '700', color: colors.brandDark },
    alert: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 14.4,
        paddingHorizontal: 17.6,
        borderWidth: 1,
        borderRadius: radius.md
    },
    alertIcon: { marginTop: 2 },
    alertBody: { flex: 1 },
    alertText: { fontFamily: fonts.body, fontSize: 15.2, lineHeight: 23 },
    alertActions: { marginTop: 9.6, alignItems: 'flex-start' },
    empty: {
        alignItems: 'center',
        gap: 6.4,
        paddingVertical: 36,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#cdbfae',
        borderRadius: radius.md
    },
    emptyTitle: {
        fontFamily: fonts.display,
        fontSize: 18.4,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center'
    },
    emptyText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.muted, textAlign: 'center' },
    emptyActions: { alignSelf: 'center', marginTop: 8 },
    skeleton: { minHeight: 16, backgroundColor: '#efe7de', borderRadius: 8 },

    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        minHeight: 44,
        paddingVertical: 9.6,
        paddingHorizontal: 20.8,
        borderWidth: 1.5,
        borderRadius: radius.field
    },
    btnSm: { paddingVertical: 6.4, paddingHorizontal: 15.2 },
    btnFull: { alignSelf: 'stretch' },
    btnCenter: { alignSelf: 'center' },
    btnOff: { opacity: 0.6 },
    btnText: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 18.6, fontWeight: '700', textAlign: 'center' },
    btnTextSm: { fontSize: 14.4, lineHeight: 17.3 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 40,
        paddingVertical: 6.4,
        paddingHorizontal: 15.2,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: colors.line,
        borderRadius: radius.pill
    },
    chipOn: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
    chipText: { fontFamily: fonts.body, fontSize: 14.7, fontWeight: '700', color: colors.brandDark },
    chipTextOn: { color: '#fff' },
    chipCount: {
        minWidth: 24,
        paddingHorizontal: 6.4,
        borderRadius: radius.pill,
        backgroundColor: 'rgba(148, 107, 75, 0.16)',
        alignItems: 'center'
    },
    chipCountOn: { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
    chipCountText: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 20, fontWeight: '700', color: colors.brandDark },

    field: { gap: 6.4 },
    label: { fontFamily: fonts.body, fontSize: 14.7, lineHeight: 21, fontWeight: '700', color: colors.text },
    req: { color: colors.danger },
    fieldError: { fontFamily: fonts.body, fontSize: 13.6, lineHeight: 20, fontWeight: '600', color: colors.danger },
    input: {
        minHeight: 46,
        paddingVertical: 11.2,
        paddingHorizontal: 14.4,
        fontFamily: fonts.body,
        fontSize: 16,
        color: colors.text,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.fieldBorder,
        borderRadius: radius.field,
        ...webNoOutline
    },
    inputFocus: Platform.select({
        web: { borderColor: colors.brandDark, boxShadow: '0 0 0 4px rgba(148, 107, 75, 0.2)' },
        default: { borderColor: colors.brandDark, borderWidth: 1.5 }
    }),
    inputError: { borderColor: colors.danger, backgroundColor: '#fffafa' },
    inputGrow: { flex: 1, minWidth: 0 },
    textarea: { minHeight: 140, paddingTop: 11.2 },
    group: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
    groupBtn: { alignSelf: 'stretch', minHeight: 46 },
    select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    selectText: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text },
    selectTitle: { fontFamily: fonts.display, fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 48,
        paddingHorizontal: 14,
        borderRadius: radius.field
    },
    optionOn: { backgroundColor: colors.brandSoft },
    optionText: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text },
    optionTextOn: { fontWeight: '700', color: colors.brandDark },

    backdrop: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: 'rgba(30, 22, 14, 0.55)'
    },
    dialog: {
        width: '100%',
        maxWidth: 520,
        maxHeight: '90%',
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderRadius: radius.lg,
        ...shadowLg
    },
    dialogWide: { maxWidth: 760 },
    dialogBody: { gap: 14.4, paddingTop: 28, paddingHorizontal: 28, paddingBottom: 16 },
    dialogTitle: {
        fontFamily: fonts.display,
        fontSize: 23.2,
        lineHeight: 28,
        fontWeight: '700',
        color: colors.text
    },
    dialogActions: { gap: 12, paddingTop: 8, paddingHorizontal: 28, paddingBottom: 24 },

    sectionHead: { gap: 16, marginBottom: 17.6 },
    sectionHeadMain: {},
    sectionTitle: { marginBottom: 0 },
    sectionText: { marginTop: 6, marginBottom: 0 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20, paddingHorizontal: 21.6 },
    statBody: { flex: 1, minWidth: 0 },
    statValue: {
        fontFamily: fonts.display,
        fontSize: 30.4,
        lineHeight: 32,
        fontWeight: '700',
        color: colors.text
    },
    statLabel: { marginTop: 4.8, fontFamily: fonts.body, fontSize: 14.7, lineHeight: 21, fontWeight: '700', color: colors.text },
    statHint: { marginTop: 1.6, fontFamily: fonts.body, fontSize: 12.8, lineHeight: 18, color: colors.muted },
    metaLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    metaIcon: { marginTop: 4 },
    metaText: { flex: 1, fontFamily: fonts.body, fontSize: 14.9, lineHeight: 24, color: colors.muted },
    summary: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
    summaryText: { fontFamily: fonts.body, fontSize: 14.9, fontWeight: '700', color: colors.brandDark },
    detailsBody: { marginTop: 4 },

    table: {
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.md,
        ...shadowSm
    },
    dataRow: { paddingVertical: 9.6, borderBottomWidth: 1, borderBottomColor: colors.line },
    dataRowLast: { borderBottomWidth: 0 },
    cell: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 5.6, paddingHorizontal: 16 },
    cellLabel: {
        fontFamily: fonts.body,
        fontSize: 12,
        lineHeight: 20,
        fontWeight: '700',
        letterSpacing: 0.72,
        textTransform: 'uppercase',
        color: colors.muted
    },
    cellValue: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
    cellText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text, textAlign: 'right' },
    cellStrong: { fontWeight: '700' },

    totals: { gap: 5.6 },
    totalsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    totalsLabel: { fontFamily: fonts.body, fontSize: 16, color: colors.muted },
    totalsValue: { fontFamily: fonts.body, fontSize: 16, fontWeight: '700', color: colors.text },
    totalsTtc: {
        paddingVertical: 8.8,
        paddingHorizontal: 12.8,
        backgroundColor: colors.brandDeep,
        borderRadius: radius.sm
    },
    totalsTtcLabel: { color: '#f3e9de' },
    totalsTtcValue: { color: '#fff' },

    toastRegion: { position: 'absolute', left: 12, right: 12, bottom: 24, gap: 9.6, zIndex: 1000 },
    toast: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 14.4,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.line,
        borderLeftWidth: 5,
        borderRadius: radius.md,
        ...shadowLg
    },
    toastMsg: { flex: 1, fontFamily: fonts.body, fontSize: 15.2, lineHeight: 23, color: colors.text },
    toastClose: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
    toastCloseText: { fontSize: 22, lineHeight: 24, color: colors.muted }
});
