const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../config/db');
const { addLog } = require('../services/logService');
const { sendMail } = require('../services/mailService');

const router = express.Router();

router.post('/register', async (req, res) => {
    const {
        email,
        password,
        firstname,
        lastname,
        username
    } = req.body;

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password || '')) {
        return res.status(400).json({
            message: 'Mot de passe trop faible'
        });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
        `
        INSERT INTO users (
            email,
            password_hash,
            firstname,
            lastname,
            username,
            role
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            email,
            hash,
            firstname,
            lastname,
            username,
            'CLIENT'
        ]
    );

    await sendMail({
        to: email,
        subject: 'Confirmation création compte',
        text: "Votre compte Innov'Events est créé."
    });

    res.status(201).json({
        message: 'Compte créé'
    });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const [[u]] = await pool.query(
        'SELECT * FROM users WHERE email = ? AND is_active = 1',
        [email]
    );

    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
        await addLog('ECHEC_CONNEXION', null, {
            email,
            ip: req.ip
        });

        return res.status(401).json({
            message: 'Identifiants invalides'
        });
    }

    await addLog('CONNEXION_REUSSIE', u.id, {
        ip: req.ip
    });

    const token = jwt.sign(
        {
            id: u.id,
            email: u.email,
            role: u.role
        },
        process.env.JWT_SECRET || 'change-me',
        {
            expiresIn: '8h'
        }
    );

    res.json({
        token,
        user: {
            id: u.id,
            email: u.email,
            role: u.role,
            firstname: u.firstname,
            must_change_password: u.must_change_password
        }
    });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    const temp = 'Temp123!';
    const hash = await bcrypt.hash(temp, 10);

    await pool.query(
        `
        UPDATE users
        SET password_hash = ?, must_change_password = 1
        WHERE email = ?
        `,
        [hash, email]
    );

    await sendMail({
        to: email,
        subject: 'Mot de passe temporaire',
        text: `Mot de passe temporaire : ${temp}`
    });

    res.json({
        message: 'Si le compte existe, un email a été envoyé'
    });
});

module.exports = router;