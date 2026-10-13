import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useApp } from '../context';
import { Container, Page, PageHead } from '../layout';
import { Btn, Card, H2, IconBadge, Muted, openLink } from '../ui';

export default function Contact() {
    const { go } = useApp();

    return (
        <Page>
            <Container size="medium">
                <PageHead
                    eyebrow="Parlons de votre projet"
                    title="Contact"
                    lead="Une question, un projet d'événement ? Choisissez le moyen le plus simple pour nous joindre."
                />

                <View style={s.grid}>
                    <Card style={s.feature}>
                        <IconBadge name="mail" />
                        <H2 style={s.title}>Écrivez-nous</H2>
                        <Muted>Pour toute question, contactez l'agence par e-mail.</Muted>
                        <Btn small label="contact@innovevents.com" onPress={() => openLink('mailto:contact@innovevents.com')} />
                    </Card>

                    <Card style={s.feature}>
                        <IconBadge name="edit" />
                        <H2 style={s.title}>Parlez-nous de votre projet</H2>
                        <Muted>
                            Le formulaire de demande de devis nous permet de vous recontacter avec toutes les informations
                            utiles.
                        </Muted>
                        <Btn small variant="outline" label="Faire une demande de devis" onPress={() => go('quote')} />
                    </Card>
                </View>
            </Container>
        </Page>
    );
}

const s = StyleSheet.create({
    grid: { gap: 16 },
    feature: { gap: 8 },
    title: { fontSize: 19.2, lineHeight: 23, marginBottom: 0 }
});
