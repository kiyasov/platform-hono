import { Args, Mutation, Query, Subscription } from '@nestjs/graphql';
import { Author } from './dto/author';
import { PubSub } from 'graphql-subscriptions';
import { Inject } from '@nestjs/common';
import { FileUpload, GraphQLUpload } from '../../../../dist/cjs';
import fs from 'fs';
import { join } from 'path';

export class AuthorsResolver {
  constructor(@Inject('PUB_SUB') private pubSub: PubSub) {}

  @Mutation(() => Boolean)
  async uploadFile(
    @Args('image', { type: () => GraphQLUpload }) image: FileUpload,
    @Args('name') name: string,
  ): Promise<boolean> {
    const { createReadStream, filename } = image;
    const readStream = createReadStream();

    const chunks: any[] = [];

    for await (const chunk of readStream) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);
    const outDir = join(process.cwd(), 'uploads');
    const outPath = join(outDir, filename);

    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.writeFile(outPath, fileBuffer);

    console.log(`File uploaded to: ${outPath}`);
    console.log(`Name: ${name}`);
    return true;
  }

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
