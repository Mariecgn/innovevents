require('dotenv').config({
    path: '../.env'
});

const express = require('express');
const cors = require('cors');
const path = require('path');

const { connectMongo } = require('./config/mongo');

const app = express();

app.use(cors());
app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, '../frontend')
    )
);

app.use(
    '/api/auth',
    require('./routes/auth.routes')
);

app.use(
    '/api/prospects',
    require('./routes/prospect.routes')
);

app.use(
    '/api',
    require('./routes/crud.routes')
);

app.use(
    '/api/quotes',
    require('./routes/quote.routes')
);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok'
    });
});

if (require.main === module) {
    connectMongo().catch(console.error);

    app.listen(
        process.env.PORT || 3000,
        () => {
            console.log(
                'API InnovEvents sur port ' +
                    (process.env.PORT || 3000)
            );
        }
    );
}

module.exports = app;