import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { NestHonoApplication } from '../../src/interfaces';
import { AllExceptionsFilter } from './filters/all-exception.filter';
import { HonoAdapter } from '../../dist/cjs';

async function bootstrap() {
  const app = await NestFactory.create<NestHonoApplication>(
    AppModule,
    new HonoAdapter(),
  );

  app.useStaticAssets('/f', {
    root: 'public',
  });

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  await app.listen(3000);
}
bootstrap();
