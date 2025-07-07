import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiProduces,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive, IsUrl } from 'class-validator';
import { Context } from 'hono';
import { basename } from 'node:path';
import sharp from 'sharp';
import { request } from 'undici';
export class ResizeDto {
  @ApiProperty({ required: true, type: 'string' })
  @IsUrl()
  public fileUrl!: string;

  @ApiProperty({ minimum: 1, required: true, type: 'integer' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  public height!: number;

  @ApiProperty({ minimum: 1, required: true, type: 'integer' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  public width!: number;
}

@ApiTags('Swagger')
@Controller('swagger')
export class SwaggerController {
  @ApiConsumes('application/json')
  @ApiProduces('image/gif', 'image/jpeg', 'image/jpg', 'image/png')
  @ApiCreatedResponse({
    description: 'The file has been successfully resized.',
    schema: { format: 'binary', type: 'string' },
  })
  @ApiBadRequestResponse({ description: 'Bad request.' })
  @Post('/resize')
  @UsePipes(
    new ValidationPipe({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  )
  public async resize(
    @Body() { fileUrl, height, width }: ResizeDto,
    @Res() ctx: Context,
  ): Promise<void> {
    const { pathname } = new URL(fileUrl);
    const filename = basename(pathname);

    const response = await request(fileUrl);
    const responseBuffer = await response.body.arrayBuffer();

    // const response = await fetch(fileUrl);
    // if (!response.ok) {
    //   throw new BadRequestException(
    //     `Failed to fetch image: ${response.statusText}`,
    //   );
    // }
    // const responseBuffer = await response.arrayBuffer();

    const resizedImage = sharp(responseBuffer).resize({
      fit: sharp.fit.inside,
      height,
      width,
    });
    const buffer = await resizedImage.toBuffer();
    const { format } = await resizedImage.metadata();

    ctx.res = ctx.body(buffer, 201, {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': `image/${format}`,
    });

    // ctx.res = stream(ctx, async stream => {
    //   await stream.write(buffer);
    // });
  }
}
