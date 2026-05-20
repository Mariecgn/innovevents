const express = require('express');

const pool = require('../config/db');
const { auth, allow } = require('../middleware/auth');
const { generateQuotePdf } = require('../services/pdfService');
const { addLog } = require('../services/logService');
const { sendMail } = require('../services/mailService');

const router = express.Router();

router.post(
    '/',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        const { event_id, client_id, items = [] } = req.body;

        const total_ht = items.reduce(
            (sum, item) => sum + Number(item.amount_ht),
            0
        );

        const tva = +(total_ht * 0.2).toFixed(2);
        const total_ttc = +(total_ht + tva).toFixed(2);

        const [quote] = await pool.query(
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
            [
                event_id,
                client_id,
                total_ht,
                tva,
                total_ttc
            ]
        );

        for (const item of items) {
            await pool.query(
                `
                INSERT INTO quote_items (
                    quote_id,
                    label,
                    amount_ht
                )
                VALUES (?, ?, ?)
                `,
                [
                    quote.insertId,
                    item.label,
                    item.amount_ht
                ]
            );
        }

        res.status(201).json({
            id: quote.insertId,
            total_ht,
            tva,
            total_ttc
        });
    }
);

router.post(
    '/:id/pdf',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        const [[quote]] = await pool.query(
            `
            SELECT *
            FROM quotes
            WHERE id = ?
            `,
            [req.params.id]
        );

        const [items] = await pool.query(
            `
            SELECT *
            FROM quote_items
            WHERE quote_id = ?
            `,
            [req.params.id]
        );

        const path = await generateQuotePdf(quote, items);

        await pool.query(
            `
            UPDATE quotes
            SET pdf_path = ?
            WHERE id = ?
            `,
            [path, req.params.id]
        );

        await addLog('GENERATION_DEVIS_PDF', req.user.id, {
            quote_id: req.params.id,
            event_id: quote.event_id
        });

        res.json({
            path
        });
    }
);

router.post(
    '/:id/send',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        await pool.query(
            `
            UPDATE quotes
            SET status = "ETUDE_CLIENT"
            WHERE id = ?
            `,
            [req.params.id]
        );

        await sendMail({
            to: req.body.email,
            subject: "Votre devis Innov'Events",
            text: 'Votre devis est disponible dans votre espace client.'
        });

        res.json({
            message: 'Devis envoyé'
        });
    }
);

router.post(
    '/:id/respond',
    auth,
    allow('CLIENT'),
    async (req, res) => {
        const status =
            req.body.action === 'accept'
                ? 'ACCEPTE'
                : req.body.action === 'modify'
                    ? 'MODIFICATION'
                    : 'REFUSE';

        await pool.query(
            `
            UPDATE quotes
            SET status = ?
            WHERE id = ?
            `,
            [status, req.params.id]
        );

        res.json({
            status
        });
    }
);

module.exports = router;