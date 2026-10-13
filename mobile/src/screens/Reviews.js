import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useApp } from '../context';
import { Container, Page, PageHead } from '../layout';
import { Btn, Card, H2, IconBadge, Muted } from '../ui';

export default function Reviews() {
    const { go } = useApp();

    return (
        <Page>
            <Container size="medium">
                <PageHead
                    eyebrow="Témoignages"
                    title="Avis clients"
                    lead="Les avis laissés par nos clients après leur événement."
                />

                <Card style={s.state}>
                    <IconBadge name="message" />
                    <H2 style={s.title}>Aucun avis à afficher pour le moment</H2>
                    <Muted style={s.text}>
                        Les avis clients seront publiés ici après validation par l'équipe Innov'Events. Cette
                        fonctionnalité n'est pas encore disponible dans cette version du site.
                    </Muted>
                    <View style={s.actions}>
                        <Btn center label="Découvrir nos événements" onPress={() => go('events')} />
                        <Btn center variant="outline" label="Demander un devis" onPress={() => go('quote')} />
                    </View>
                </Card>
            </Container>
        </Page>
    );
}

const s = StyleSheet.create({
    state: { alignItems: 'center', padding: 28 },
    title: { textAlign: 'center' },
    text: { textAlign: 'center' },
    actions: { alignItems: 'center', gap: 12, marginTop: 20 }
});
