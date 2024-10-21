import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { releaseVersion, releaseChangelog } from 'nx/release/index.js';
import { confirm, input } from '@inquirer/prompts';
import PackageJson from '@npmcli/package-json';
import arg from 'arg';

function abs(relativePath) {
    return resolve(dirname(fileURLToPath(import.meta.url)), relativePath);
}

/**
 * @param {pkgName} pkgName - The name of the package to update
 * @param {string} version - The version to update the package to
 * @param {Map<string, string>} versionMap - A map of package names to versions
 * @param {boolean} dryRun - Whether to perform a dry run or not
 */
async function updatePackageVersion(pkgName, version, versionMap, dryRun) {
    const folders = ['../core', '../databases', '../loaders', '../models'];

    let found = false;
    for await (const folder of folders) {
        const absPath = abs(`${folder}/${pkgName}`);

        if (existsSync(absPath)) {
            console.log(
                `Updating '${pkgName}' at path '${absPath}' to version '${version}' ${dryRun ? '[dry run]' : ''}`,
            );
            const pkgJson = await PackageJson.load(absPath);
            pkgJson.update({ version });

            const newDependencyVersions = {};
            const dependencies = pkgJson.content.dependencies;
            for (const depName of Object.keys(dependencies)) {
                if (versionMap.has(depName)) {
                    const newDependencyVersion = versionMap.get(depName);
                    console.log(
                        `-> Updating '${depName}' in package '${pkgName}' to version '${newDependencyVersion}' ${dryRun ? '[dry run]' : ''}`,
                    );
                    newDependencyVersions[depName] = newDependencyVersion;
                }
            }

            pkgJson.update({
                dependencies: {
                    ...pkgJson.content.dependencies,
                    ...newDependencyVersions,
                },
            });

            if (!dryRun) await pkgJson.save();
            found = true;
        }
    }

    if (!found) console.error(`Could not find '${pkgName}' in any of the folders`);
}

async function createRelease(dryRun, version, generateChangelog) {
    const { workspaceVersion, projectsVersionData } = await releaseVersion({
        specifier: version,
        verbose: true,
        dryRun,
    });

    const versionMap = new Map();
    for (const [pkgName, { newVersion }] of Object.entries(projectsVersionData)) {
        versionMap.set(`@llm-tools/${pkgName}`, newVersion);
    }

    console.log('Updating projects actual version to match NX computed values in dist');
    for await (const [pkgName, { newVersion }] of Object.entries(projectsVersionData)) {
        if (newVersion !== null) await updatePackageVersion(pkgName, newVersion, versionMap, dryRun);
        else console.log(`Skipping '${pkgName}' version update as it's already up to date`);
    }

    if (generateChangelog) {
        await releaseChangelog({
            versionData: projectsVersionData,
            version: workspaceVersion,
            verbose: true,
            dryRun,
        });
    }

    process.exit(0);
}

async function startReleasePipeline() {
    const args = arg({
        // Types
        '--ci': Boolean,
        '--dryRun': String,
        '--version': String,

        // Aliases
        '-d': '--dryRun',
        '-v': '--version',
    });

    const dryRun =
        args['--dryRun'] ??
        (args['--ci'] ? false : await confirm({ message: 'Is this a dry run?', default: true, required: true }));

    let version = 'patch';
    if (!args['--version']) {
        const specificVersion = await confirm({
            message: 'Do you want to provide a specific version?',
            default: false,
            required: true,
        });

        if (specificVersion) {
            version = await input({
                message: 'What version do you want to publish?',
                default: version,
                required: true,
            });
        }
    } else version = args['--version'];

    const generateChangelog = args['--ci'] ? false : true;
    await createRelease(dryRun, version, generateChangelog);
}

await startReleasePipeline();
