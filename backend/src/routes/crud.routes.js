const express = require('express');

const pool = require('../config/db');
const { auth, allow } = require('../middleware/auth');
const { addLog } = require('../services/logService');

const router = express.Router();

router.get('/events', async (req, res) => {
    const { from, to, type, theme } = req.query;

    let sql = `
        SELECT
            e.*,
            c.company_name AS client_company
        FROM events e
        JOIN clients c ON c.id = e.client_id
        WHERE e.is_public = 1
        AND e.status <> "BROUILLON"
    `;

    const params = [];

    if (from) {
        sql += ' AND e.start_at >= ?';
        params.push(from);
    }

    if (to) {
        sql += ' AND e.start_at <= ?';
        params.push(to);
    }

    if (type) {
        sql += ' AND e.type = ?';
        params.push(type);
    }

    if (theme) {
        sql += ' AND e.theme = ?';
        params.push(theme);
    }

    const [rows] = await pool.query(sql, params);

    res.json(rows);
});

router.get(
    '/admin/events',
    auth,
    allow('ADMIN', 'EMPLOYEE'),
    async (req, res) => {
        const [rows] = await pool.query(`
            SELECT *
            FROM events
            ORDER BY start_at DESC
        `);

        res.json(rows);
    }
);

router.post(
    '/admin/events',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        const b = req.body;

        const [result] = await pool.query(
            `
            INSERT INTO events (
                client_id,
                name,
                start_at,
                end_at,
                location,
                type,
                theme,
                status,
                is_public,
                image_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                b.client_id,
                b.name,
                b.start_at,
                b.end_at,
                b.location,
                b.type,
                b.theme,
                b.status || 'BROUILLON',
                !!b.is_public,
                b.image_url
            ]
        );

        await addLog('CREATION_EVENEMENT', req.user.id, {
            id: result.insertId,
            nom: b.name
        });

        res.status(201).json({
            id: result.insertId
        });
    }
);

router.put(
    '/admin/events/:id/status',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        const [[event]] = await pool.query(
            `
            SELECT status
            FROM events
            WHERE id = ?
            `,
            [req.params.id]
        );

        await pool.query(
            `
            UPDATE events
            SET status = ?
            WHERE id = ?
            `,
            [req.body.status, req.params.id]
        );

        await addLog(
            'MODIFICATION_STATUT_EVENEMENT',
            req.user.id,
            {
                id: req.params.id,
                ancien: event?.status,
                nouveau: req.body.status
            }
        );

        res.json({
            message: 'Statut modifié'
        });
    }
);

router.get(
    '/clients',
    auth,
    allow('ADMIN', 'EMPLOYEE'),
    async (req, res) => {
        const [rows] = await pool.query(`
            SELECT *
            FROM clients
            ORDER BY lastname
        `);

        res.json(rows);
    }
);

router.post(
    '/clients',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        const b = req.body;

        const [result] = await pool.query(
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
                b.company_name,
                b.firstname,
                b.lastname,
                b.email,
                b.phone,
                b.address
            ]
        );

        await addLog('CREATION_CLIENT', req.user.id, {
            id: result.insertId,
            nom: b.lastname
        });

        res.status(201).json({
            id: result.insertId
        });
    }
);

router.post(
    '/notes',
    auth,
    allow('ADMIN', 'EMPLOYEE'),
    async (req, res) => {
        const b = req.body;

        const [result] = await pool.query(
            `
            INSERT INTO notes (
                event_id,
                author_id,
                content,
                is_global
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                b.event_id || null,
                req.user.id,
                b.content,
                !!b.is_global
            ]
        );

        res.status(201).json({
            id: result.insertId
        });
    }
);

router.get(
    '/dashboard/admin',
    auth,
    allow('ADMIN'),
    async (req, res) => {
        const [events] = await pool.query(`
            SELECT *
            FROM events
            ORDER BY start_at ASC
            LIMIT 3
        `);

        const [notes] = await pool.query(`
            SELECT *
            FROM notes
            ORDER BY created_at DESC
            LIMIT 5
        `);

        const [[stats]] = await pool.query(`
            SELECT
                (
                    SELECT COUNT(*)
                    FROM clients
                ) AS clients_actifs,

                (
                    SELECT COUNT(*)
                    FROM events
                    WHERE status = "BROUILLON"
                ) AS events_brouillon
        `);

        res.json({
            events,
            notes,
            stats
        });
    }
);

module.exports = router;