const express = require('express');

const pool = require('../config/db');
const { sendMail } = require('../services/mailService');
const { addLog } = require('../services/logService');
const { auth, allow } = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res) => {
    const b = req.body;

    const required = [
        'company_name',
        'firstname',
        'lastname',
        'email',
        'phone',
        'location',
        'event_type',
        'desired_date',
        'estimated_participants',
        'need_description'
    ];

    if (required.some((key) => !b[key])) {
        return res.status(400).json({
            message: 'Tous les champs sont obligatoires'
        });
    }

    const [result] = await pool.query(
        `
        INSERT INTO prospects (
            company_name,
            firstname,
            lastname,
            email,
            phone,
            location,
            event_type,
            desired_date,
            estimated_participants,
            need_description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            b.company_name,
            b.firstname,
            b.lastname,
            b.email,
            b.phone,
            b.location,
            b.event_type,
            b.desired_date,
            b.estimated_participants,
            b.need_description
        ]
    );

    await sendMail({
        to: 'contact@innovevents.com',
        subject: 'Nouvelle demande de devis',
        text: `Prospect ${b.firstname} ${b.lastname} - ${b.company_name}`
    });

    res.status(201).json({
        id: result.insertId,
        message:
            'Merci pour votre demande. Chloé vous recontactera dans les plus brefs délais pour discuter de votre projet.'
    });
});

router.get(
    '/',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        const [rows] = await pool.query(`
            SELECT *
            FROM prospects
            ORDER BY created_at DESC
        `);

        res.json(rows);
    }
);

router.post(
    '/:id/convert',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        const [[prospect]] = await pool.query(
            `
            SELECT *
            FROM prospects
            WHERE id = ?
            `,
            [req.params.id]
        );

        if (!prospect) {
            return res.status(404).json({
                message: 'Prospect introuvable'
            });
        }

        const [[existingClient]] = await pool.query(
            `
            SELECT id
            FROM clients
            WHERE email = ?
            `,
            [prospect.email]
        );

        if (existingClient) {
            return res.status(400).json({
                message: 'Client déjà existant'
            });
        }

        const [client] = await pool.query(
            `
            INSERT INTO clients (
                company_name,
                firstname,
                lastname,
                email,
                phone,
                address
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                prospect.company_name,
                prospect.firstname,
                prospect.lastname,
                prospect.email,
                prospect.phone,
                prospect.location
            ]
        );

        await pool.query(
            `
            UPDATE prospects
            SET status = "CONVERTI"
            WHERE id = ?
            `,
            [prospect.id]
        );

        res.json({
            client_id: client.insertId
        });
    }
);

// Refus d'un prospect : le statut "ECHOUE" existe déjà dans le schéma
// (affiché « Refusé » par le frontend). Aucun e-mail n'est envoyé.
router.post(
    '/:id/reject',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id < 1) {
                return res.status(404).json({
                    message: 'Prospect introuvable'
                });
            }

            const [[prospect]] = await pool.query(
                `
                SELECT id, company_name, status
                FROM prospects
                WHERE id = ?
                `,
                [id]
            );

            if (!prospect) {
                return res.status(404).json({
                    message: 'Prospect introuvable'
                });
            }

            if (prospect.status === 'CONVERTI') {
                return res.status(400).json({
                    message: 'Prospect déjà converti en client'
                });
            }

            await pool.query(
                `
                UPDATE prospects
                SET status = "ECHOUE"
                WHERE id = ?
                `,
                [prospect.id]
            );

            await addLog('REFUS_PROSPECT', req.user.id, {
                id: prospect.id,
                entreprise: prospect.company_name
            });

            return res.json({
                status: 'ECHOUE'
            });
        } catch (error) {
            console.error('Erreur refus prospect :', error);

            return res.status(500).json({
                message: 'Erreur lors du refus du prospect.'
            });
        }
    }
);

module.exports = router;