import 'dotenv/config.js';
import express from 'express';
import apiRouter from './routes/api.js';
import cookieParser from 'cookie-parser';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRouter);
app.get('/', (req, res) => {
  console.log(req.cookies);
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});