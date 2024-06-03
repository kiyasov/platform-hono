import { ServeStaticOptions } from "@hono/node-server/serve-static";
import { HttpServer, INestApplication } from "@nestjs/common";
import { Context, Hono, MiddlewareHandler } from "hono";

export type TypeBodyParser =
  | "application/json"
  | "text/plain"
  | "application/x-www-form-urlencoded";

interface HonoViewOptions {
  engine: string;
  templates: string;
}

/**
 * @publicApi
 */
export interface NestHonoApplication<TServer extends Hono = Hono>
  extends INestApplication<TServer> {
  /**
   * Returns the underlying HTTP adapter bounded to a Hono app.
   *
   * @returns {HttpServer}
   */
  getHttpAdapter(): HttpServer<Context, MiddlewareHandler, Hono>;

  /**
   * Register Hono body parsers on the fly.
   *
   * @example
   * // enable the json parser with a parser limit of 50mb
   * app.useBodyParser('application/json', 50 * 1024 * 1024);
   *
   * @returns {this}
   */
  useBodyParser(type: TypeBodyParser, bodyLimit?: number): this;

  /**
   * Sets a base directory for public assets.
   * Example `app.useStaticAssets('public', { root: '/' })`
   * @returns {this}
   */
  useStaticAssets(path: string, options: ServeStaticOptions): this;

  /**
   * Sets a view engine for templates (views), for example: `pug`, `handlebars`, or `ejs`.
   *
   * Don't pass in a string. The string type in the argument is for compatibility reason and will cause an exception.
   * @returns {this}
   */
  setViewEngine(options: HonoViewOptions | string): this;

  /**
   * Starts the application.
   * @returns A Promise that, when resolved, is a reference to the underlying HttpServer.
   */
  listen(
    port: number | string,
    callback?: (err: Error, address: string) => void
  ): Promise<TServer>;
  listen(
    port: number | string,
    address: string,
    callback?: (err: Error, address: string) => void
  ): Promise<TServer>;
  listen(
    port: number | string,
    address: string,
    backlog: number,
    callback?: (err: Error, address: string) => void
  ): Promise<TServer>;
}
