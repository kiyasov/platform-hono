import { Query, Subscription } from '@nestjs/graphql';
import { Author } from './dto/author';
import { PubSub } from 'graphql-subscriptions';
import { Inject } from '@nestjs/common';

export class AuthorsResolver {
  constructor(@Inject('PUB_SUB') private pubSub: PubSub) {}

  @Query(() => Author)
  async getAuthor(): Promise<Author> {
    return {
      id: 1,
      firstName: 'Hello',
      lastName: 'World',
    };
  }

  @Subscription(() => Author, {
    nullable: true,
  })
  authorAdded() {
    return this.pubSub.asyncIterator('authorAdded');
  }
}
