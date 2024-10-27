import { Stream } from 'stream';

export async function stream2buffer(stream: Stream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const _buf = Array<Uint8Array>();

        stream.on('data', (chunk) => _buf.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(_buf)));
        stream.on('error', (err) => reject(`error converting stream - ${err}`));
    });
}

export function contentTypeToMimeType(contentType: string) {
    if (!contentType) return contentType;
    if (contentType.includes(';')) return contentType.split(';')[0];
    else return contentType;
}
