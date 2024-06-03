# Hono NestJS Adapter

This package allows you to use Hono with the NestJS framework.

## Components

- `HonoAdapter`: Adapter to use Hono with NestJS.

## How to Use

### Create Application

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HonoAdapter } from "./hono.adapter";

const app = await NestFactory.create<NestHonoApplication>(
  AppModule,
  new HonoAdapter()
);

// You can also pass your own instance of Hono app to the adapter
const hono = new Hono();
const app = await NestFactory.create<NestHonoApplication>(
  AppModule,
  new HonoAdapter(hono)
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
