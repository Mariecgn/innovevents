import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Adresse du PC qui sert l'API. Sur téléphone (Expo Go), "localhost" désigne le téléphone :
// on reprend donc l'adresse du serveur de développement Expo, qui est celle du PC.
// Pour forcer une adresse : $env:EXPO_PUBLIC_API_URL = "http://192.168.1.16:3000/api"
function lanHost() {
    if (Platform.OS === 'web') {
        return (
            (typeof window !== 'undefined' && window.location && window.location.hostname) ||
            'localhost'
        );
    }

    const hostUri =
        (Constants.expoConfig && Constants.expoConfig.hostUri) ||
        (Constants.expoGoConfig && Constants.expoGoConfig.debuggerHost) ||
        '';

    return hostUri.split(':')[0] || 'localhost';
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${lanHost()}:3000/api`;

export const SITE_URL = API_URL.replace(/\/api\/?$/, '');
