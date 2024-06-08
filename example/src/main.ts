import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { NestHonoApplication } from '../../src/interfaces';
import { AllExceptionsFilter } from './filters/all-exception.filter';
import { HonoAdapter } from '../../dist/cjs';

async function bootstrap() {
  const app = await NestFactory.create<NestHonoApplication>(
    AppModule,
    new HonoAdapter(),
    {
      rawBody: true,
    },
  );

  app.useStaticAssets('/f', {
    root: 'public',
  });

  app.useBodyParser('application/json', 5 * 1024 * 1024);
  app.useBodyParser('application/x-www-form-urlencoded', 5 * 1024 * 1024);
  app.useBodyParser('text/plain', 10 * 1024 * 1024);

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  await app.listen(3000);
}
bootstrap();

process.on('unhandledRejection', (reason) => {
  console.error(reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(error);
  process.exit(1);
});
