const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// 依序載入 .env 與 .env.local，後者可覆蓋前者
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const apiRoutes = require('./routes/api');

const app = express();

// CORS 設定：允許前端本地與測試網域、啟用憑證、並處理預檢請求
const allowedOrigins = (process.env.CORS_ORIGINS || [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:54321',
  'http://127.0.0.1:54321',
  'http://192.168.0.105:54321',
  'http://atlweb.freedynamicdns.net'
].join(',')).split(',').map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // 允許非瀏覽器（如 Postman）或同源請求（無 Origin）
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 600,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Express 5 對於 '*' 的 path 會觸發 path-to-regexp 錯誤；不需要額外註冊 app.options('*')。

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  // CORS 驗證失敗時
  if (err && err.message && err.message.startsWith('Not allowed by CORS')) {
    return res.status(403).json({ error: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 54320;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});