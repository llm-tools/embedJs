import createDebugMessages from 'debug';
import { BaseLoader } from './interfaces/base-loader.js';

export async function importBaseLoader(moduleName: string, modulePath: string): Promise<BaseLoader> {
    createDebugMessages('embedjs:interfaces:importBaseLoader')(`Starting import of ${moduleName}`);

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
    } catch {
        createDebugMessages('embedjs:interfaces:importBaseLoader')(`Module ${modulePath} not installed...`);
        return null;
    }
}
