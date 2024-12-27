import { Stream } from 'stream';

export async function streamToBuffer(stream: Stream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const _buf = Array<Uint8Array>();

        stream.on('data', (chunk) => _buf.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(_buf)));
        stream.on('error', (err) => reject(`error converting stream - ${err}`));
    });
}

export async function streamToString(stream: Stream): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks = [];

        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        stream.on('error', (err) => reject(`error converting stream - ${err}`));
    });
}

export function contentTypeToMimeType(contentType: string) {
    if (!contentType) return contentType;
    if (contentType.includes(';')) return contentType.split(';')[0];
    else return contentType;
}
