import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { Context } from 'graphql-ws';
import { AuthorsResolver } from './graphql/authors/authors.resolver';
import { join } from 'node:path';

import { PubSub } from 'graphql-subscriptions';
import { HonoGraphQLDriver } from '../../dist/cjs';

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
  controllers: [AppController],
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
