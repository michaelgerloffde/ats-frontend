import express from 'express';
import publicRoutes from './routes/public.js';

export const app = express();

app.use(express.json());
app.use('/api', publicRoutes);