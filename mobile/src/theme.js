import { Platform, StatusBar } from 'react-native';
import Constants from 'expo-constants';

// Mêmes valeurs que les variables CSS du site (frontend/css/style.css).
export const colors = {
    bg: '#f7f3ee',
    bgAlt: '#f0e8de',
    text: '#1e1e24',
    muted: '#5f5851',
    brand: '#946b4b',
    brandDark: '#7a5539',
    brandDeep: '#3f2c1e',
    brandSoft: '#f3e9de',
    card: '#ffffff',
    line: '#e7ded3',
    fieldBorder: '#94897d',
    placeholder: '#7b736b',
    success: '#25623a',
    successBg: '#e8f3ea',
    successLine: '#b9d9c1',
    danger: '#9b2c2c',
    dangerBg: '#fbeaea',
    dangerLine: '#efc2c2',
    dangerDark: '#7f2222',
    warning: '#7d5200',
    warningBg: '#fdf3dc',
    warningLine: '#ebd49a',
    info: '#5a4636',
    infoBg: '#f3ece4',
    infoLine: '#dccdbd',
    neutralBg: '#f1ede8',
    neutralLine: '#ddd5cb'
};

export const TONES = {
    info: { color: colors.info, bg: colors.infoBg, line: colors.infoLine },
    success: { color: colors.success, bg: colors.successBg, line: colors.successLine },
    warning: { color: colors.warning, bg: colors.warningBg, line: colors.warningLine },
    danger: { color: colors.danger, bg: colors.dangerBg, line: colors.dangerLine },
    neutral: { color: colors.muted, bg: colors.neutralBg, line: colors.neutralLine }
};

export const radius = { sm: 8, field: 10, md: 14, lg: 22, pill: 999 };

// Charte : Arial pour le texte, empattement (Georgia) pour les titres.
export const fonts = {
    body: Platform.select({ ios: 'Arial', android: 'sans-serif', default: 'Arial, Helvetica, sans-serif' }),
    display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' })
};

export const shadowSm = Platform.select({
    web: { boxShadow: '0 1px 2px rgba(63, 44, 30, 0.06), 0 2px 10px rgba(63, 44, 30, 0.06)' },
    default: {
        shadowColor: '#3f2c1e',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2
    }
});

export const shadowLg = Platform.select({
    web: { boxShadow: '0 12px 32px rgba(63, 44, 30, 0.14)' },
    default: {
        shadowColor: '#3f2c1e',
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8
    }
});

export const GUTTER = 16;

// Hauteur de la barre d'état (encoche comprise) : l'en-tête blanc passe dessous, le contenu commence après.
export const TOP_INSET = Platform.select({
    android: StatusBar.currentHeight || 0,
    ios: Constants.statusBarHeight || 0,
    default: 0
});
