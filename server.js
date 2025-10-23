const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

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
app.use(express.json({ limit: '10kb' }));
app.use(helmet());
app.use(compression());



const corsOptions = {
    origin: 'https://gansecondhome.com',
    methods: ['POST', 'GET', 'PUT', 'DELETE'],
    credentials: true,
};
app.use(cors(corsOptions));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
    },
}));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const childRoutes = require('./routes/child');
const addWorkerRoutes = require('./routes/worker');
const addhoursRoutes = require('./routes/addHours');
const timesessionRoutes = require('./routes/timeSession');

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', childRoutes);
app.use('/api', addWorkerRoutes);
app.use('/api', addhoursRoutes);
app.use('/api', timesessionRoutes);
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
