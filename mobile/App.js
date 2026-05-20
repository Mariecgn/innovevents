import React, { useEffect, useState } from 'react';

import {
    SafeAreaView,
    Text,
    View,
    Pressable,
    TextInput,
    Linking,
    FlatList,
    StyleSheet
} from 'react-native';

const API_URL = 'http://localhost:3000/api/events';

export default function App() {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(API_URL)
            .then((res) => res.json())
            .then((data) => {
                const formattedEvents = data.map((event) => ({
                    id: String(event.id),
                    name: event.name,
                    date: event.start_at || 'Date non renseignée',
                    location: event.location || 'Lieu non renseigné',
                    status: event.status || 'À venir',
                    client: {
                        name: event.client_company || 'Client',
                        company: event.client_company || 'Entreprise',
                        phone: '0600000000',
                        email: 'contact@innovevents.com',
                        address: event.location || 'Paris'
                    }
                }));

                setEvents(formattedEvents);
            })
            .catch((error) => {
                console.error(error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (selectedEvent) {
        return (
            <SafeAreaView style={styles.container}>
                <Pressable onPress={() => setSelectedEvent(null)}>
                    <Text style={styles.back}>← Retour</Text>
                </Pressable>

                <View style={styles.card}>
                    <Text style={styles.badge}>{selectedEvent.status}</Text>
                    <Text style={styles.title}>{selectedEvent.name}</Text>
                    <Text style={styles.meta}>
                        {selectedEvent.date} • {selectedEvent.location}
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Client</Text>
                    <Text style={styles.client}>{selectedEvent.client.name}</Text>
                    <Text>{selectedEvent.client.company}</Text>

                    <View style={styles.row}>
                        <Pressable
                            style={styles.button}
                            onPress={() =>
                                Linking.openURL(`tel:${selectedEvent.client.phone}`)
                            }
                        >
                            <Text style={styles.buttonText}>Appeler</Text>
                        </Pressable>

                        <Pressable
                            style={styles.button}
                            onPress={() =>
                                Linking.openURL(`mailto:${selectedEvent.client.email}`)
                            }
                        >
                            <Text style={styles.buttonText}>Email</Text>
                        </Pressable>

                        <Pressable
                            style={styles.button}
                            onPress={() =>
                                Linking.openURL(
                                    `https://maps.google.com/?q=${encodeURIComponent(
                                        selectedEvent.client.address
                                    )}`
                                )
                            }
                        >
                            <Text style={styles.buttonText}>Itinéraire</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Note rapide</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Ajouter une note..."
                        value={note}
                        onChangeText={setNote}
                        multiline
                    />

                    <Pressable
                        style={styles.saveButton}
                        onPress={() => alert(`Note enregistrée : ${note}`)}
                    >
                        <Text style={styles.saveText}>Enregistrer</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.appTitle}>Innov'Events Mobile</Text>

            <Text style={styles.subtitle}>
                Événements récupérés depuis l’API Express et la base MariaDB
            </Text>

            {loading ? (
                <Text>Chargement des événements...</Text>
            ) : events.length === 0 ? (
                <View style={styles.card}>
                    <Text style={styles.title}>Aucun événement public</Text>
                    <Text style={styles.meta}>
                        Ajoute un événement public en base pour l’afficher ici.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.card}
                            onPress={() => setSelectedEvent(item)}
                        >
                            <Text style={styles.badge}>{item.status}</Text>
                            <Text style={styles.title}>{item.name}</Text>
                            <Text style={styles.meta}>
                                {item.date} • {item.location}
                            </Text>
                            <Text style={styles.meta}>
                                Client : {item.client.company}
                            </Text>
                        </Pressable>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f3ee',
        padding: 24
    },

    appTitle: {
        fontSize: 30,
        fontWeight: 'bold',
        marginTop: 30,
        color: '#1e1e24'
    },

    subtitle: {
        color: '#666',
        marginBottom: 24
    },

    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 18,
        marginBottom: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    },

    badge: {
        alignSelf: 'flex-start',
        backgroundColor: '#946b4b',
        color: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        marginBottom: 10
    },

    title: {
        fontSize: 22,
        fontWeight: 'bold'
    },

    meta: {
        color: '#666',
        marginTop: 6
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10
    },

    client: {
        fontSize: 20,
        fontWeight: 'bold'
    },

    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16
    },

    button: {
        backgroundColor: '#1e1e24',
        padding: 12,
        borderRadius: 10
    },

    buttonText: {
        color: '#fff',
        fontWeight: 'bold'
    },

    input: {
        minHeight: 90,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 12,
        backgroundColor: '#fafafa'
    },

    saveButton: {
        backgroundColor: '#946b4b',
        padding: 14,
        borderRadius: 12,
        marginTop: 12
    },

    saveText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold'
    },

    back: {
        color: '#946b4b',
        fontWeight: 'bold',
        marginTop: 30,
        marginBottom: 14
    }
});