const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 基本 API 路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});