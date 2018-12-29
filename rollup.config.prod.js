import babel from 'rollup-plugin-babel';
import postcss from 'rollup-plugin-postcss';
import { terser } from "rollup-plugin-terser";


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
    file: 'dist/dnm-croppr.min.js',
    format: 'umd',
    name: 'Croppr',
    banner: banner
  },
  plugins: [ 
  	postcss({
  		extensions: [ '.css' ],
      extract: "dist/dnm-croppr.css"
    }),
  	babel(),
    terser()
  ]
};