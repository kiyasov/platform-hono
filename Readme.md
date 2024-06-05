# Hono NestJS Adapter

[![NPM version](https://badge.fury.io/js/@kiyasov%2Fplatform-hono.svg)](https://www.npmjs.com/package/@kiyasov/platform-hono)
[![NPM Downloads](https://img.shields.io/npm/dw/%40kiyasov%2Fplatform-hono)](https://www.npmjs.com/package/@kiyasov/platform-hono)

This package allows you to use Hono with the NestJS framework.

## Components

- `HonoAdapter`: Adapter to use Hono with NestJS.

## How to Use

### Setup

To install [`@kiyasov/platform-hono`](https://www.npmjs.com/package/@kiyasov/platform-hono):

```shell
npm install @kiyasov/platform-hono
# or
yarn add @kiyasov/platform-hono
```

### Create Application

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HonoAdapter } from "@kiyasov/platform-hono";

const app = await NestFactory.create<NestHonoApplication>(
  AppModule,
  new HonoAdapter()
);
```

### Exception filters

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";

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
