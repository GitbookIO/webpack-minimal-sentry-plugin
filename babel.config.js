module.exports = function babelConfig(api) {
    api.cache(false);

    return {
        presets: ['@babel/preset-env', '@babel/preset-flow'],
        plugins: ['@babel/plugin-transform-runtime']
    };
};
