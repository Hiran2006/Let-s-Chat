import 'dotenv/config.js';
import express from 'express';
import apiRouter from './routes/api.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'http';
import { initSocket } from './socket.js';

const app = express();
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRouter);
app.get('/', (req, res) => {
  console.log(req.cookies);
  res.send('Hello World!');
});

const server = createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});