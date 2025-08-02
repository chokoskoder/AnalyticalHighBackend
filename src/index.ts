import express , {Request , Response } from 'express';
import { config } from './config';
import uploadRouter from './routes/upload';

const app = express();

app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});


app.use('/api', uploadRouter);

app.listen(config.port, () => {
  console.log(`API Gateway running at http://localhost:${config.port}`);
});
