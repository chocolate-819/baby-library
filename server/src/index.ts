import 'dotenv/config';
import express from "express";
import cors from "cors";
import booksRouter from "./routes/books";
import levelsRouter from "./routes/levels";
import progressRouter from "./routes/progress";
import gameRouter from "./routes/game";
import baiduRouter from "./routes/baidu";

const app = express();
// Railway 默认使用 PORT 环境变量
const port = Number(process.env.PORT) || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check - 放在最前面，确保始终可用
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/v1/books', booksRouter);
app.use('/api/v1/levels', levelsRouter);
app.use('/api/v1/progress', progressRouter);
app.use('/api/v1/game', gameRouter);
app.use('/api/v1/baidu', baiduRouter);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
