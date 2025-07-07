import { ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { Context } from 'graphql-ws';
import { join } from 'node:path';

import { HonoGraphQLDriver } from '../../dist/cjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthorsResolver } from './graphql/authors/authors.resolver';
import { SwaggerController } from './swagger.controller';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: HonoGraphQLDriver,
      sortSchema: true,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      definitions: {
        path: join(process.cwd(), 'schema.ts'),
      },
      path: '/graphql',
      subscriptions: {
        'graphql-ws': {
          onConnect: (context: Context<any, any>) => {
            const { connectionParams, extra } = context;

            context['headers'] = { 'x-auth-token': connectionParams.authToken };
          },
        },
      },
      context: (_ctx: Context, req: Request): any => {
        return req;
      },
      formatError: (err) => {
        if (
          process.env.NODE_ENV === 'production' &&
          err.message?.includes('prisma')
        ) {
          return {
            message: 'Internal server error',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
            },
          };
        }
        // Don't give the specific errors to the client.

        // Otherwise return the original error.  The error can also
        // be manipulated in other ways, so long as it's returned.

        return err;
      },
    }),
  ],
  controllers: [AppController, SwaggerController],
  providers: [
    AppService,
    AuthorsResolver,
    {
      provide: 'PUB_SUB',
      useValue: new PubSub(),
    },
  ],
})
export class AppModule {}
