const express = require('express');
const path = require('path');

const cloneRouter = require('./routes/clone');
const filesRouter = require('./routes/files');
const fileRouter = require('./routes/file');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/clone', cloneRouter);
app.use('/files', filesRouter);
app.use('/file', fileRouter);

// Start server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));