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
import { isObject } from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import { Context, Next, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { Data } from 'hono/dist/types/context';
import { RedirectStatusCode, StatusCode } from 'hono/utils/http-status';
import * as http from 'http';
import http2 from 'http2';
import * as https from 'https';

import { HonoRequest, TypeBodyParser } from '../interfaces';

type HonoHandler = RequestHandler<HonoRequest, Context>;
type ServerType = http.Server | http2.Http2Server | http2.Http2SecureServer;
type Ctx = Context | (() => Promise<Context>);
type Method =
  | 'all'
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'use'
  | 'patch'
  | 'options';

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

      return this.getBody(ctx);
    };
  }

  private async normalizeContext(ctx: Ctx): Promise<Context> {
    if (typeof ctx === 'function') {
      return await ctx();
    }
    return ctx;
  }

  private async getBody(ctx: Ctx, body?: Data) {
    ctx = await this.normalizeContext(ctx);

    if (body === undefined && ctx.res && ctx.res.body !== null) {
      return ctx.res;
    }

    let responseContentType = await this.getHeader(ctx, 'Content-Type');

    if (!responseContentType || responseContentType.startsWith('text/plain')) {
      if (
        body instanceof Buffer ||
        body instanceof Uint8Array ||
        body instanceof ArrayBuffer ||
        body instanceof ReadableStream
      ) {
        responseContentType = 'application/octet-stream';
      } else if (isObject(body)) {
        responseContentType = 'application/json';
      }

      await this.setHeader(ctx, 'Content-Type', responseContentType);
    }

    if (responseContentType === 'application/json' && isObject(body)) {
      return ctx.json(body);
    } else if (body === undefined) {
      return ctx.newResponse(null);
    }

    return ctx.body(body);
  }

  private registerRoute(
    method: Method,
    pathOrHandler: string | HonoHandler,
    handler?: HonoHandler,
  ) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler,
    );
    const routeHandler2 = this.createRouteHandler(routeHandler);

    switch (method) {
      case 'all':
        this.instance.all(routePath, routeHandler2);
        break;
      case 'get':
        this.instance.get(routePath, routeHandler2);
        break;
      case 'post':
        this.instance.post(routePath, routeHandler2);
        break;
      case 'put':
        this.instance.put(routePath, routeHandler2);
        break;
      case 'delete':
        this.instance.delete(routePath, routeHandler2);
        break;
      case 'use':
        this.instance.use(routePath, routeHandler2);
        break;
      case 'patch':
        this.instance.patch(routePath, routeHandler2);
        break;
      case 'options':
        this.instance.options(routePath, routeHandler2);
        break;
    }
  }

  public all(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    this.registerRoute('all', pathOrHandler, handler);
  }

  public get(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    this.registerRoute('get', pathOrHandler, handler);
  }

  public post(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    this.registerRoute('post', pathOrHandler, handler);
  }

  public put(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    this.registerRoute('put', pathOrHandler, handler);
  }

  public delete(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    this.registerRoute('delete', pathOrHandler, handler);
  }

  public use(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    this.registerRoute('use', pathOrHandler, handler);
  }

  public patch(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    this.registerRoute('patch', pathOrHandler, handler);
  }

  public options(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    this.registerRoute('options', pathOrHandler, handler);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async reply(ctx: Ctx, body: any, statusCode?: StatusCode) {
    ctx = await this.normalizeContext(ctx);

    if (statusCode) {
      ctx.status(statusCode);
    }

    ctx.res = await this.getBody(ctx, body);
  }

  public async status(ctx: Ctx, statusCode: StatusCode) {
    ctx = await this.normalizeContext(ctx);
    return ctx.status(statusCode);
  }

  public async end() {
    return RESPONSE_ALREADY_SENT;
  }

  public render() {
    throw new Error('Method not implemented.');
  }

  public async redirect(ctx: Ctx, statusCode: RedirectStatusCode, url: string) {
    ctx = await this.normalizeContext(ctx);
    ctx.res = ctx.redirect(url, statusCode);
  }

  public setErrorHandler(handler: ErrorHandler) {
    this.instance.onError(async (err: Error, ctx: Context) => {
      const argumentsHost = this.createArgumentsHost(ctx);
      await handler(err, ctx.req, argumentsHost);

      return this.getBody(ctx);
    });
  }

  public setNotFoundHandler(handler: RequestHandler) {
    this.instance.notFound(async (ctx: Context) => {
      const argumentsHost = this.createArgumentsHost(ctx);
      await handler(ctx.req, argumentsHost);
      await this.status(ctx, HttpStatus.NOT_FOUND);

      return this.getBody(ctx, 'Not Found');
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
    ctx = await this.normalizeContext(ctx);
    return ctx.finalized;
  }

  public async getHeader(ctx: Ctx, name: string) {
    ctx = await this.normalizeContext(ctx);
    return ctx.res.headers.get(name);
  }

  public async setHeader(ctx: Ctx, name: string, value: string) {
    ctx = await this.normalizeContext(ctx);
    ctx.res.headers.set(name, value);
  }

  public async appendHeader(ctx: Ctx, name: string, value: string) {
    ctx = await this.normalizeContext(ctx);
    ctx.res.headers.append(name, value);
  }

  public async getRequestHostname(ctx: Ctx): Promise<string> {
    ctx = await this.normalizeContext(ctx);
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

  private extractClientIp(ctx: Context): string {
    return (
      ctx.req.header('cf-connecting-ip') ??
      ctx.req.header('x-forwarded-for') ??
      ctx.req.header('x-real-ip') ??
      ctx.req.header('forwarded') ??
      ctx.req.header('true-client-ip') ??
      ctx.req.header('x-client-ip') ??
      ctx.req.header('x-cluster-client-ip') ??
      ctx.req.header('x-forwarded') ??
      ctx.req.header('forwarded-for') ??
      ctx.req.header('via')
    );
  }

  private async parseRequestBody(
    ctx: Context,
    contentType: string,
    rawBody: boolean,
  ): Promise<void> {
    if (
      contentType?.startsWith('multipart/form-data') ||
      contentType?.startsWith('application/x-www-form-urlencoded')
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ctx.req as any).body = await ctx.req
        .parseBody({
          all: true,
        })
        .catch(() => {});
    } else if (
      contentType?.startsWith('application/json') ||
      contentType?.startsWith('text/plain')
    ) {
      if (rawBody) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ctx.req as any).rawBody = Buffer.from(await ctx.req.text());
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ctx.req as any).body = await ctx.req.json().catch(() => {});
    }
  }

  public initHttpServer(options: NestApplicationOptions) {
    this.instance.use(async (ctx, next) => {
      ctx.req['ip'] = this.extractClientIp(ctx);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx.req['query'] = ctx.req.query() as any;
      ctx.req['headers'] = Object.fromEntries(ctx.req.raw.headers);

      const contentType = ctx.req.header('content-type');
      await this.parseRequestBody(ctx, contentType, options.rawBody);

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
        const argumentsHost = this.createArgumentsHost(ctx);
        await callback(ctx.req, argumentsHost, next);
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
      onError: (ctx) => {
        const errorMessage = `Body size  exceeded: ${maxSize} bytes. Size: ${ctx.req.header('Content-Length')} bytes. Method: ${ctx.req.method}. Path: ${ctx.req.path}`;
        throw new Error(errorMessage);
      },
    });
  }

  /**
   * Creates a NestJS-compatible ArgumentsHost wrapper around Hono Context
   */
  private createArgumentsHost(ctx: Context) {
    const argumentsHost = {
      getRequest: () => ctx.req,
      getResponse: () => ctx,
      switchToHttp: () => argumentsHost,
    };
    return argumentsHost;
  }
}
