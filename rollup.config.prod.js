import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import postcss from 'rollup-plugin-postcss';


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
  entry: 'src/index.js',
  plugins: [ 
  	postcss({
  		extensions: [ '.css' ],
      	inject: false
    }),
  	babel(),
  	uglify()
  ],
  format: 'umd',
  moduleName: 'Croppr',
  dest: 'dist/dnm-croppr.min.js',
  banner: banner
};