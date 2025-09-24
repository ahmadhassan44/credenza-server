import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  let app;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    // Load SSL certs
    const httpsOptions = {
      key: fs.readFileSync('/etc/ssl/selfsigned/selfsigned.key'),
      cert: fs.readFileSync('/etc/ssl/selfsigned/selfsigned.crt'),
    };

    app = await NestFactory.create(AppModule, { httpsOptions });
    logger.log('Starting in HTTPS (production) mode');
  } else {
    app = await NestFactory.create(AppModule);
    logger.log('Starting in HTTP (development) mode');
  }

  // Configure global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Enable CORS for frontend integration
  app.enableCors();

  // Add global validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}

bootstrap();
