const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();

app.use(cors({
  origin: ['http://192.168.0.105:54321', 'http://atlweb.freedynamicdns.net']
}));
app.use(helmet());
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 54320;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});