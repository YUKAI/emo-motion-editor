module.exports = (api) => {
    const plugins = [
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        ['@babel/plugin-proposal-class-properties', { loose: false }],
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-syntax-import-meta',
        '@babel/plugin-proposal-json-strings'
    ];
    const presets = [
        '@babel/react',
        [
            '@babel/env',
            {
                targets: {
                    chrome: 59
                }
            }
        ]
    ];

    if (api.env('development')) {
        plugins.push('react-hot-loader/babel');
    }

    return { plugins, presets };
};
