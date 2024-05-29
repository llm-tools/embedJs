import magic, { MimeType } from 'stream-mmmagic';
import createDebugMessages from 'debug';
import fs from 'node:fs';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { createLoaderFromMimeType } from '../util/mime.js';

export class LocalPathLoader extends BaseLoader<{ type: 'LocalPathLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:LocalPathLoader');
    private readonly path: string;

    constructor({ path }: { path: string }) {
        super(`LocalPathLoader_${md5(path)}`);
        this.path = path;
    }

    override async *getUnfilteredChunks() {
        for await (const result of await this.recursivelyAddPath(this.path)) {
            result.metadata.type = 'LocalPathLoader';
            result.metadata.originalPath = this.path;
            yield result;
        }
    }

    private async *recursivelyAddPath(currentPath: string) {
        const isDir = fs.lstatSync(currentPath).isDirectory();
        this.debug(`Processing path ${currentPath}. ${isDir ? 'Is Directory!' : 'Is a file...'}`);

        if (!isDir) {
            const stream = fs.createReadStream(currentPath);
            const mime = (<Exclude<MimeType, string>>(await magic.promise(stream))[0]).type;
            this.debug(`${this.path} file type detected as '${mime}'`);
            stream.destroy();

            const loader = await createLoaderFromMimeType(this.path, mime);
            for await (const result of await loader.getUnfilteredChunks()) {
                yield {
                    pageContent: result.pageContent,
                    metadata: {
                        source: currentPath,
                    },
                };
            }
        } else {
            const files = fs.readdirSync(currentPath);
            this.debug(`${files.length} files found in dir ${currentPath}`);

            for (const file of files) {
                for await (const result of await this.recursivelyAddPath(file)) {
                    yield result;
                }
            }
        }
    }
}
