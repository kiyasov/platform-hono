# Hono NestJS Adapter

[![NPM version](https://badge.fury.io/js/@kiyasov%2Fplatform-hono.svg)](https://www.npmjs.com/package/@kiyasov/platform-hono)
[![NPM Downloads](https://img.shields.io/npm/dw/%40kiyasov%2Fplatform-hono)](https://www.npmjs.com/package/@kiyasov/platform-hono)

This package allows you to use [Hono](https://hono.dev/) with [NestJS](https://nestjs.com/).

## Installation

```bash
# npm
npm install @kiyasov/platform-hono

# yarn
yarn add @kiyasov/platform-hono

# pnpm
pnpm add @kiyasov/platform-hono

# bun
bun add @kiyasov/platform-hono
```

## Quick Start

### Basic Setup

```typescript
import { NestFactory } from '@nestjs/core';
import { HonoAdapter } from '@kiyasov/platform-hono';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new HonoAdapter()
  );

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
```

## Examples

### Exception Filter with HonoAdapter

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
```


## Advanced Configuration

### Custom Hono Instance

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

async function bootstrap() {
  const honoApp = new Hono();

  // Add Hono middleware
  honoApp.use('*', cors());
  honoApp.use('*', logger());

  const app = await NestFactory.create(
    AppModule,
    new HonoAdapter(honoApp)
  );

  await app.listen(3000);
}
```




## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions, please use the [GitHub issue tracker](https://github.com/kiyasov/platform-hono/issues).

## Acknowledgments

- [Hono](https://hono.dev/) - The ultrafast web framework
- [NestJS](https://nestjs.com/) - A progressive Node.js framework