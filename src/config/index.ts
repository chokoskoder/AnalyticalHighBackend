import dotenv from 'dotenv';
dotenv.config();


export const config = {
    port : process.env.PORT? parseInt(process.env.PORT , 10) : 3000,
redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT? parseInt(process.env.REDIS_PORT, 10) : 6379,
  },
  queueName: 'analysis-queue',
};
