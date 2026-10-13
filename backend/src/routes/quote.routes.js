const express = require('express');
const fs = require('fs');

const pool = require('../config/db');
const { auth, allow } = require('../middleware/auth');
const { generateQuotePdf, pdfPath } = require('../services/pdfService');
const { addLog } = require('../services/logService');
const { sendMail } = require('../services/mailService');
const {
    notifyEmail,
    notifyAdmins
} = require('../services/notificationService');

const router = express.Router();

const RESPONSES = {
    accept: 'ACCEPTE',
    modify: 'MODIFICATION',
    refuse: 'REFUSE'
};

const QUOTE_SELECT = `
    SELECT
        q.id,
        q.event_id,
        q.client_id,
        q.status,
        q.total_ht,
        q.tva,
        q.total_ttc,
        q.pdf_path IS NOT NULL AS has_pdf,
        q.created_at,
        c.company_name,
        c.firstname,
        c.lastname,
        c.email AS client_email,
        c.address AS client_address,
        e.name AS event_name,
        e.start_at AS event_start,
        e.end_at AS event_end,
        e.location AS event_location
    FROM quotes q
    JOIN clients c ON c.id = q.client_id
    JOIN events e ON e.id = q.event_id
`;

function parseId(value) {
    const id = Number(value);

    return Number.isInteger(id) && id > 0 ? id : null;
}

function euros(value) {
    const [int, dec] = Number(value).toFixed(2).split('.');

    return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')},${dec}\u00a0€`;
}

function serverError(res, error, message) {
    console.error(message, error);

    return res.status(500).json({
        message
    });
}

async function withItems(rows) {
    const quotes = rows.map((row) => ({
        ...row,
        has_pdf: Boolean(row.has_pdf),
        items: []
    }));

    if (!quotes.length) return quotes;

    const [items] = await pool.query(
        `
        SELECT quote_id, label, amount_ht
        FROM quote_items
        WHERE quote_id IN (?)
        ORDER BY id
        `,
        [quotes.map((q) => q.id)]
    );

    items.forEach((item) => {
        const quote = quotes.find((q) => q.id === item.quote_id);

        if (quote) {
            quote.items.push({
                label: item.label,
                amount_ht: item.amount_ht
            });
        }
    });

    return quotes;
}

// Un client est rattaché à son compte par user_id, ou à défaut par l'adresse e-mail.
async function clientIdsFor(user) {
    const [rows] = await pool.query(
        `
        SELECT id
        FROM clients
        WHERE user_id = ?
        OR LOWER(email) = LOWER(?)
        `,
        [user.id, user.email || '']
    );

    return rows.map((row) => row.id);
}

async function loadQuote(id) {
    const [[row]] = await pool.query(
        `${QUOTE_SELECT} WHERE q.id = ?`,
        [id]
    );

    return row || null;
}

async function buildPdf(row) {
    const [items] = await pool.query(
        `
        SELECT label, amount_ht
        FROM quote_items
        WHERE quote_id = ?
        ORDER BY id
        `,
        [row.id]
    );

    const file = await generateQuotePdf(
        {
            id: row.id,
            total_ht: row.total_ht,
            tva: row.tva,
            total_ttc: row.total_ttc,
            created_at: row.created_at
        },
        items,
        {
            client: {
                company_name: row.company_name,
                firstname: row.firstname,
                lastname: row.lastname,
                email: row.client_email,
                address: row.client_address
            },
            event: {
                name: row.event_name,
                start_at: row.event_start,
                location: row.event_location
            }
        }
    );

    await pool.query(
        `
        UPDATE quotes
        SET pdf_path = ?
        WHERE id = ?
        `,
        [file, row.id]
    );

    return file;
}

router.get(
    '/',
    auth,
    allow('ADMIN', 'EMPLOYEE'),
    async (req, res) => {
        try {
            const [rows] = await pool.query(
                `${QUOTE_SELECT} ORDER BY q.created_at DESC, q.id DESC`
            );

            res.json(await withItems(rows));
        } catch (error) {
            serverError(res, error, 'Erreur lors du chargement des devis.');
        }
    }
);

router.get(
    '/mine',
    auth,
    allow('CLIENT'),
    async (req, res) => {
        try {
            const ids = await clientIdsFor(req.user);

            if (!ids.length) return res.json([]);

            const [rows] = await pool.query(
                `
                ${QUOTE_SELECT}
                WHERE q.client_id IN (?)
                AND q.status <> 'BROUILLON'
                ORDER BY q.created_at DESC, q.id DESC
                `,
                [ids]
            );

            res.json(await withItems(rows));
        } catch (error) {
            serverError(res, error, 'Erreur lors du chargement de vos devis.');
        }
    }
);

