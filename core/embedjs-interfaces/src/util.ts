import createDebugMessages from 'debug';
import { BaseLoader } from './interfaces/base-loader.js';

export async function importBaseLoader(moduleName: string, modulePath: string): Promise<BaseLoader> {
    createDebugMessages('embedjs:interfaces:importBaseLoader')(
        `Starting import of ${moduleName} from path ${modulePath}`,
    );

    try {
        const importedModule = await import(modulePath);
        createDebugMessages('embedjs:interfaces:importBaseLoader')(`Imported ${modulePath}`);

        if (!importedModule[moduleName] || typeof importedModule[moduleName] !== 'function') {
            createDebugMessages('embedjs:interfaces:importBaseLoader')(
                `Module ${moduleName} not found at ${modulePath}`,
            );
            return null;
        }

        return importedModule[moduleName];
    } catch (e) {
        createDebugMessages('embedjs:interfaces:importBaseLoader')(`Module ${modulePath} not installed!`, e);
        return null;
    }
}
