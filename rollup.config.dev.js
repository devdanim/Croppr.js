import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';
import cleanup from 'rollup-plugin-cleanup';

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
  plugins: [
    json(),
    babel(),
    cleanup({
      comments: 'jsdoc'
    })
  ],
  format: 'umd',
  moduleName: 'DmCroppr',
  dest: 'dist/dmcroppr.js',
  banner: banner
};