const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
    {
        timestamp: {
            type: Date,
            default: Date.now
        },

        type_action: String,

        id_utilisateur: Number,

        details: Object
    },
    {
        versionKey: false
    }
);

const Log = mongoose.model('Log', logSchema);

async function addLog(
    type_action,
    id_utilisateur,
    details = {}
) {
    try {
        return await Log.create({
            type_action,
            id_utilisateur,
            details
        });
    } catch (e) {
        console.error(
            'Log Mongo impossible',
            e.message
        );
    }
}

module.exports = {
    Log,
    addLog
};