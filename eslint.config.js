import defaults from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import nxEslintPlugin from '@nx/eslint-plugin';

const compat = new FlatCompat({
    recommendedConfig: defaults.configs.recommended,
});

export default [
    { plugins: { '@nx': nxEslintPlugin } },
    {
        files: ['**/*.ts', '**/*.js'],
        rules: {
            '@typescript-eslint/ban-ts-comment': 'off',
        },
    },
    {
        files: ['**/*.ts', '**/*.js'],
        ignores: ['**/eslint.config.js'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    allow: [],
                    enforceBuildableLibDependency: true,
                    depConstraints: [
                        {
                            sourceTag: '*',
                            onlyDependOnLibsWithTags: ['*'],
                        },
                    ],
                },
            ],
        },
    },
    ...compat.config({ extends: ['plugin:@nx/typescript'] }).map((config) => ({
        ...config,
        files: ['**/*.ts'],
        rules: {
            ...config.rules,
        },
    })),
    ...compat.config({ extends: ['plugin:@nx/javascript'] }).map((config) => ({
        ...config,
        files: ['**/*.js'],
        rules: {
            ...config.rules,
        },
    })),
];
