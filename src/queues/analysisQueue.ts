import {Queue} from 'bullmq';
import { config } from '../config';

/**
 * This is the queue that will handle the analysis of uploaded Excel files.
 * We instantiate it once and export it so it can be used by our API controllers
 * to add new jobs. The connection details are pulled from our centralized config.
 *
 * It's best practice to define queues in a separate module to promote reusability
 * and keep the connection logic isolated.
 */
export const analysisQueue = new Queue(config.queueName, {
  connection: {
    host: config.redis.host,
    port: config.redis.port,
  },
});