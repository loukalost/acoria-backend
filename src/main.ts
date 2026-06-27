import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: 'http://localhost:3000', credentials: true });
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap().catch((err) => {
  console.error("Erreur au démarrage de l'application:", err);
  process.exit(1);
});
