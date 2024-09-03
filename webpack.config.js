var path = require('path');
var fs = require('fs');
const glob = require('glob');
const webpack_rules = [];
const CopyPlugin = require('copy-webpack-plugin');
const config = require('./config/config');
require('@babel/polyfill');

//const NodemonPlugin = require( 'nodemon-webpack-plugin' )
var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function (x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function (mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });

function getEntries(pattern) {
  const entries = {};

  glob.sync(pattern).forEach((file) => {
    if (file.includes('.js'))
      entries[file.replace('.js', '')] = path.join(__dirname, file);
  });

  return entries;
}

const webpackOption = [{
  entry: ['@babel/polyfill', './public/scripts/reverb-placement-sdk.js'],
  target: ['web', 'es5'],
  output: {
    path: path.join(__dirname, 'dist', 'public', 'scripts'),
    filename: 'reverb-placement-sdk.min.js',
    libraryTarget: 'var',
    library: 'Webpack'
  },
  module: {
    rules: [
      {
        test: /reverb-placement-sdk.*.js$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: '@@BACK_URL',
              flags: 'g',
              replace: process.env.BACK_URL || 'http://localhost:5000'
            },
            {
              search: '@@FRONT_URL',
              flags: 'g',
              replace: process.env.FRONT_URL || 'http://localhost:4000'
            },
            {
              search: '@@MIXPANEL_TOKEN',
              flags: 'g',
              replace: config.ANALYTICS.MIXPANEL.TOKEN || ''
            },
            {
              search: '@@GA_ID',
              flags: 'g',
              replace: config.ANALYTICS.GA.TOKEN || ''
            },
            {
              search: '@@FP_JS_URL',
              flags: 'g',
              replace: process.env.FP_JS_URL || 'https://dist.soreto.com/cdn/fp.min.js'
            },
            {
              search: '@@TRACKING_API_URL',
              flags: 'g',
              replace: process.env.TRACKING_API_URL
            }
          ]
        }
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }

    ]
  }
}, {
  entry: ['./public/scripts/soreto.js'],
  target: ['web', 'es5'],
  output: {
    path: path.join(__dirname, 'dist', 'public', 'scripts'),
    filename: 'soreto.min.js',
    libraryTarget: 'var',
    library: 'SoretoJS'
  },
  module: {
    rules: [
      {
        test: /soreto.*.js$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: '@@BACK_URL',
              flags: 'g',
              replace: process.env.BACK_URL || 'http://localhost:5000'
            },
            {
              search: '@@FRONT_URL',
              flags: 'g',
              replace: process.env.FRONT_URL || 'http://localhost:4000'
            },
            {
              search: '@@DIST_URL',
              flags: 'g',
              replace: process.env.DIST_URL || 'http://localhost:8081'
            },
            {
              search: '@@AWIN_DYNAMIC_ROUTES_BASE_URL',
              flags: 'g',
              replace: process.env.AWIN_DYNAMIC_ROUTES_BASE_URL || 'http://127.0.0.1:8081'
            },
            {
              search: '@@PARTNERIZE_DYNAMIC_ROUTES_BASE_URL',
              flags: 'g',
              replace: process.env.PARTNERIZE_DYNAMIC_ROUTES_BASE_URL || 'http://127.0.0.1:8081'
            },
            {
              search: '@@TAG_LOG_URL',
              flags: 'g',
              replace: process.env.TAG_LOG_URL
            },
            {
              search: '@@TAG_LOG_ALLOWED_CLIENT_IDS',
              flags: 'g',
              replace: process.env.TAG_LOG_ALLOWED_CLIENT_IDS
            },
            {
              search: '@@TAG_LOG_ALLOWED_URLS',
              flags: 'g',
              replace: process.env.TAG_LOG_ALLOWED_URLS
            },
            {
              search: '@@TAG_LOG_ALLOW_UNKNOWN_SOURCE',
              flags: 'g',
              replace: process.env.TAG_LOG_ALLOW_UNKNOWN_SOURCE
            },
            {
              search: '@@TAG_ANALYSIS_SCRIPT_URL',
              flags: 'g',
              replace: process.env.TAG_ANALYSIS_SCRIPT_URL
            }
          ]
        }
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
}, {
  entry: getEntries('public/scripts/reverb-sdk*.js'),
  target: ['web', 'es5'],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].min.js',
  },
  //devtool: 'eval-source-map',
  plugins: [
    new CopyPlugin(
      {
        patterns: [
          {
            from: 'public',
            to: 'public',
            globOptions: {
              ignore: ['*.js']
            }
          }
        ]
      })
  ],
  module: {
    rules: [
      {
        test: /reverb-sdk.*.js$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: '@@BACK_URL',
              flags: 'g',
              replace: process.env.BACK_URL || 'http://localhost:5000'
            },
            {
              search: '@@FRONT_URL',
              flags: 'g',
              replace: process.env.FRONT_URL || 'http://localhost:4000'
            },
            {
              search: '@@DIST_URL',
              flags: 'g',
              replace: process.env.DIST_URL || 'http://localhost:8081'
            }
          ]
        }
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
},
{
  entry: './public/scripts/soreto-cookie-opt.js',
  target: ['web', 'es5'],
  output: {
    path: path.join(__dirname, 'dist', 'public', 'scripts'),
    filename: 'soreto-cookie-opt.min.js',
    libraryTarget: 'var',
    library: 'SoretoCookieOpt'
  }
},
{
  entry: './public/scripts/analysis/dsample.js',
  target: ['web', 'es5'],
  output: {
    path: path.join(__dirname, 'dist', 'public', 'scripts', 'analysis'),
    filename: 'dsample.min.js',
    libraryTarget: 'var',
    library: 'dsample'
  },
  module: {
    rules: [
      {
        test: /dsample.*.js$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: '@@TAG_ANALYSIS_DOM_SAMPLE_API_URL',
              flags: 'g',
              replace: process.env.TAG_ANALYSIS_DOM_SAMPLE_API_URL
            }
          ]
        }
      }
    ]
  }
}
];

let babelLoader = {
  test: /\.js$/,
  exclude: /(node_modules|bower_components)/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env']
    }
  }
};
webpack_rules.push(babelLoader);
module.exports = webpackOption;
