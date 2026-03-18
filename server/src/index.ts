import express from "express";
import cors from "cors";
import booksRouter from "./routes/books";
import levelsRouter from "./routes/levels";
import progressRouter from "./routes/progress";
import gameRouter from "./routes/game";
import baiduRouter from "./routes/baidu";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/v1/books', booksRouter);
app.use('/api/v1/levels', levelsRouter);
app.use('/api/v1/progress', progressRouter);
app.use('/api/v1/game', gameRouter);
app.use('/api/v1/baidu', baiduRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
