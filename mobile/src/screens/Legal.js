import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Container, Page, PageHead } from '../layout';
import { colors, fonts } from '../theme';
import { A, Alert, Card } from '../ui';

function Em({ children }) {
    return <Text style={s.em}>{children}</Text>;
}

function Strong({ children }) {
    return <Text style={s.strong}>{children}</Text>;
}

function P({ children }) {
    return <Text style={s.p}>{children}</Text>;
}

function Title({ children, first }) {
    return (
        <Text accessibilityRole="header" style={[s.h2, first && s.h2First]}>
            {children}
        </Text>
    );
}

function Ul({ children }) {
    return <View style={s.ul}>{children}</View>;
}

function Li({ children }) {
    return (
        <View style={s.li}>
            <Text style={s.bullet}>•</Text>
            <Text style={s.liText}>{children}</Text>
        </View>
    );
}

const TODO = <Em>à compléter</Em>;

export function Legal() {
    return (
        <Page>
            <Container size="medium">
                <PageHead eyebrow="Informations légales" title="Mentions légales" />

                <Alert
                    type="warning"
                    style={s.notice}
                    message="Page en cours de rédaction : les informations d'identification de l'éditeur doivent être complétées avant la mise en ligne du site."
                />

                <Card>
                    <Title first>Éditeur du site</Title>
                    <P>Innov'Events, agence événementielle.</P>
                    <Ul>
                        <Li>Raison sociale et forme juridique : {TODO}</Li>
                        <Li>Numéro SIRET : {TODO}</Li>
                        <Li>Adresse du siège : {TODO}</Li>
                        <Li>Directeur de la publication : {TODO}</Li>
                        <Li>
                            Contact : <A href="mailto:contact@innovevents.com">contact@innovevents.com</A>
                        </Li>
                    </Ul>

                    <Title>Hébergement</Title>
                    <P>Hébergeur du site : {TODO}.</P>

                    <Title>Données personnelles</Title>
                    <P>Le site ne collecte que les informations que vous saisissez :</P>
                    <Ul>
                        <Li>
                            via le formulaire de demande de devis : entreprise, nom, prénom, adresse e-mail, téléphone,
                            lieu, type d'événement, date souhaitée, nombre de participants et description du besoin ;
                        </Li>
                        <Li>
                            lors de la création d'un compte : nom, prénom, nom d'utilisateur, adresse e-mail et mot de
                            passe (conservé sous forme hachée, non lisible).
                        </Li>
                    </Ul>
                    <P>
                        Ces données servent uniquement à répondre à vos demandes et à gérer la relation client. Par mesure
                        de sécurité, les tentatives de connexion (réussies ou non) sont journalisées, adresse IP
                        comprise. Durée de conservation : {TODO}.
                    </P>
                    <P>
                        Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos
                        données. Pour l'exercer, écrivez à{' '}
                        <A href="mailto:contact@innovevents.com">contact@innovevents.com</A>.
                    </P>
                </Card>
            </Container>
        </Page>
    );
}

export function Cgu() {
    return (
        <Page>
            <Container size="medium">
                <PageHead eyebrow="Informations légales" title="CGU / CGV" />

                <Alert
                    type="warning"
                    style={s.notice}
                    message="Version provisoire : ces conditions doivent être complétées et validées avant la mise en ligne du site."
                />

                <Card>
                    <Title first>Conditions générales d'utilisation</Title>
                    <Ul>
                        <Li>
                            <Strong>Accès au site :</Strong> la consultation du site est libre. La création d'un compte
                            donne accès à un espace personnel.
                        </Li>
                        <Li>
                            <Strong>Compte utilisateur :</Strong> vous êtes responsable de la confidentialité de vos
                            identifiants et des actions réalisées depuis votre compte.
                        </Li>
                        <Li>
                            <Strong>Exactitude des informations :</Strong> les informations transmises dans les
                            formulaires doivent être exactes afin que l'agence puisse vous recontacter.
                        </Li>
                    </Ul>

                    <Title>Conditions générales de vente</Title>
                    <P>
                        Tarifs, modalités de paiement, conditions d'annulation et responsabilités : {TODO}.
                    </P>
                </Card>
            </Container>
        </Page>
    );
}

const s = StyleSheet.create({
    notice: { marginBottom: 16 },
    p: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25.6, color: colors.text, marginBottom: 16 },
    em: { fontStyle: 'italic' },
    strong: { fontWeight: '700' },
    h2: {
        fontFamily: fonts.display,
        fontSize: 20.8,
        lineHeight: 25,
        fontWeight: '700',
        color: colors.text,
        marginTop: 30.4,
        marginBottom: 10.4
    },
    h2First: { marginTop: 0 },
    ul: { gap: 6.4, marginBottom: 16, paddingLeft: 4 },
    li: { flexDirection: 'row', gap: 8 },
    bullet: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25.6, color: colors.text },
    liText: { flex: 1, fontFamily: fonts.body, fontSize: 16, lineHeight: 25.6, color: colors.text }
});
