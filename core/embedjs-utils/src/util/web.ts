import createDebugMessages from 'debug';

const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

type getSafeResponsePartial = {
    headers: Headers;
    statusCode: number;
};

export async function getSafe(
    url: string,
    options: { headers?: Record<string, string>; format: 'text' },
): Promise<{ body: string } & getSafeResponsePartial>;
export async function getSafe(
    url: string,
    options: { headers?: Record<string, string>; format: 'buffer' },
): Promise<{ body: Buffer } & getSafeResponsePartial>;
export async function getSafe(
    url: string,
    options?: { headers?: Record<string, string>; format?: 'stream' },
): Promise<{ body: NodeJS.ReadableStream } & getSafeResponsePartial>;
export async function getSafe(
    url: string,
    options?: { headers?: Record<string, string>; format?: 'text' | 'stream' | 'buffer' },
) {
    const headers = options?.headers ?? {};
    headers['User-Agent'] = headers['User-Agent'] ?? DEFAULT_USER_AGENT;

    const format = options?.format ?? 'stream';
    const response = await fetch(url, { headers });
    createDebugMessages('embedjs:util:getSafe')(`URL '${url}' returned status code ${response.status}`);
    if (response.status !== 200) throw new Error(`Failed to fetch URL '${url}'. Got status code ${response.status}.`);

    return {
        body:
            format === 'text'
                ? await response.text()
                : format === 'buffer'
                  ? Buffer.from(await response.arrayBuffer())
                  : (response.body as unknown as NodeJS.ReadableStream),
        statusCode: response.status,
        headers: response.headers,
    };
}
