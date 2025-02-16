import { HttpBindings, createAdaptorServer } from '@hono/node-server';
import {
  ServeStaticOptions,
  serveStatic,
} from '@hono/node-server/serve-static';
import { RESPONSE_ALREADY_SENT } from '@hono/node-server/utils/response';
import { RequestMethod } from '@nestjs/common';
import { HttpStatus, Logger } from '@nestjs/common';
import {
  ErrorHandler,
  NestApplicationOptions,
  RequestHandler,
} from '@nestjs/common/interfaces';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import { Context, Next, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { RedirectStatusCode, StatusCode } from 'hono/utils/http-status';
import * as http from 'http';
import { Http2SecureServer, Http2Server } from 'http2';
import * as https from 'https';
import { Server } from 'node:net';

import { HonoRequest, TypeBodyParser } from '../interfaces';

type HonoHandler = RequestHandler<HonoRequest, Context>;

type ServerType = Server | Http2Server | Http2SecureServer;
type Ctx = Context | (() => Promise<Context>);

/**
 * Adapter for using Hono with NestJS.
 */
export class HonoAdapter extends AbstractHttpAdapter<
  ServerType,
  HonoRequest,
  Context
> {
  private _isParserRegistered: boolean;

  protected readonly instance: Hono<{ Bindings: HttpBindings }>;

  constructor() {
    const honoInstance = new Hono<{ Bindings: HttpBindings }>();
    super(honoInstance);
    this.instance = honoInstance;
  }

  get isParserRegistered(): boolean {
    return !!this._isParserRegistered;
  }

  private getRouteAndHandler(
    pathOrHandler: string | HonoHandler,
    handler?: HonoHandler,
  ): [string, HonoHandler] {
    const path = typeof pathOrHandler === 'function' ? '' : pathOrHandler;
    handler = typeof pathOrHandler === 'function' ? pathOrHandler : handler;
    return [path, handler];
  }

  private createRouteHandler(routeHandler: HonoHandler) {
    return async (ctx: Context, next: Next) => {
      ctx.req['params'] = ctx.req.param();
      await routeHandler(ctx.req, ctx, next);
      return this.send(ctx);
    };
  }

  private async send(ctx: Ctx) {
    if (typeof ctx === 'function') {
      ctx = await ctx();
    }

    const body = ctx.get('body');
    let responseContentType = await this.getHeader(ctx, 'Content-Type');

    if (!responseContentType || responseContentType.startsWith('text/plain')) {
      if (body instanceof Buffer) {
        responseContentType = 'application/octet-stream';
      } else if (typeof body === 'object') {
        responseContentType = 'application/json';
      }

      this.setHeader(ctx, 'Content-Type', responseContentType);
    }

    if (
      responseContentType === 'application/json' &&
      typeof body === 'object'
    ) {
      return ctx.json(body);
    }

    return ctx.body(body);
  }

  public all(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler,
    );
    this.instance.all(routePath, this.createRouteHandler(routeHandler));
  }

  public get(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler,
    );
    this.instance.get(routePath, this.createRouteHandler(routeHandler));
  }

  public post(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler,
    );
    this.instance.post(routePath, this.createRouteHandler(routeHandler));
  }

  public put(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler,
    );
    this.instance.put(routePath, this.createRouteHandler(routeHandler));
  }

  public delete(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler,
    );
    this.instance.delete(routePath, this.createRouteHandler(routeHandler));
  }

  public use(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler,
    );
    this.instance.use(routePath, this.createRouteHandler(routeHandler));
  }

  public patch(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler,
    );
    this.instance.patch(routePath, this.createRouteHandler(routeHandler));
  }

  public options(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler,
    );
    this.instance.options(routePath, this.createRouteHandler(routeHandler));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async reply(ctx: Ctx, body: any, statusCode?: StatusCode) {
    if (typeof ctx === 'function') {
      ctx = await ctx();
    }

    if (statusCode) ctx.status(statusCode);

    const responseContentType = await this.getHeader(ctx, 'Content-Type');

    if (
      !responseContentType?.startsWith('application/json') &&
      body?.statusCode >= HttpStatus.BAD_REQUEST
    ) {
      Logger.warn(
        "Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses",
      );
      this.setHeader(ctx, 'Content-Type', 'application/json');
    }

    ctx.set('body', body);
  }

  public async status(ctx: Ctx, statusCode: StatusCode) {
    if (typeof ctx === 'function') {
      ctx = await ctx();
    }

    ctx.status(statusCode);
  }

  public async end() {
    return RESPONSE_ALREADY_SENT;
  }

  public render() {
    throw new Error('Method not implemented.');
  }

  public async redirect(ctx: Ctx, statusCode: RedirectStatusCode, url: string) {
    if (typeof ctx === 'function') {
      ctx = await ctx();
    }

    ctx.redirect(url, statusCode);
  }

  public setErrorHandler(handler: ErrorHandler) {
    this.instance.onError(async (err: Error, ctx: Context) => {
      await handler(err, ctx.req, ctx);
      return this.send(ctx);
    });
  }

  public setNotFoundHandler(handler: RequestHandler) {
    this.instance.notFound(async (ctx: Context) => {
      await handler(ctx.req, ctx);
      return this.send(ctx);
    });
  }

  public useStaticAssets(path: string, options: ServeStaticOptions) {
    Logger.log('Registering static assets middleware');
    this.instance.use(path, serveStatic(options));
  }

  public setViewEngine() {
    throw new Error('Method not implemented.');
  }

  public async isHeadersSent(ctx: Ctx): Promise<boolean> {
    if (typeof ctx === 'function') {
      ctx = await ctx();
    }

    return ctx.finalized;
  }

  public async getHeader?(ctx: Ctx, name: string) {
    if (typeof ctx === 'function') {
      ctx = await ctx();
    }

    return ctx.res.headers.get(name);
  }

  public async setHeader(ctx: Ctx, name: string, value: string) {
    if (typeof ctx === 'function') {
      ctx = await ctx();
    }

    ctx.res.headers.set(name, value);
  }

  public async appendHeader?(ctx: Ctx, name: string, value: string) {
    if (typeof ctx === 'function') {
      ctx = await ctx();
    }

    ctx.res.headers.append(name, value);
  }

  public async getRequestHostname(ctx: Ctx): Promise<string> {
    if (typeof ctx === 'function') {
      ctx = await ctx();
    }

    return ctx.req.header().host;
  }

  public getRequestMethod(request: HonoRequest): string {
    return request.method;
  }

  public getRequestUrl(request: HonoRequest): string {
    return request.url;
  }

  public enableCors(options: {
    origin:
      | string
      | string[]
      | ((origin: string, c: Context) => string | undefined | null);
    allowMethods?: string[];
    allowHeaders?: string[];
    maxAge?: number;
    credentials?: boolean;
    exposeHeaders?: string[];
  }) {
    this.instance.use(cors(options));
  }

  public useBodyParser(
    type: TypeBodyParser,
    rawBody?: boolean,
    bodyLimit?: number,
  ) {
    Logger.log(
      `Registering body parser middleware for type: ${type} | bodyLimit: ${bodyLimit}`,
    );
    this.instance.use(this.bodyLimit(bodyLimit));

    // To avoid the Nest application init to override our custom
    // body parser, we mark the parsers as registered.
    this._isParserRegistered = true;
  }

  public close(): Promise<void> {
    return new Promise((resolve) => this.httpServer.close(() => resolve()));
  }

  public initHttpServer(options: NestApplicationOptions) {
    this.instance.use(async (ctx, next) => {
      ctx.req['ip'] =
        ctx.req.header('cf-connecting-ip') ??
        ctx.req.header('x-forwarded-for') ??
        ctx.req.header('x-real-ip') ??
        ctx.req.header('forwarded') ??
        ctx.req.header('true-client-ip') ??
        ctx.req.header('x-client-ip') ??
        ctx.req.header('x-cluster-client-ip') ??
        ctx.req.header('x-forwarded') ??
        ctx.req.header('forwarded-for') ??
        ctx.req.header('via');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx.req['query'] = ctx.req.query() as any;
      ctx.req['headers'] = Object.fromEntries(ctx.req.raw.headers);

      const contentType = ctx.req.header('content-type');

      if (
        contentType?.startsWith('multipart/form-data') ||
        contentType?.startsWith('application/x-www-form-urlencoded')
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.req as any).body = await ctx.req.parseBody({
          all: true,
        });
      } else if (
        contentType?.startsWith('application/json') ||
        contentType?.startsWith('text/plain')
      ) {
        if (options.rawBody) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ctx.req as any).rawBody = Buffer.from(await ctx.req.text());
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.req as any).body = await ctx.req.json();
      }

      await next();
    });
    const isHttpsEnabled = options?.httpsOptions;
    const createServer = isHttpsEnabled
      ? https.createServer
      : http.createServer;
    this.httpServer = createAdaptorServer({
      fetch: this.instance.fetch,
      createServer,
      overrideGlobalObjects: false,
    });
  }

  public getType(): string {
    return 'hono';
  }

  public registerParserMiddleware(_prefix?: string, rawBody?: boolean) {
    if (this._isParserRegistered) {
      return;
    }

    Logger.log('Registering parser middleware');
    this.useBodyParser('application/x-www-form-urlencoded', rawBody);
    this.useBodyParser('application/json', rawBody);
    this.useBodyParser('text/plain', rawBody);

    this._isParserRegistered = true;
  }

  public async createMiddlewareFactory(requestMethod: RequestMethod) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    return (path: string, callback: Function) => {
      const routeMethodsMap = {
        [RequestMethod.ALL]: this.instance.all,
        [RequestMethod.DELETE]: this.instance.delete,
        [RequestMethod.GET]: this.instance.get,
        [RequestMethod.OPTIONS]: this.instance.options,
        [RequestMethod.PATCH]: this.instance.patch,
        [RequestMethod.POST]: this.instance.post,
        [RequestMethod.PUT]: this.instance.put,
      };
      const routeMethod = (
        routeMethodsMap[requestMethod] || this.instance.get
      ).bind(this.instance);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      routeMethod(path, async (ctx: Context, next: Function) => {
        await callback(ctx.req, ctx, next);
      });
    };
  }

  public applyVersionFilter(): () => () => unknown {
    throw new Error('Versioning not yet supported in Hono');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public listen(port: string | number, ...args: any[]): ServerType {
    return this.httpServer.listen(port, ...args);
  }

  public bodyLimit(maxSize: number) {
    return bodyLimit({
      maxSize,
      onError: () => {
        throw new Error('Body too large');
      },
    });
  }
}
