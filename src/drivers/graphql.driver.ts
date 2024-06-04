import { ApolloServer, BaseContext, HeaderMap } from '@apollo/server';
import {
  AbstractGraphQLDriver,
  GqlSubscriptionService,
  SubscriptionConfig,
} from '@nestjs/graphql';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { Context, HonoRequest } from 'hono';
import { StatusCode } from 'hono/utils/http-status';
import { Logger } from '@nestjs/common';

import { PluginsExplorerService } from './services/plugins-explorer.service';
import { ModulesContainer } from '@nestjs/core';

export class HonoGraphQLDriver<
  T extends Record<string, any> = ApolloDriverConfig,
> extends AbstractGraphQLDriver {
  protected apolloServer: ApolloServer<BaseContext>;
  private _subscriptionService?: GqlSubscriptionService;
  private readonly pluginsExplorerService: PluginsExplorerService;

  constructor(modulesContainer: ModulesContainer) {
    super();
    this.pluginsExplorerService = new PluginsExplorerService(modulesContainer);
  }

  get instance(): ApolloServer<BaseContext> {
    return this.apolloServer;
  }

  async start(options: T): Promise<void> {
    const { httpAdapter } = this.httpAdapterHost;
    const platformName = httpAdapter.getType();

    if (platformName !== 'hono') {
      throw new Error('This driver is only compatible with the Hono platform');
    }

    await this.registerHono(options);

    if (options.installSubscriptionHandlers || options.subscriptions) {
      const subscriptionsOptions: SubscriptionConfig =
        options.subscriptions || { 'subscriptions-transport-ws': {} };
      this._subscriptionService = new GqlSubscriptionService(
        {
          schema: options.schema,
          path: options.path,
          context: options.context,
          ...subscriptionsOptions,
        },
        this.httpAdapterHost.httpAdapter?.getHttpServer(),
      );
    }
  }

  protected async registerHono(
    options: T,
    { preStartHook }: { preStartHook?: () => void } = {},
  ) {
    const { path, typeDefs, resolvers, schema } = options;
    const { httpAdapter } = this.httpAdapterHost;
    const app = httpAdapter.getInstance();
    const drainHttpServerPlugin = ApolloServerPluginDrainHttpServer({
      httpServer: httpAdapter.getHttpServer(),
    });

    preStartHook?.();

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      schema,
      ...options,
      plugins: (options.plugins || []).concat(drainHttpServerPlugin),
    });

    await server.start();

    app.use(path, async (ctx: Context) => {
      const bodyData = await this.parseBody(ctx.req);

      const defaultContext = () => Promise.resolve({} as BaseContext);

      const contextFunction = options?.context ?? defaultContext;

      const httpGraphQLResponse = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: {
          body: bodyData,
          method: ctx.req.method,
          headers: this.httpHeadersToMap(ctx.req.raw.headers),
          search: new URL(ctx.req.url).search,
        },
        context: () =>
          contextFunction(ctx, {
            method: ctx.req.method,
            url: ctx.req.url,
            body: ctx.req.raw.body,
            headers: Object.fromEntries(ctx.req.raw.headers),
          }),
      });

      const { headers, body, status } = httpGraphQLResponse;

      for (const [headerKey, headerValue] of headers) {
        ctx.header(headerKey, headerValue);
      }

      ctx.status(status === undefined ? 200 : (status as StatusCode));

      if (body.kind === 'complete') {
        return ctx.body(body.string);
      }

      const readableStream = new ReadableStream({
        async start(controller) {
          for await (const chunk of body.asyncIterator) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        },
      });

      return new Response(readableStream, {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    });

    this.apolloServer = server;
  }

  public async stop() {
    await this._subscriptionService?.stop();
    await this.apolloServer?.stop();
  }

  private httpHeadersToMap(headers: Headers) {
    const map = new HeaderMap();
    headers.forEach((value, key) => map.set(key, value));
    return map;
  }

  private async parseBody(req: HonoRequest): Promise<Record<string, unknown>> {
    const contentType = req.header('content-type');
    if (contentType === 'application/graphql')
      return { query: await req.text() };
    if (contentType === 'application/json')
      return req.json().catch(this.logError);
    if (contentType === 'application/x-www-form-urlencoded')
      return this.parseFormURL(req);
    return {};
  }

  private logError(e: unknown): void {
    if (e instanceof Error) {
      Logger.error(e.stack || e.message);
    }
    throw new Error(`POST body sent invalid JSON: ${e}`);
  }

  private async parseFormURL(req: HonoRequest) {
    const searchParams = new URLSearchParams(await req.text());
    return Object.fromEntries(searchParams.entries());
  }
}
