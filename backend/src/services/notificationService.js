const mongoose = require('mongoose');

// Messagerie : notifications destinées à un client (retrouvé par son e-mail)
// ou à l'équipe d'administration. Stockées dans MongoDB (collection "notifications").
const notificationSchema = new mongoose.Schema(
    {
        audience: {
            type: String,
            enum: ['CLIENT', 'ADMIN'],
            required: true
        },

        email: {
            type: String,
            lowercase: true,
            trim: true
        },

        type: String,

        title: String,

        message: String,

        quote_id: Number,

        read: {
            type: Boolean,
            default: false
        },

        created_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        versionKey: false
    }
);

notificationSchema.index({ audience: 1, email: 1, created_at: -1 });

const Notification =
    mongoose.models.Notification ||
    mongoose.model('Notification', notificationSchema);

function filterFor(user) {
    if (user.role === 'CLIENT') {
        return {
            audience: 'CLIENT',
            email: String(user.email || '').toLowerCase()
        };
    }

    return { audience: 'ADMIN' };
}

// Les envois sont "au mieux" : une panne de MongoDB ne doit jamais bloquer une action métier.
async function create(data) {
    try {
        return await Notification.create(data);
    } catch (error) {
        console.error('Notification impossible :', error.message);
    }
}

function notifyEmail(email, data) {
    if (!email) return Promise.resolve();

    return create({
        ...data,
        audience: 'CLIENT',
        email
    });
}

function notifyAdmins(data) {
    return create({
        ...data,
        audience: 'ADMIN'
    });
}

async function listFor(user, limit = 30) {
    const filter = filterFor(user);

    const rows = await Notification.find(filter)
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

    const unread = await Notification.countDocuments({
        ...filter,
        read: false
    });

    return {
        unread,
        items: rows.map((n) => ({
            id: String(n._id),
            type: n.type,
            title: n.title,
            message: n.message,
            quote_id: n.quote_id,
            read: n.read,
            created_at: n.created_at
        }))
    };
}

async function markAllRead(user) {
    await Notification.updateMany(
        { ...filterFor(user), read: false },
        { $set: { read: true } }
    );
}

module.exports = {
    Notification,
    notifyEmail,
    notifyAdmins,
    listFor,
    markAllRead
};
