
const path = require('path');

module.exports = {
    mode: 'development', 
    entry: {
        client: './src/client/client.ts',
        menu: './src/client/menu.ts',
    },
    output: {
        filename: `[name].js`, 
        path: path.resolve(__dirname, 'dist'), 
    },
    module: {
        rules: [
            {
                test: /\.ts$/, 
                use: 'ts-loader', 
                exclude: /node_modules/, 
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'], 
    },
};