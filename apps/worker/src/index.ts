import { runMigrations, closeConnection } from '@relay/db';
import { WorkerRegistry } from './WorkerRegistry.js';
import { Worker } from 'bullmq';
import { env } from '@relay/config';
import { schemaWorker } from './workers/schema.js';
import { dlqWorker } from './workers/dlq.js';

const start = async () => {
  try {
    // await runMigrations();
    console.log('✓ Migrations applied');

    const workerRegistry = new WorkerRegistry();
    // await workerRegistry.start();

    // Start schema inference worker
    // await schemaWorker.run();

    // Start DLQ monitor
    // await dlqWorker.run();

    console.log('🚀 Worker started');

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      await workerRegistry.stop();
      await schemaWorker.close();
      await dlqWorker.close();
    //   await closeConnection();
      console.log('✓ Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
};

start();
