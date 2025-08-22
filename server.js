import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import homeRoute from './routes/homeRoute.js';
import redirectRoute from './routes/redirectRoute.js';
import apiRoutes from './routes/apiRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(express.static(join(__dirname, 'public')));
app.set("trust proxy", 1);

app.use(homeRoute);
app.use(redirectRoute);
app.use("/api", apiRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '1.0.0' });
});

app.listen(port, () => {
  console.log(`SmartLink server running at http://localhost:${port}`);
});
