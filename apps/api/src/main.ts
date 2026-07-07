import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';


async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001',
  });

  app.useGlobalFilters(new DomainExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
