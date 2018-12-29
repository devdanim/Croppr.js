import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';

var banner = `/**
 * Fork from Croppr.js : https://github.com/jamesssooi/Croppr.js
 * Original author : James Ooi. 
 *
 * A JavaScript image cropper that's lightweight, awesome, and has
 * zero dependencies.
 * 
 * DmCroppr.js : https://github.com/devdanim/DmCroppr.js
 * Fork author : Adrien du Repaire
 *
 * Released under the MIT License.
 *
 */
`

export default {
  entry: 'src/index.js',
  plugins: [ json(), babel(), uglify() ],
  format: 'umd',
  moduleName: 'DmCroppr',
  dest: 'dist/dmcroppr.min.js',
  banner: banner
};r