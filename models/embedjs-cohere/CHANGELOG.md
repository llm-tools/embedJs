## 0.1.9 (2024-10-21)

This was a version bump only for embedjs-cohere to align it with other projects, there were no code changes.

## 0.1.8 (2024-10-21)

This was a version bump only for embedjs-cohere to align it with other projects, there were no code changes.

## 0.1.7 (2024-10-15)

This was a version bump only for embedjs-cohere to align it with other projects, there were no code changes.

## 0.1.6 (2024-10-13)

This was a version bump only for embedjs-cohere to align it with other projects, there were no code changes.

## 0.1.5 (2024-10-11)

### 🩹 Fixes

-   minor changelog double lines removed ([7e3509a](https://github.com/llm-tools/embedJs/commit/7e3509a))

## 0.1.4 (2024-10-09)

### 🚀 Features

-   new doc website + merged conversations with cache ([28d918a](https://github.com/llm-tools/embedJs/commit/28d918a))

### 🩹 Fixes

-   remove changelog generation from github release ([87abd2b](https://github.com/llm-tools/embedJs/commit/87abd2b))

-   remove changelog generation from github release ([4aa3f18](https://github.com/llm-tools/embedJs/commit/4aa3f18))

-   capitalization on contributing.md ([0381453](https://github.com/llm-tools/embedJs/commit/0381453))

## 0.1.3 (2024-10-06)

SIMPLE_MODEL enum is back. Now you can configure a model by passing in this enum directly,

## 0.1.2 (2024-10-06)

### 🚀 Features

-   readded local-path and url loaders ([303133c](https://github.com/llm-tools/embedJs/commit/303133c))

### 🩹 Fixes

-   exclude examples from release process ([1382185](https://github.com/llm-tools/embedJs/commit/1382185))

-   downgrade esbuild version to match nx requirements ([183308f](https://github.com/llm-tools/embedJs/commit/183308f))

## 0.1.1 (2024-10-04)

Temporarily disabled dynamic, url and local path loaders as they required install of all modules from the monorepo. They will be reenabled soon.

## 0.1.0 (2024-10-03)

This component has been extracted and is now published as part of a workspace monorepo managed by [NX](https://nx.dev/). There are many reasons that prompted this move, but the most critical issue was to decouple the need to install all dependencies for a single usecase. While we add (and continue to add) more and more loaders, databases, caches and models - the number of shared dependencies grew a lot. Most projects will not use all these combinations and it made no sense to have them all installed for everyone. Further, issues with dependent packages raised vulnerabilities that affected all projects - clearly something we did not intend.

Now what? Starting with version 0.1.0, We have switched to a monorepo based approach. All packages will have the same version number but changelogs and dependencies will be independent. You only need to install the relevant addons (loaders, models, databases, etc) specific to your usecase. Given the shortage of maintainers, we will not be able to support the non-monorepo version of the library beyond critical bugfixes for the next three months, post which the older version will not receive any security fixes. We strongly recommend upgrading to the newer version as soon as you can.
