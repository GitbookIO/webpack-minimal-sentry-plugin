/* @flow strict */
import fs from 'fs';
import PromisePool from 'es6-promise-pool';
import { Client as Sentry } from 'sentry-api';

type Options = {
    authToken: string,
    organization: string,
    project: string,
    version: string,
    deleteSourcemaps?: boolean,
    filenameTransform?: string => string,
    uploadConcurrency?: number
};

type SourceFileInfos = {
    name: string,
    path: string
};

const JS_REGEXP = /\.js$/;
const SOURCEMAP_REGEXP = /\.map$/;

class WebpackMinimalSentryPlugin {
    client: Sentry;
    options: Options;

    constructor(opts: Options) {
        this.validateOptions(opts);
        this.options = opts;

        this.client = new Sentry({
            token: opts.authToken
        });
    }

    /*
     * Ensure required options have been passed
     */
    validateOptions(opts: Options) {
        const { authToken, organization, project, version } = opts;
        if (!authToken) {
            throw new Error(
                'Invalid configuration, <authToken> was not provided'
            );
        }
        if (!organization) {
            throw new Error(
                'Invalid configuration, <organization> was not provided'
            );
        }
        if (!project) {
            throw new Error(
                'Invalid configuration, <project> was not provided'
            );
        }
        if (!version) {
            throw new Error(
                'Invalid configuration, <version> was not provided'
            );
        }
    }

    apply(compiler: *) {
        // Tap "afterEmit" to create release and sources
        compiler.hooks.afterEmit.tapPromise(
            'WebpackMinimalSentryPlugin',
            async (compilation): Promise<void> => {
                const sources = this.listSources(compilation);

                await this.createRelease();
                await this.uploadSources(sources);
            }
        );

        // Tap "done" to remove sourcemap files if needed
        compiler.hooks.done.tapPromise(
            'WebpackMinimalSentryPlugin',
            async (stats: *): Promise<void> => {
                if (this.options.deleteSourcemaps) {
                    await this.deleteSourcemaps(stats);
                }
            }
        );
    }

    /*
     * List of JS and sourcemaps files from compilation
     */
    listSources(compilation: *): SourceFileInfos[] {
        return Object.keys(compilation.assets)
            .map(name => {
                if (JS_REGEXP.test(name) || SOURCEMAP_REGEXP.test(name)) {
                    return {
                        name,
                        path: compilation.assets[name].existsAt
                    };
                }
                return null;
            })
            .filter(Boolean);
    }

    /*
     * Create the release on Sentry
     */
    async createRelease(): Promise<void> {
        const { organization, project, version } = this.options;
        await this.client.releases.create(organization, project, {
            version
        });
    }

    /*
     * Upload the source files for the current release
     */
    async uploadSources(sources: SourceFileInfos[]): Promise<void> {
        const concurrency = this.options.uploadConcurrency || Infinity;

        const pool = new PromisePool(() => {
            const source = sources.pop();
            if (!source) {
                return null;
            }

            return this.uploadSource(source);
        }, concurrency);

        return pool.start();
    }

    /*
     * Upload a source file for the current release
     */
    async uploadSource({ name, path }: SourceFileInfos): Promise<void> {
        const {
            organization,
            project,
            version,
            filenameTransform
        } = this.options;

        const file = fs.createReadStream(path);
        const filename = filenameTransform ? filenameTransform(name) : name;
        await this.client.releases.createFile(organization, project, version, {
            name: filename,
            file
        });
    }

    /*
     * Delete sourcemaps after compilation if needed
     */
    async deleteSourcemaps(stats: *): Promise<void> {
        Object.keys(stats.compilation.assets)
            .filter(name => SOURCEMAP_REGEXP.test(name))
            .forEach(name => {
                const { existsAt } = stats.compilation.assets[name];
                fs.unlinkSync(existsAt);
            });
    }
}

export default WebpackMinimalSentryPlugin;
