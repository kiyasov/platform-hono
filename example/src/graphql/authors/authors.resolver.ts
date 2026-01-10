import { Inject } from '@nestjs/common';
import { Args, Mutation, Query, Subscription } from '@nestjs/graphql';
import fs from 'fs';
import { PubSub } from 'graphql-subscriptions';
import { join } from 'path';

import { StreamUploadFile, GraphQLUpload } from '../../../../dist/cjs';
import { Author } from './dto/author';

export class AuthorsResolver {
  constructor(@Inject('PUB_SUB') private pubSub: PubSub) {}

  @Mutation(() => Boolean)
  async uploadFile(
    @Args('image', { type: () => GraphQLUpload })
    image: Promise<StreamUploadFile>,
  ): Promise<boolean> {
    console.log(image);
    const imageResolved = await image;

    const { createReadStream, originalFilename } = imageResolved;
    const readStream = createReadStream();

    const chunks: Uint8Array[] = [];

    for await (const chunk of readStream) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);
    const outDir = join(process.cwd(), 'uploads');
    const outPath = join(outDir, originalFilename);

    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.writeFile(outPath, fileBuffer);

    console.log(`File uploaded to: ${outPath}`);

    return true;
  }

  @Mutation(() => Boolean)
  async uploadFiles(
    @Args('images', { type: () => [GraphQLUpload] })
    images: Promise<StreamUploadFile>[],
  ) {
    // Resolve all promises first
    const files = await Promise.all(images);

    for (const image of files) {
      const { createReadStream, originalFilename } = image;
      const readStream = createReadStream();

      const chunks: Uint8Array[] = [];

      for await (const chunk of readStream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);
      const outDir = join(process.cwd(), 'uploads');
      const outPath = join(outDir, originalFilename);

      await fs.promises.mkdir(outDir, { recursive: true });
      await fs.promises.writeFile(outPath, fileBuffer);

      console.log(`File uploaded to: ${outPath}`);
    }

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
    return this.pubSub.asyncIterableIterator('authorAdded');
  }
}
