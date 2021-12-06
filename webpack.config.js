const {
    DefinePlugin,
    LoaderOptionsPlugin
} = require('webpack');
const libpath = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = [
    // Main application
    (env, { mode }) => {
        const dst = 'app/dst';
        const context = libpath.join(__dirname, 'src/main/');
        const isProduction = mode === 'production';

        const plugins = [
            new CleanWebpackPlugin({
                cleanOnceBeforeBuildPatterns: ['!index.html'],
                verbose: false,
                dry: false
            }),
            new DefinePlugin({
                'process.env': {
                    NODE_ENV: JSON.stringify(mode)
                },
                APP_VERSION: JSON.stringify((isProduction?'':'dev-')+process.env.npm_package_version)
            }),
            new LoaderOptionsPlugin({
                options: {
                    context
                }
            })
        ];

        return {
            context,
            entry: isProduction
                ? [context]
                : [
                    'webpack-dev-server/client?http://0.0.0.0:3000',
                    'webpack/hot/only-dev-server',
                    'react-hot-loader/patch',
                    context
                ],
            output: {
                path: libpath.join(__dirname, dst),
                publicPath: 'http://localhost:3000/',
                filename: '[name].js'
            },
            module: {
                rules: [
                    {
                        test: /\.js(x?)$/,
                        exclude: /node_modules/,
                        loader: 'babel-loader'
                    },
                    {
                        test: /\.css$/,
                        use: ['style-loader', 'css-loader']
                    }
                ]
            },
            resolve: {
                extensions: ['.js', '.jsx']
            },
            target: 'electron-renderer',
            plugins,
            devServer: {
                hot: true,
                port: 3000,
                host: '0.0.0.0',
                static: {
                    directory: libpath.join(__dirname, dst)
                }
            },
            devtool: 'inline-source-map',
            optimization: {
                splitChunks: {
                    name: 'vendor',
                    chunks: 'initial'
                }
            }
        };
    },
];
