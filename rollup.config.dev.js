import babel from 'rollup-plugin-babel';
import cleanup from 'rollup-plugin-cleanup';
import postcss from 'rollup-plugin-postcss';
import resolve from 'rollup-plugin-node-resolve';


var banner = `/**
 * Fork from Croppr.js : https://github.com/jamesssooi/Croppr.js
 * Original author : James Ooi. 
 *
 * A JavaScript image cropper that's lightweight, awesome, and has
 * zero dependencies.
 * 
 * dnm-croppr : https://github.com/devdanim/dnm-croppr
 * Fork author : Adrien du Repaire
 *
 * Released under the MIT License.
 *
 */
`

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/dnm-croppr.js',
    format: 'umd',
    name: 'Croppr',
    banner: banner,
    globals: {
      'fast-average-color': 'FastAverageColor',
    }
  },
  plugins: [
    resolve(),
    postcss({
      extensions: [ '.css' ],
      extract: "dist/dnm-croppr.css"
    }),
    babel(),
    cleanup({
      comments: 'jsdoc'
    })
  ]
};