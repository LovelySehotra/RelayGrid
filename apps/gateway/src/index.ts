
import { runMigrations } from "@relay/db";
import { createApp } from "./server";

const start = async () => {
  try {
    // await runMigrations();
    console.log('✓ Migrations applied');

    const app = await createApp();

    const address = await app.listen({ port: 3002 ,host: '0.0.0.0' });
    console.log(`🚀 Gateway listening on ${address}`);

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      await app.close();
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
