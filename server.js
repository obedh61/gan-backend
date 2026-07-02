const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();
process.env.TZ = 'Asia/Jerusalem';

const app = express();

// Database connection
mongoose.connect(process.env.DATABASE)
  .then(() => console.log('DB connected'))
  .catch(err => {
    console.error('DB connection error:', err);
    process.exit(1);
  });


// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(helmet());
app.use(compression());



const allowedOrigins = [
    'https://gansecondhome.com',
    'https://obedh61.github.io'
];
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
}

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['POST', 'GET', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Language detection from Accept-Language header
const { getTranslator, DEFAULT_LANG, SUPPORTED_LANGS } = require('./utils/i18n');
app.use((req, res, next) => {
    const acceptLang = req.headers['accept-language'];
    let lang = DEFAULT_LANG;
    if (acceptLang) {
        const primary = acceptLang.split(',')[0].trim().split('-')[0].toLowerCase();
        if (SUPPORTED_LANGS.includes(primary)) {
            lang = primary;
        }
    }
    req.lang = lang;
    const { t } = getTranslator(lang);
    req.t = t;
    next();
});

// Session setup (kept for backward compatibility, but legacy session routes are disabled below)
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
    },
}));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
// const childRoutes = require('./routes/child');           // LEGACY: disabled
const addWorkerRoutes = require('./routes/worker');
// const addhoursRoutes = require('./routes/addHours');     // LEGACY: disabled
const timesessionRoutes = require('./routes/timeSession');
const schoolYearRoutes = require('./routes/schoolYear');
const childRegistrationRoutes = require('./routes/childRegistration');

app.use('/api', authRoutes);
app.use('/api', userRoutes);
// app.use('/api', childRoutes);     // LEGACY: disabled
app.use('/api', addWorkerRoutes);
// app.use('/api', addhoursRoutes);  // LEGACY: disabled
app.use('/api', timesessionRoutes);
app.use('/api', schoolYearRoutes);
app.use('/api', childRegistrationRoutes);
app.get('/api/health', (req, res) => res.status(200).send('OK'));
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    app.use(express.static(path.join(__dirname, 'client/build')));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const port = process.env.PORT || 8000;
app.listen(port, '0.0.0.0', () => {
    console.log(`API is running on port ${port} - ${process.env.NODE_ENV}`);
});
