# webpack-minimal-sentry-plugin

A small webpack 4 plugin that uploads sources to Sentry.

# Install

```bash
$ yarn install --dev webpack-minimal-sentry-plugin
```

# Usage

```js
/* webpack.config.js */
const WebpackMinimalSentryPlugin = require('webpack-minimal-sentry-plugin');

module.exports = {
    // ...
    plugins: [
        // ...
        new WebpackMinimalSentryPlugin({
            authToken: 'personal_auth_token',
            organization: 'organization_slug',
            project: 'project_slug',
            version: 'release_version'
        })
    ]
};
```

# Options

```js
type Options = {
    authToken: string,
    organization: string,
    project: string,
    version: string,
    deleteSourcemaps?: boolean,
    filenameTransform?: string => string,
    uploadConcurrency?: number
};
```

## Required

`authToken`: [Personal Sentry Auth token](https://sentry.io/settings/account/api/auth-tokens/) including at least the `project:releases` scope.

`organization`: Sentry organization in which to create releases/upload sources.

`project`: Sentry project in which to create releases/upload sources.

`version`: A version identifier for this release. Can be a version number, a commit hash etc.

## Optional

`deleteSourcemaps`: Delete the sourcemaps at the end of the webpack build.

`filenameTransform`: A function to transform the webpack asset name before uploading to Sentry.

`uploadConcurrency`: Maximum number of sources uploaded at the same time. Can help prevent network errors in case of a webpack build containing numerous assets.