router.post(
    '/',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        const body = req.body || {};
        const eventId = parseId(body.event_id);
        const clientId = parseId(body.client_id);
        const rawItems = Array.isArray(body.items) ? body.items : [];

        if (!eventId || !clientId) {
            return res.status(400).json({
                message: 'Le client et l’événement sont obligatoires.'
            });
        }

        if (!rawItems.length) {
            return res.status(400).json({
                message: 'Ajoutez au moins une ligne au devis.'
            });
        }

        const items = [];

        for (const raw of rawItems) {
            const label = typeof raw.label === 'string' ? raw.label.trim() : '';
            const amount = Number(raw.amount_ht);

            if (
                !label ||
                label.length > 180 ||
                !Number.isFinite(amount) ||
                amount < 0 ||
                amount > 10000000
            ) {
                return res.status(400).json({
                    message:
                        'Chaque ligne doit avoir un libellé (180 caractères maximum) et un montant HT valide.'
                });
            }

            items.push({
                label,
                cents: Math.round(amount * 100)
            });
        }

        const htCents = items.reduce((sum, item) => sum + item.cents, 0);
        const tvaCents = Math.round(htCents * 0.2);

        const total_ht = htCents / 100;
        const tva = tvaCents / 100;
        const total_ttc = (htCents + tvaCents) / 100;

        let connection;

        try {
            const [[event]] = await pool.query(
                'SELECT id, client_id FROM events WHERE id = ?',
                [eventId]
            );

            if (!event) {
                return res.status(404).json({
                    message: 'Événement introuvable'
                });
            }

            if (event.client_id !== clientId) {
                return res.status(400).json({
                    message: 'Cet événement n’appartient pas à ce client.'
                });
            }

            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [quote] = await connection.query(
                `
                INSERT INTO quotes (
                    event_id,
                    client_id,
                    total_ht,
                    tva,
                    total_ttc
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [eventId, clientId, total_ht, tva, total_ttc]
            );

            for (const item of items) {
                await connection.query(
                    `
                    INSERT INTO quote_items (
                        quote_id,
                        label,
                        amount_ht
                    )
                    VALUES (?, ?, ?)
                    `,
                    [quote.insertId, item.label, item.cents / 100]
                );
            }

            await connection.commit();

            await addLog('CREATION_DEVIS', req.user.id, {
                quote_id: quote.insertId,
                client_id: clientId,
                total_ttc
            });

            return res.status(201).json({
                id: quote.insertId,
                status: 'BROUILLON',
                total_ht,
                tva,
                total_ttc
            });
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('Erreur annulation devis :', rollbackError);
                }
            }

            return serverError(res, error, 'Erreur lors de la création du devis.');
        } finally {
            if (connection) connection.release();
        }
    }
);

router.post(
    '/:id/pdf',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        try {
            const id = parseId(req.params.id);
            const row = id ? await loadQuote(id) : null;

            if (!row) {
                return res.status(404).json({
                    message: 'Devis introuvable'
                });
            }

            const path = await buildPdf(row);

            await addLog('GENERATION_DEVIS_PDF', req.user.id, {
                quote_id: id,
                event_id: row.event_id
            });

            res.json({
                path
            });
        } catch (error) {
            serverError(res, error, 'Erreur lors de la génération du PDF.');
        }
    }
);

router.get(
    '/:id/pdf',
    auth,
    allow('ADMIN', 'EMPLOYEE', 'CLIENT'),
    async (req, res) => {
        try {
            const id = parseId(req.params.id);
            const row = id ? await loadQuote(id) : null;

            if (!row) {
                return res.status(404).json({
                    message: 'Devis introuvable'
                });
            }

            if (req.user.role === 'CLIENT') {
                const ids = await clientIdsFor(req.user);

                if (!ids.includes(row.client_id) || row.status === 'BROUILLON') {
                    return res.status(404).json({
                        message: 'Devis introuvable'
                    });
                }
            }

            let file = pdfPath(id);

            if (!fs.existsSync(file)) {
                file = await buildPdf(row);
            }

            res.type('application/pdf');
            res.set('Content-Disposition', `inline; filename="devis-${id}.pdf"`);

            res.sendFile(file, (error) => {
                if (error && !res.headersSent) {
                    res.status(500).json({
                        message: 'Erreur lors de l’envoi du PDF.'
                    });
                }
            });
        } catch (error) {
            serverError(res, error, 'Erreur lors de la lecture du PDF.');
        }
    }
);

router.post(
    '/:id/send',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        try {
            const id = parseId(req.params.id);
            const row = id ? await loadQuote(id) : null;

            if (!row) {
                return res.status(404).json({
                    message: 'Devis introuvable'
                });
            }

            if (!['BROUILLON', 'ETUDE_CLIENT'].includes(row.status)) {
                return res.status(400).json({
                    message: 'Ce devis a déjà reçu une réponse du client.'
                });
            }

            await pool.query(
                `
                UPDATE quotes
                SET status = "ETUDE_CLIENT"
                WHERE id = ?
                `,
                [id]
            );

            const body = req.body || {};
            const to =
                (typeof body.email === 'string' && body.email.trim()) ||
                row.client_email;

            try {
                await sendMail({
                    to,
                    subject: "Votre devis Innov'Events",
                    text: 'Votre devis est disponible dans votre espace client.'
                });
            } catch (mailError) {
                console.error('Erreur envoi e-mail :', mailError);
            }

            notifyEmail(row.client_email, {
                type: 'DEVIS_ENVOYE',
                title: `Votre devis n° ${id} est disponible`,
                message: `Le devis « ${row.event_name} » (${euros(row.total_ttc)} TTC) est disponible. Consultez-le et répondez depuis la rubrique « Mes devis ».`,
                quote_id: id
            });

            addLog('ENVOI_DEVIS', req.user.id, {
                quote_id: id,
                client_id: row.client_id
            });

            res.json({
                message: 'Devis envoyé',
                status: 'ETUDE_CLIENT'
            });
        } catch (error) {
            serverError(res, error, 'Erreur lors de l’envoi du devis.');
        }
    }
);

router.post(
    '/:id/respond',
    auth,
    allow('CLIENT'),
    async (req, res) => {
        try {
            const body = req.body || {};
            const status = RESPONSES[body.action];
            const comment =
                typeof body.comment === 'string'
                    ? body.comment.trim().slice(0, 1000)
                    : '';

            if (!status) {
                return res.status(400).json({
                    message: 'Action invalide.'
                });
            }

            if (body.action === 'modify' && !comment) {
                return res.status(400).json({
                    message: 'Précisez la modification souhaitée.'
                });
            }

            const id = parseId(req.params.id);
            const row = id ? await loadQuote(id) : null;
            const ids = row ? await clientIdsFor(req.user) : [];

            if (!row || !ids.includes(row.client_id) || row.status === 'BROUILLON') {
                return res.status(404).json({
                    message: 'Devis introuvable'
                });
            }

            const [result] = await pool.query(
                `
                UPDATE quotes
                SET status = ?
                WHERE id = ?
                AND status = "ETUDE_CLIENT"
                `,
                [status, id]
            );

            if (!result.affectedRows) {
                return res.status(400).json({
                    message: 'Ce devis n’attend pas de réponse.'
                });
            }

            const who = `${row.company_name} (${row.firstname} ${row.lastname})`;

            const adminMessages = {
                ACCEPTE: {
                    title: `Devis n° ${id} accepté`,
                    message: `${who} a accepté le devis « ${row.event_name} » (${euros(row.total_ttc)} TTC).`
                },
                REFUSE: {
                    title: `Devis n° ${id} refusé`,
                    message: `${who} a refusé le devis « ${row.event_name} ».${comment ? ` Motif : ${comment}` : ''}`
                },
                MODIFICATION: {
                    title: `Modification demandée sur le devis n° ${id}`,
                    message: `${who} demande une modification du devis « ${row.event_name} » : ${comment}`
                }
            };

            const clientMessages = {
                ACCEPTE: 'Merci ! L’agence prépare la suite de votre événement.',
                REFUSE: 'Nous avons bien noté votre refus.',
                MODIFICATION: 'Votre demande de modification a été transmise à l’agence.'
            };

            notifyAdmins({
                type: 'REPONSE_CLIENT',
                ...adminMessages[status],
                quote_id: id
            });

            notifyEmail(row.client_email, {
                type: 'REPONSE_ENREGISTREE',
                title: `Votre réponse au devis n° ${id} est enregistrée`,
                message: clientMessages[status],
                quote_id: id
            });

            addLog('REPONSE_DEVIS', req.user.id, {
                quote_id: id,
                reponse: status
            });

            res.json({
                status
            });
        } catch (error) {
            serverError(res, error, 'Erreur lors de l’enregistrement de votre réponse.');
        }
    }
);

module.exports = router;
