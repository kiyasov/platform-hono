import { Context } from 'hono';
import { Readable } from 'stream';

import { WriteStream, Upload } from '.';

export async function processRequest(
  ctx: Context,
): Promise<Record<string, unknown>> {
  const body = await ctx.req.parseBody();
  const operations = JSON.parse(body.operations as string);
  const map = new Map(Object.entries(JSON.parse(body.map as string)));

  for (const [fieldName, file] of Object.entries(body)) {
    if (
      fieldName === 'operations' ||
      fieldName === 'map' ||
      !(file instanceof File)
    )
      continue;

    const fileKeys = map.get(fieldName);
    if (!Array.isArray(fileKeys) || !fileKeys.length) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const capacitor = new WriteStream();
    Readable.from(buffer).pipe(capacitor);

    const upload = new Upload();

    upload.file = {
      filename: file.name,
      mimetype: file.type,
      fieldName,
      encoding: '7bit',
      createReadStream: (options) => {
        const stream = capacitor.createReadStream(options);
        stream.on('close', () => {
          capacitor.release();
        });
        return stream;
      },
      capacitor,
    };
    upload.resolve(upload.file);

    for (const fileKey of fileKeys) {
      const pathSegments = fileKey.split('.');
      let current = operations;
      for (let i = 0; i < pathSegments.length - 1; i++) {
        if (!current[pathSegments[i]]) current[pathSegments[i]] = {};
        current = current[pathSegments[i]];
      }
      current[pathSegments[pathSegments.length - 1]] = upload;
    }
  }

  return operations;
}
