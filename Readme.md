# 🚀 Hono NestJS Adapter

<div align="center">

[![NPM version](https://img.shields.io/npm/v/@kiyasov/platform-hono.svg?style=flat-square)](https://www.npmjs.com/package/@kiyasov/platform-hono)
[![NPM Downloads](https://img.shields.io/npm/dm/@kiyasov/platform-hono.svg?style=flat-square)](https://www.npmjs.com/package/@kiyasov/platform-hono)
[![License](https://img.shields.io/npm/l/@kiyasov/platform-hono.svg?style=flat-square)](https://github.com/kiyasov/platform-hono/blob/main/LICENSE)

**Use [Hono](https://hono.dev/) with [NestJS](https://nestjs.com/)**

</div>

---

## 📦 Installation

```bash
npm install @kiyasov/platform-hono
```

```bash
yarn add @kiyasov/platform-hono
```

```bash
pnpm add @kiyasov/platform-hono
```

```bash
bun add @kiyasov/platform-hono
```

## ⚡ Quick Start

```typescript
import { NestFactory } from '@nestjs/core';
import { HonoAdapter } from '@kiyasov/platform-hono';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new HonoAdapter());

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
```

## 🎯 Usage Examples

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

## 📚 Documentation

For more examples and detailed documentation, check out the [example](./example) directory.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [Islam Kiiasov](https://github.com/kiyasov)

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/@kiyasov/platform-hono)
- [GitHub Repository](https://github.com/kiyasov/platform-hono)
- [Hono Framework](https://hono.dev/)
- [NestJS Framework](https://nestjs.com/)
