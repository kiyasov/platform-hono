import { Server } from "node:net";
import { HttpBindings, createAdaptorServer } from "@hono/node-server";
import { RESPONSE_ALREADY_SENT } from "@hono/node-server/utils/response";
import { RequestMethod } from "@nestjs/common";
import { HttpStatus, Logger } from "@nestjs/common";
import { bodyLimit } from "hono/body-limit";
import {
  ErrorHandler,
  NestApplicationOptions,
  RequestHandler,
} from "@nestjs/common/interfaces";
import {
  ServeStaticOptions,
  serveStatic,
} from "@hono/node-server/serve-static";
import { AbstractHttpAdapter } from "@nestjs/core/adapters/http-adapter";
import { Context, Next, Hono } from "hono";
import { cors } from "hono/cors";
import { RedirectStatusCode, StatusCode } from "hono/utils/http-status";
import * as http from "http";
import { Http2SecureServer, Http2Server } from "http2";
import * as https from "https";
import { HonoRequest, TypeBodyParser } from "../interfaces";

type HonoHandler = RequestHandler<HonoRequest, Context>;

type ServerType = Server | Http2Server | Http2SecureServer;

/**
 * Adapter for using Hono with NestJS.
 */
export class HonoAdapter extends AbstractHttpAdapter<
  ServerType,
  HonoRequest,
  Context
> {
  protected readonly instance: Hono<{ Bindings: HttpBindings }>;
  private _isParserRegistered: boolean;

  constructor() {
    super(new Hono());
  }

  get isParserRegistered(): boolean {
    return !!this._isParserRegistered;
  }

  private getRouteAndHandler(
    pathOrHandler: string | HonoHandler,
    handler?: HonoHandler
  ): [string, HonoHandler] {
    let path = typeof pathOrHandler === "function" ? "" : pathOrHandler;
    handler = typeof pathOrHandler === "function" ? pathOrHandler : handler;
    return [path, handler];
  }

  private createRouteHandler(routeHandler: HonoHandler) {
    return async (ctx: Context, next: Next) => {
      await routeHandler(ctx.req, ctx, next);
      return this.send(ctx);
    };
  }

  private send(ctx: Context) {
    const body = ctx.get("body");
    return typeof body === "string" ? ctx.text(body) : ctx.json(body);
  }

  public get(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler
    );
    this.instance.get(routePath, this.createRouteHandler(routeHandler));
  }

  public post(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler
    );
    this.instance.post(routePath, this.createRouteHandler(routeHandler));
  }

  public put(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler
    );
    this.instance.put(routePath, this.createRouteHandler(routeHandler));
  }

  public delete(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler
    );
    this.instance.delete(routePath, this.createRouteHandler(routeHandler));
  }

  public use(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler
    );
    this.instance.use(routePath, this.createRouteHandler(routeHandler));
  }

  public patch(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler
    );
    this.instance.patch(routePath, this.createRouteHandler(routeHandler));
  }

  public options(pathOrHandler: string | HonoHandler, handler?: HonoHandler) {
    const [routePath, routeHandler] = this.getRouteAndHandler(
      pathOrHandler,
      handler
    );
    this.instance.options(routePath, this.createRouteHandler(routeHandler));
  }

  public async reply(ctx: Context, body: any, statusCode?: StatusCode) {
    if (statusCode) ctx.status(statusCode);

    const responseContentType = this.getHeader(ctx, "Content-Type");
    if (
      !responseContentType?.startsWith("application/json") &&
      body?.statusCode >= HttpStatus.BAD_REQUEST
    ) {
      Logger.warn(
        "Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses"
      );
      this.setHeader(ctx, "Content-Type", "application/json");
    }
    ctx.set("body", body);
  }

  public status(ctx: Context, statusCode: StatusCode) {
    ctx.status(statusCode);
  }

  public async end() {
    return RESPONSE_ALREADY_SENT;
  }

  public render(response: any, view: string, options: any) {
    throw new Error("Method not implemented.");
  }

  public redirect(ctx: Context, statusCode: RedirectStatusCode, url: string) {
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
    Logger.log("Registering static assets middleware");
    this.instance.use(path, serveStatic(options));
  }

  public setViewEngine(options: any | string) {
    throw new Error("Method not implemented.");
  }

  public isHeadersSent(ctx: Context): boolean {
    return true;
  }

  public getHeader?(ctx: Context, name: string) {
    return ctx.req.header(name);
  }

  public setHeader(ctx: Context, name: string, value: string) {
    ctx.header(name, value);
  }

  public appendHeader?(ctx: Context, name: string, value: string) {
    ctx.res.headers.append(name, value);
  }

  public getRequestHostname(ctx: Context): string {
    return ctx.req.header().host;
  }

  public getRequestMethod(request: HonoRequest): string {
    return request.method;
  }

  public getRequestUrl(request: HonoRequest): string {
    return request.url;
  }

  public enableCors(options: any) {
    this.instance.use(cors(options));
  }

  public useBodyParser(
    type: TypeBodyParser,
    rawBody?: boolean,
    bodyLimit?: number
  ) {
    Logger.log(
      `Registering body parser middleware for type: ${type} | bodyLimit: ${bodyLimit}`
    );
    this.instance.use(this.bodyLimit(bodyLimit), async (ctx, next) => {
      const contentType = ctx.req.header("content-type");

      if (
        contentType?.startsWith("application/json") ||
        contentType?.startsWith("text/plain")
      ) {
        if (rawBody) {
          (ctx.req as any).rawBody = Buffer.from(await ctx.req.text());
        }
        (ctx.req as any).body = await ctx.req.json();

        return await next();
      }

      if (contentType !== type) {
        return await next();
      }

      if (contentType?.startsWith("application/json")) {
        if (rawBody) {
          (ctx.req as any).rawBody = Buffer.from(await ctx.req.text());
        }
        (ctx.req as any).body = await ctx.req.json();
      } else if (contentType?.startsWith("text/plain")) {
        if (rawBody) {
          (ctx.req as any).rawBody = Buffer.from(await ctx.req.text());
        }
        (ctx.req as any).body = await ctx.req.json();
      }

      return await next();
    });

    // To avoid the Nest application init to override our custom
    // body parser, we mark the parsers as registered.
    this._isParserRegistered = true;
  }

  public close(): Promise<void> {
    return new Promise((resolve) => this.httpServer.close(() => resolve()));
  }

  public initHttpServer(options: NestApplicationOptions) {
    this.instance.use((ctx, next) => {
      ctx.req["headers"] = Object.fromEntries(ctx.req.raw.headers);
      return next();
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
    return "hono";
  }

  public registerParserMiddleware(_prefix?: string, rawBody?: boolean) {
    if (this._isParserRegistered) {
      return;
    }

    Logger.log("Registering parser middleware");
    this.useBodyParser("application/x-www-form-urlencoded", rawBody);
    this.useBodyParser("application/json", rawBody);
    this.useBodyParser("text/plain", rawBody);

    this._isParserRegistered = true;
  }

  public async createMiddlewareFactory(requestMethod: RequestMethod) {
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
      routeMethod(path, async (ctx: Context, next: Function) => {
        await callback(ctx.req, ctx, next);
      });
    };
  }

  public applyVersionFilter(): () => () => any {
    throw new Error("Versioning not yet supported in Hono");
  }

  public listen(port: string | number, ...args: any[]): ServerType {
    return this.httpServer.listen(port, ...args);
  }

  public bodyLimit(maxSize: number) {
    return bodyLimit({
      maxSize,
      onError: () => {
        throw new Error("Body too large");
      },
    });
  }
}
