/**
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

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Croppr = factory());
}(this, function () { 'use strict';

  (function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame) window.requestAnimationFrame = function (callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function () {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
    if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function (id) {
      clearTimeout(id);
    };
  })();
  (function () {
    if (typeof window.CustomEvent === "function") return false;
    function CustomEvent(event, params) {
      params = params || {
        bubbles: false,
        cancelable: false,
        detail: undefined
      };
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    }
    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;
  })();
  (function (window) {
    try {
      new CustomEvent('test');
      return false;
    } catch (e) {}
    function MouseEvent(eventType, params) {
      params = params || {
        bubbles: false,
        cancelable: false
      };
      var mouseEvent = document.createEvent('MouseEvent');
      mouseEvent.initMouseEvent(eventType, params.bubbles, params.cancelable, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      return mouseEvent;
    }
    MouseEvent.prototype = Event.prototype;
    window.MouseEvent = MouseEvent;
  })(window);

  class Handle {
    /**
     * Creates a new Handle instance.
     * @constructor
     * @param {Array} position The x and y ratio position of the handle
     *      within the crop region. Accepts a value between 0 to 1 in the order
     *      of [X, Y].
     * @param {Array} constraints Define the side of the crop region that
     *      is to be affected by this handle. Accepts a value of 0 or 1 in the
     *      order of [TOP, RIGHT, BOTTOM, LEFT].
     * @param {String} cursor The CSS cursor of this handle.
     * @param {Element} eventBus The element to dispatch events to.
     */
    constructor(position, constraints, cursor, eventBus) {
      var self = this;
      this.position = position;
      this.constraints = constraints;
      this.cursor = cursor;
      this.eventBus = eventBus;
      this.el = document.createElement('div');
      this.el.className = 'croppr-handle';
      this.el.style.cursor = cursor;
      this.el.addEventListener('mousedown', onMouseDown);
      function onMouseDown(e) {
        e.stopPropagation();
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousemove', onMouseMove);
        self.eventBus.dispatchEvent(new CustomEvent('handlestart', {
          detail: {
            handle: self
          }
        }));
      }
      function onMouseUp(e) {
        e.stopPropagation();
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
        self.eventBus.dispatchEvent(new CustomEvent('handleend', {
          detail: {
            handle: self
          }
        }));
      }
      function onMouseMove(e) {
        e.stopPropagation();
        self.eventBus.dispatchEvent(new CustomEvent('handlemove', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
    }
  }

  class Box {
    /**
     * Creates a new Box instance.
     * @constructor
     * @param {Number} x1
     * @param {Number} y1
     * @param {Number} x2
     * @param {Number} y2
     */
    constructor(x1, y1, x2, y2) {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
    }
    /**
     * Sets the new dimensions of the box.
     * @param {Number} x1
     * @param {Number} y1
     * @param {Number} x2
     * @param {Number} y2
     */
    set(x1 = null, y1 = null, x2 = null, y2 = null) {
      this.x1 = x1 == null ? this.x1 : x1;
      this.y1 = y1 == null ? this.y1 : y1;
      this.x2 = x2 == null ? this.x2 : x2;
      this.y2 = y2 == null ? this.y2 : y2;
      return this;
    }
    /**
     * Calculates the width of the box.
     * @returns {Number}
     */
    width() {
      return Math.abs(this.x2 - this.x1);
    }
    /**
     * Calculates the height of the box.
     * @returns {Number}
     */
    height() {
      return Math.abs(this.y2 - this.y1);
    }
    /**
     * Resizes the box to a new size.
     * @param {Number} newWidth
     * @param {Number} newHeight
     * @param {Array} [origin] The origin point to resize from.
     *      Defaults to [0, 0] (top left).
     */
    resize(newWidth, newHeight, origin = [0, 0]) {
      const fromX = this.x1 + this.width() * origin[0];
      const fromY = this.y1 + this.height() * origin[1];
      this.x1 = fromX - newWidth * origin[0];
      this.y1 = fromY - newHeight * origin[1];
      this.x2 = this.x1 + newWidth;
      this.y2 = this.y1 + newHeight;
      return this;
    }
    /**
     * Scale the box by a factor.
     * @param {Number} factor
     * @param {Array} [origin] The origin point to resize from.
     *      Defaults to [0, 0] (top left).
     */
    scale(factor, origin = [0, 0], containerWidth = null, containerHeight = null) {
      const newWidth = this.width() * factor;
      const newHeight = this.height() * factor;
      this.resize(newWidth, newHeight, origin);
      return this;
    }
    move(x = null, y = null) {
      let width = this.width();
      let height = this.height();
      x = x === null ? this.x1 : x;
      y = y === null ? this.y1 : y;
      this.x1 = x;
      this.y1 = y;
      this.x2 = x + width;
      this.y2 = y + height;
      return this;
    }
    /**
     * Get relative x and y coordinates of a given point within the box.
     * @param {Array} point The x and y ratio position within the box.
     * @returns {Array} The x and y coordinates [x, y].
     */
    getRelativePoint(point = [0, 0]) {
      const x = this.width() * point[0];
      const y = this.height() * point[1];
      return [x, y];
    }
    /**
     * Get absolute x and y coordinates of a given point within the box.
     * @param {Array} point The x and y ratio position within the box.
     * @returns {Array} The x and y coordinates [x, y].
     */
    getAbsolutePoint(point = [0, 0]) {
      const x = this.x1 + this.width() * point[0];
      const y = this.y1 + this.height() * point[1];
      return [x, y];
    }
    getRatio(minRatio = null, maxRatio = null) {
      if (minRatio === null) return null;
      if (maxRatio === null) return minRatio;
      const imageRatio = this.width() / this.height();
      if (minRatio > maxRatio) {
        let tempRatio = minRatio;
        minRatio = maxRatio;
        maxRatio = tempRatio;
      }
      if (imageRatio > maxRatio) return maxRatio;else if (imageRatio < minRatio) return minRatio;else return imageRatio;
    }
    /**
     * Constrain the box to a fixed ratio.
     * @param {Number} ratio
     * @param {Array} [origin] The origin point to resize from.
     *     Defaults to [0, 0] (top left).
     * @param {String} [grow] The axis to grow to maintain the ratio.
     *     Defaults to 'height'.
     */
    constrainToRatio(ratio = null, origin = [0, 0], grow = 'height', maxRatio = null) {
      if (ratio === null) {
        return;
      }
      const width = this.width();
      const height = this.height();
      if (maxRatio !== null) {
        let minRatio = ratio;
        if (minRatio > maxRatio) {
          minRatio = maxRatio;
          maxRatio = ratio;
        }
        let cropRatio = width / height;
        if (cropRatio < minRatio || cropRatio > maxRatio) {
          let constrainWidth = width;
          let constrainHeight = height;
          if (cropRatio > maxRatio) constrainHeight = width / maxRatio;else constrainWidth = height * minRatio;
          this.resize(constrainWidth, constrainHeight, origin);
        }
      } else {
        switch (grow) {
          case 'height':
            this.resize(width, width / ratio, origin);
            break;
          case 'width':
            this.resize(height * ratio, height, origin);
            break;
          default:
            this.resize(width, width / ratio, origin);
        }
      }
      return this;
    }
    /**
     * Constrain the box within a boundary.
     * @param {Number} boundaryWidth
     * @param {Number} boundaryHeight
     * @param {Array} [origin] The origin point to resize from.
     *     Defaults to [0, 0] (top left).
     */
    constrainToBoundary(boundaryWidth, boundaryHeight, origin = [0, 0]) {
      const [originX, originY] = this.getAbsolutePoint(origin);
      const maxIfLeft = originX;
      const maxIfTop = originY;
      const maxIfRight = boundaryWidth - originX;
      const maxIfBottom = boundaryHeight - originY;
      const directionX = -2 * origin[0] + 1;
      const directionY = -2 * origin[1] + 1;
      let [maxWidth, maxHeight] = [null, null];
      switch (directionX) {
        case -1:
          maxWidth = maxIfLeft;
          break;
        case 0:
          maxWidth = Math.min(maxIfLeft, maxIfRight) * 2;
          break;
        case +1:
          maxWidth = maxIfRight;
          break;
      }
      switch (directionY) {
        case -1:
          maxHeight = maxIfTop;
          break;
        case 0:
          maxHeight = Math.min(maxIfTop, maxIfBottom) * 2;
          break;
        case +1:
          maxHeight = maxIfBottom;
          break;
      }
      if (this.width() > maxWidth) {
        const factor = maxWidth / this.width();
        this.scale(factor, origin);
      }
      if (this.height() > maxHeight) {
        const factor = maxHeight / this.height();
        this.scale(factor, origin);
      }
      return this;
    }
    /**
     * Constrain the box to a maximum/minimum size.
     * @param {Number} [maxWidth]
     * @param {Number} [maxHeight]
     * @param {Number} [minWidth]
     * @param {Number} [minHeight]
     * @param {Array} [origin] The origin point to resize from.
     *     Defaults to [0, 0] (top left).
     * @param {Number} [ratio] Ratio to maintain.
     */
    constrainToSize(maxWidth = null, maxHeight = null, minWidth = null, minHeight = null, origin = [0, 0], minRatio = null, maxRatio = null) {
      let ratio = this.getRatio(minRatio, maxRatio);
      if (maxWidth && this.width() > maxWidth) {
        const newWidth = maxWidth,
              newHeight = ratio === null ? this.height() : maxWidth / ratio;
        this.resize(newWidth, newHeight, origin);
      }
      if (maxHeight && this.height() > maxHeight) {
        const newWidth = ratio === null ? this.width() : maxHeight * ratio,
              newHeight = maxHeight;
        this.resize(newWidth, newHeight, origin);
      }
      if (minWidth && this.width() < minWidth) {
        const newWidth = minWidth,
              newHeight = ratio === null ? this.height() : minWidth / ratio;
        this.resize(newWidth, newHeight, origin);
      }
      if (minHeight && this.height() < minHeight) {
        const newWidth = ratio === null ? this.width() : minHeight * ratio,
              newHeight = minHeight;
        this.resize(newWidth, newHeight, origin);
      }
      return this;
    }
  }

  /**
   * Binds an element's touch events to be simulated as mouse events.
   * @param {Element} element
   */
  function enableTouch(element) {
    element.addEventListener('touchstart', simulateMouseEvent);
    element.addEventListener('touchend', simulateMouseEvent);
    element.addEventListener('touchmove', simulateMouseEvent);
  }
  /**
   * Translates a touch event to a mouse event.
   * @param {Event} e
   */
  function simulateMouseEvent(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const eventMap = {
      'touchstart': 'mousedown',
      'touchmove': 'mousemove',
      'touchend': 'mouseup'
    };
    touch.target.dispatchEvent(new MouseEvent(eventMap[e.type], {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY
    }));
  }

  /**
   * Define a list of handles to create.
   *
   * @property {Array} position - The x and y ratio position of the handle within
   *      the crop region. Accepts a value between 0 to 1 in the order of [X, Y].
   * @property {Array} constraints - Define the side of the crop region that is to
   *      be affected by this handle. Accepts a value of 0 or 1 in the order of
   *      [TOP, RIGHT, BOTTOM, LEFT].
   * @property {String} cursor - The CSS cursor of this handle.
   */
  const HANDLES = [{
    position: [0.0, 0.0],
    constraints: [1, 0, 0, 1],
    cursor: 'nw-resize'
  }, {
    position: [0.5, 0.0],
    constraints: [1, 0, 0, 0],
    cursor: 'n-resize'
  }, {
    position: [1.0, 0.0],
    constraints: [1, 1, 0, 0],
    cursor: 'ne-resize'
  }, {
    position: [1.0, 0.5],
    constraints: [0, 1, 0, 0],
    cursor: 'e-resize'
  }, {
    position: [1.0, 1.0],
    constraints: [0, 1, 1, 0],
    cursor: 'se-resize'
  }, {
    position: [0.5, 1.0],
    constraints: [0, 0, 1, 0],
    cursor: 's-resize'
  }, {
    position: [0.0, 1.0],
    constraints: [0, 0, 1, 1],
    cursor: 'sw-resize'
  }, {
    position: [0.0, 0.5],
    constraints: [0, 0, 0, 1],
    cursor: 'w-resize'
  }];
  class CropprCore {
    constructor(element, options, deferred = false) {
      this.initOptions = options;
      this.options = this.parseOptions(options);
      element = this.getElement(element);
      if (!element.getAttribute('src')) {
        throw 'Image src not provided.';
      }
      this._initialized = false;
      this._restore = {
        parent: element.parentNode,
        element: element
      };
      if (this.options.preview) {
        this._restore.preview = this.options.preview;
        this._restore.parentPreview = this.options.preview.parentNode;
      }
      if (!deferred) {
        if (element.width === 0 || element.height === 0) {
          element.onload = () => {
            this.initialize(element);
          };
        } else {
          this.initialize(element);
        }
      }
    }
    initialize(element) {
      this.createDOM(element);
      this.getSourceSize();
      this.attachHandlerEvents();
      this.attachRegionEvents();
      this.attachOverlayEvents();
      this.showModal("init");
      this.initializeBox(null, false);
      this.strictlyConstrain();
      this.redraw();
      this.resetModal("init");
      this._initialized = true;
      if (this.options.onInitialize !== null) {
        this.options.onInitialize(this);
      }
      this.cropperEl.onwheel = event => {
        event.preventDefault();
        let {
          deltaY
        } = event;
        const maxDelta = 0.05;
        let coeff = deltaY > 0 ? 1 : -1;
        deltaY = Math.abs(deltaY) / 100;
        deltaY = deltaY > maxDelta ? maxDelta : deltaY;
        deltaY = 1 + coeff * deltaY;
        this.scaleBy(deltaY);
        if (this.options.onCropMove !== null) {
          this.options.onCropMove(this.getValue());
        }
        if (this.options.onCropStart !== null) {
          this.options.onCropStart(this.getValue());
        }
      };
      if (this.options.responsive) {
        let onResize;
        const resizeFunc = () => {
          let newOptions = this.options;
          let cropData = this.responsiveData;
          const controlKeys = ["x", "y", "width", "height"];
          for (var i = 0; i < controlKeys.length; i++) {
            cropData[controlKeys[i]] *= 100;
            cropData[controlKeys[i]] = cropData[controlKeys[i]] > 100 ? 100 : cropData[controlKeys[i]] < 0 ? 0 : cropData[controlKeys[i]];
          }
          newOptions.startPosition = [cropData.x, cropData.y, "%"];
          newOptions.startSize = [cropData.width, cropData.height, "%"];
          newOptions = this.parseOptions(newOptions);
          this.showModal("onResize");
          this.initializeBox(newOptions);
          this.resetModal("onResize");
        };
        window.onresize = function () {
          clearTimeout(onResize);
          onResize = setTimeout(() => {
            resizeFunc();
          }, 100);
        };
      }
    }
    getElement(element, type) {
      if (element) {
        if (!element.nodeName) {
          element = document.querySelector(element);
          if (element == null) {
            throw 'Unable to find element.';
          }
        }
      }
      return element;
    }
    createDOM(targetEl) {
      this.containerEl = document.createElement('div');
      this.containerEl.className = 'croppr-container';
      this.eventBus = this.containerEl;
      enableTouch(this.containerEl);
      this.cropperEl = document.createElement('div');
      this.cropperEl.className = 'croppr';
      this.imageEl = document.createElement('img');
      this.imageEl.setAttribute('src', targetEl.getAttribute('src'));
      this.imageEl.setAttribute('alt', targetEl.getAttribute('alt'));
      this.imageEl.className = 'croppr-image';
      this.imageClippedEl = this.imageEl.cloneNode();
      this.imageClippedEl.className = 'croppr-imageClipped';
      this.regionEl = document.createElement('div');
      this.regionEl.className = 'croppr-region';
      this.overlayEl = document.createElement('div');
      this.overlayEl.className = 'croppr-overlay';
      let handleContainerEl = document.createElement('div');
      handleContainerEl.className = 'croppr-handleContainer';
      this.handles = [];
      for (let i = 0; i < HANDLES.length; i++) {
        const handle = new Handle(HANDLES[i].position, HANDLES[i].constraints, HANDLES[i].cursor, this.eventBus);
        this.handles.push(handle);
        handleContainerEl.appendChild(handle.el);
      }
      this.cropperEl.appendChild(this.imageEl);
      this.cropperEl.appendChild(this.imageClippedEl);
      this.cropperEl.appendChild(this.regionEl);
      this.cropperEl.appendChild(this.overlayEl);
      this.cropperEl.appendChild(handleContainerEl);
      this.containerEl.appendChild(this.cropperEl);
      targetEl.parentElement.replaceChild(this.containerEl, targetEl);
      this.setLivePreview();
    }
    setLivePreview() {
      if (this.options.preview) {
        this.preview = {};
        this.preview.parent = this.options.preview;
        this.preview.parent.style.position = "relative";
        let new_container = document.createElement("div");
        this.preview.container = this.preview.parent.appendChild(new_container);
        this.preview.container.style.overflow = "hidden";
        this.preview.container.style.position = "absolute";
        this.preview.container.style.top = "50%";
        this.preview.container.style.left = "50%";
        this.preview.container.style.transform = "translate(-50%, -50%)";
      }
    }
    resizePreview(cropData = null) {
      if (cropData === null) cropData = this.getValue("ratio");
      if (this.preview && cropData.width && cropData.height) {
        const targetWidth = this.preview.parent.offsetWidth;
        const targetHeight = this.preview.parent.offsetHeight;
        const targetRatio = targetWidth / targetHeight;
        const cropWidth = this.sourceSize.width * cropData.width;
        const cropHeight = this.sourceSize.height * cropData.height;
        const cropRatio = cropWidth / cropHeight;
        let containerWidth = targetWidth;
        let containerHeight = targetHeight;
        if (targetRatio > cropRatio) {
          containerWidth = containerHeight * cropRatio;
        } else {
          containerHeight = containerWidth / cropRatio;
        }
        this.preview.container.style.width = containerWidth + "px";
        this.preview.container.style.height = containerHeight + "px";
        let resizeWidth = this.sourceSize.width * containerWidth / cropWidth;
        let resizeHeight = this.sourceSize.height * containerHeight / cropHeight;
        let deltaX = -cropData.x * resizeWidth;
        let deltaY = -cropData.y * resizeHeight;
        this.preview.image.style.width = resizeWidth + "px";
        this.preview.image.style.height = resizeHeight + "px";
        this.preview.image.style.left = deltaX + "px";
        this.preview.image.style.top = deltaY + "px";
      }
    }
    strictlyConstrain(opts = null, origin = null) {
      let origins;
      if (origin === null) {
        origins = [[0, 0], [1, 1]];
        origin = [.5, .5];
      } else {
        origins = [origin];
      }
      if (opts === null) opts = this.options;
      const {
        width: parentWidth,
        height: parentHeight
      } = this.imageEl.getBoundingClientRect();
      this.box.constrainToRatio(opts.aspectRatio, origin, "height", opts.maxAspectRatio);
      this.box.constrainToSize(opts.maxSize.width, opts.maxSize.height, opts.minSize.width, opts.minSize.height, origin, opts.aspectRatio, opts.maxAspectRatio);
      origins.map(newOrigin => {
        this.box.constrainToBoundary(parentWidth, parentHeight, newOrigin);
      });
    }
    /**
     * Changes the image src.
     * @param {String} src
     */
    setImage(src, callback) {
      this.imageEl.onload = () => {
        this.getSourceSize();
        this.options = this.parseOptions(this.initOptions);
        this.showModal("setImage");
        this.initializeBox(null, false);
        this.strictlyConstrain();
        this.redraw();
        this.resetModal("setImage");
        if (callback) callback();
      };
      this.imageEl.src = src;
      this.imageClippedEl.src = src;
      return this;
    }
    destroy() {
      this._restore.parent.replaceChild(this._restore.element, this.containerEl);
      if (this.options.preview) {
        this.preview.image.parentNode.removeChild(this.preview.image);
        this.preview.container.parentNode.removeChild(this.preview.container);
      }
    }
    /**
     * Create a new box region with a set of options.
     * @param {Object} opts The options.
     * @returns {Box}
     */
    initializeBox(opts = null, constrain = true) {
      if (opts === null) opts = this.options;
      this.convertOptionsToPixels(opts);
      let boxWidth = opts.startSize.width;
      let boxHeight = opts.startSize.height;
      if (opts.minSize) {
        if (boxWidth < opts.minSize.width) boxWidth = opts.minSize.width;else if (boxWidth < opts.maxSize.width) boxWidth = opts.maxSize.width;
      }
      if (opts.maxSize) {
        if (boxHeight < opts.minSize.height) boxHeight = opts.minSize.height;else if (boxHeight < opts.maxSize.height) boxHeight = opts.maxSize.height;
      }
      let box = new Box(0, 0, boxWidth, boxHeight);
      let x = 0;
      let y = 0;
      if (opts.startPosition === null) {
        const {
          width: parentWidth,
          height: parentHeight
        } = this.imageEl.getBoundingClientRect();
        x = parentWidth / 2 - boxWidth / 2;
        y = parentHeight / 2 - boxHeight / 2;
      } else {
        x = opts.startPosition.x;
        y = opts.startPosition.y;
      }
      box.move(x, y);
      if (this.preview) {
        if (this.preview.image) {
          this.preview.image.parentNode.removeChild(this.preview.image);
          this.preview.image = null;
        }
        let new_img = document.createElement("img");
        new_img.src = this.imageEl.src;
        this.preview.image = this.preview.container.appendChild(new_img);
        this.preview.image.style.position = "relative";
      }
      if (constrain === true) this.strictlyConstrain();
      this.box = box;
      this.redraw();
      for (var i = 0; i < this.handles.length; i++) {
        if (this.options.maxAspectRatio && (this.handles[i].position[0] == 0.5 || this.handles[i].position[1] == 0.5)) {
          this.handles[i].el.style.display = "none";
        } else {
          this.handles[i].el.style.display = "block";
        }
      }
      return box;
    }
    showModal(operationName = "default") {
      let modalStyle = this.modalStyle;
      if (modalStyle && modalStyle.modalIsDisplayed === true) {
        return modalStyle;
      }
      if (this.options.modal) {
        let {
          modal
        } = this.options;
        let display = modal.currentStyle ? modal.currentStyle.display : getComputedStyle(modal, null).display;
        let visibility = modal.currentStyle ? modal.currentStyle.visibility : getComputedStyle(modal, null).visibility;
        modalStyle = {
          operationName: operationName,
          modalIsDisplayed: true,
          display: display,
          visibility: visibility
        };
        this.modalStyle = modalStyle;
        if (display === "none") {
          modal.style.visibility = "hidden";
          modal.style.display = "block";
        }
      }
      return modalStyle;
    }
    resetModal(oldOperationName = "default") {
      let modalStyle = this.modalStyle;
      if (modalStyle) {
        let {
          visibility,
          display,
          operationName,
          modalIsDisplayed
        } = modalStyle;
        if (modalIsDisplayed && oldOperationName === operationName) {
          let {
            modal
          } = this.options;
          modal.style.visibility = visibility;
          modal.style.display = display;
          this.modalStyle = {
            operationName: null,
            modalIsDisplayed: false
          };
        }
      }
    }
    getSourceSize() {
      this.sourceSize = {};
      this.sourceSize.width = this.imageEl.naturalWidth;
      this.sourceSize.height = this.imageEl.naturalHeight;
      return this.sourceSize;
    }
    convertor(data, inputMode, outputMode) {
      const convertRealDataToPixel = data => {
        this.showModal();
        const {
          width,
          height
        } = this.imageEl.getBoundingClientRect();
        this.resetModal();
        const factorX = this.sourceSize.width / width;
        const factorY = this.sourceSize.height / height;
        if (data.width) {
          data.width /= factorX;
        }
        if (data.x) {
          data.x /= factorX;
        }
        if (data.height) {
          data.height /= factorY;
        }
        if (data.y) {
          data.y /= factorY;
        }
        return data;
      };
      const convertPercentToPixel = data => {
        this.showModal();
        const {
          width,
          height
        } = this.imageEl.getBoundingClientRect();
        this.resetModal();
        if (data.width) {
          data.width = data.width / 100 * width;
        }
        if (data.x) {
          data.x = data.x / 100 * width;
        }
        if (data.height) {
          data.height = data.height / 100 * height;
        }
        if (data.y) {
          data.y = data.y / 100 * height;
        }
        return data;
      };
      if (inputMode === "real" && outputMode === "px") {
        return convertRealDataToPixel(data);
      } else if (inputMode === "%" && outputMode === "px") {
        return convertPercentToPixel(data);
      }
      return null;
    }
    convertOptionsToPixels(opts = null) {
      let setOptions = false;
      if (opts === null) {
        opts = this.options;
        setOptions = true;
      }
      const {
        width,
        height
      } = this.imageEl.getBoundingClientRect();
      const sizeKeys = ['maxSize', 'minSize', 'startSize', 'startPosition'];
      for (let i = 0; i < sizeKeys.length; i++) {
        const key = sizeKeys[i];
        if (opts[key] !== null) {
          if (opts[key].unit == '%') {
            opts[key] = this.convertor(opts[key], "%", "px");
          } else if (opts[key].real === true) {
            opts[key] = this.convertor(opts[key], "real", "px");
          }
          delete opts[key].unit;
        }
      }
      if (opts.minSize) {
        if (opts.minSize.width > width) opts.minSize.width = width;
        if (opts.minSize.height > height) opts.minSize.height = height;
      }
      if (opts.startSize && opts.startPosition) {
        let xEnd = opts.startPosition.x + opts.startSize.width;
        if (xEnd > width) opts.startPosition.x -= xEnd - width;
        let yEnd = opts.startPosition.y + opts.startSize.height;
        if (yEnd > height) opts.startPosition.y -= yEnd - height;
      }
      if (setOptions) this.options = opts;
      return opts;
    }
    redraw() {
      this.resizePreview();
      const width = Math.round(this.box.width()),
            height = Math.round(this.box.height()),
            x1 = Math.round(this.box.x1),
            y1 = Math.round(this.box.y1),
            x2 = Math.round(this.box.x2),
            y2 = Math.round(this.box.y2);
      window.requestAnimationFrame(() => {
        this.regionEl.style.transform = `translate(${x1}px, ${y1}px)`;
        this.regionEl.style.width = width + 'px';
        this.regionEl.style.height = height + 'px';
        this.imageClippedEl.style.clip = `rect(${y1}px, ${x2}px, ${y2}px, ${x1}px)`;
        const center = this.box.getAbsolutePoint([.5, .5]);
        const {
          width: parentWidth,
          height: parentHeight
        } = this.imageEl.getBoundingClientRect();
        const xSign = center[0] - parentWidth / 2 >> 31;
        const ySign = center[1] - parentHeight / 2 >> 31;
        const quadrant = (xSign ^ ySign) + ySign + ySign + 4;
        const foregroundHandleIndex = -2 * quadrant + 8;
        for (let i = 0; i < this.handles.length; i++) {
          let handle = this.handles[i];
          const handleWidth = handle.el.offsetWidth;
          const handleHeight = handle.el.offsetHeight;
          const left = x1 + width * handle.position[0] - handleWidth / 2;
          const top = y1 + height * handle.position[1] - handleHeight / 2;
          handle.el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
          handle.el.style.zIndex = foregroundHandleIndex == i ? 5 : 4;
        }
      });
    }
    attachHandlerEvents() {
      const eventBus = this.eventBus;
      eventBus.addEventListener('handlestart', this.onHandleMoveStart.bind(this));
      eventBus.addEventListener('handlemove', this.onHandleMoveMoving.bind(this));
      eventBus.addEventListener('handleend', this.onHandleMoveEnd.bind(this));
    }
    attachRegionEvents() {
      const eventBus = this.eventBus;
      this.regionEl.addEventListener('mousedown', onMouseDown);
      eventBus.addEventListener('regionstart', this.onRegionMoveStart.bind(this));
      eventBus.addEventListener('regionmove', this.onRegionMoveMoving.bind(this));
      eventBus.addEventListener('regionend', this.onRegionMoveEnd.bind(this));
      function onMouseDown(e) {
        e.stopPropagation();
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousemove', onMouseMove);
        eventBus.dispatchEvent(new CustomEvent('regionstart', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
      function onMouseMove(e) {
        e.stopPropagation();
        eventBus.dispatchEvent(new CustomEvent('regionmove', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
      function onMouseUp(e) {
        e.stopPropagation();
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
        eventBus.dispatchEvent(new CustomEvent('regionend', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
    }
    attachOverlayEvents() {
      const SOUTHEAST_HANDLE_IDX = 4;
      const self = this;
      let tmpBox = null;
      this.overlayEl.addEventListener('mousedown', onMouseDown);
      function onMouseDown(e) {
        e.stopPropagation();
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousemove', onMouseMove);
        const container = self.cropperEl.getBoundingClientRect();
        const mouseX = e.clientX - container.left;
        const mouseY = e.clientY - container.top;
        tmpBox = self.box;
        self.box = new Box(mouseX, mouseY, mouseX + 1, mouseY + 1);
        self.eventBus.dispatchEvent(new CustomEvent('handlestart', {
          detail: {
            handle: self.handles[SOUTHEAST_HANDLE_IDX]
          }
        }));
      }
      function onMouseMove(e) {
        e.stopPropagation();
        self.eventBus.dispatchEvent(new CustomEvent('handlemove', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
      function onMouseUp(e) {
        e.stopPropagation();
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
        if (self.box.width() === 1 && self.box.height() === 1) {
          self.box = tmpBox;
          return;
        }
        self.eventBus.dispatchEvent(new CustomEvent('handleend', {
          detail: {
            mouseX: e.clientX,
            mouseY: e.clientY
          }
        }));
      }
    }
    onHandleMoveStart(e) {
      let handle = e.detail.handle;
      const originPoint = [1 - handle.position[0], 1 - handle.position[1]];
      let [originX, originY] = this.box.getAbsolutePoint(originPoint);
      this.activeHandle = {
        handle,
        originPoint,
        originX,
        originY
      };
      if (this.options.onCropStart !== null) {
        this.options.onCropStart(this.getValue());
      }
    }
    onHandleMoveMoving(e) {
      let {
        mouseX,
        mouseY
      } = e.detail;
      let container = this.cropperEl.getBoundingClientRect();
      mouseX = mouseX - container.left;
      mouseY = mouseY - container.top;
      if (mouseX < 0) {
        mouseX = 0;
      } else if (mouseX > container.width) {
        mouseX = container.width;
      }
      if (mouseY < 0) {
        mouseY = 0;
      } else if (mouseY > container.height) {
        mouseY = container.height;
      }
      let origin = this.activeHandle.originPoint.slice();
      const originX = this.activeHandle.originX;
      const originY = this.activeHandle.originY;
      const handle = this.activeHandle.handle;
      const TOP_MOVABLE = handle.constraints[0] === 1;
      const RIGHT_MOVABLE = handle.constraints[1] === 1;
      const BOTTOM_MOVABLE = handle.constraints[2] === 1;
      const LEFT_MOVABLE = handle.constraints[3] === 1;
      const MULTI_AXIS = (LEFT_MOVABLE || RIGHT_MOVABLE) && (TOP_MOVABLE || BOTTOM_MOVABLE);
      let x1 = LEFT_MOVABLE || RIGHT_MOVABLE ? originX : this.box.x1;
      let x2 = LEFT_MOVABLE || RIGHT_MOVABLE ? originX : this.box.x2;
      let y1 = TOP_MOVABLE || BOTTOM_MOVABLE ? originY : this.box.y1;
      let y2 = TOP_MOVABLE || BOTTOM_MOVABLE ? originY : this.box.y2;
      x1 = LEFT_MOVABLE ? mouseX : x1;
      x2 = RIGHT_MOVABLE ? mouseX : x2;
      y1 = TOP_MOVABLE ? mouseY : y1;
      y2 = BOTTOM_MOVABLE ? mouseY : y2;
      let [isFlippedX, isFlippedY] = [false, false];
      if (LEFT_MOVABLE || RIGHT_MOVABLE) {
        isFlippedX = LEFT_MOVABLE ? mouseX > originX : mouseX < originX;
      }
      if (TOP_MOVABLE || BOTTOM_MOVABLE) {
        isFlippedY = TOP_MOVABLE ? mouseY > originY : mouseY < originY;
      }
      if (isFlippedX) {
        const tmp = x1;
        x1 = x2;
        x2 = tmp;
        origin[0] = 1 - origin[0];
      }
      if (isFlippedY) {
        const tmp = y1;
        y1 = y2;
        y2 = tmp;
        origin[1] = 1 - origin[1];
      }
      let box = new Box(x1, y1, x2, y2);
      if (this.options.aspectRatio) {
        let ratio = this.options.aspectRatio;
        let isVerticalMovement = false;
        if (MULTI_AXIS) {
          isVerticalMovement = mouseY > box.y1 + ratio * box.width() || mouseY < box.y2 - ratio * box.width();
        } else if (TOP_MOVABLE || BOTTOM_MOVABLE) {
          isVerticalMovement = true;
        }
        const ratioMode = isVerticalMovement ? 'width' : 'height';
        box.constrainToRatio(ratio, origin, ratioMode, this.options.maxAspectRatio);
      }
      box.constrainToSize(this.options.maxSize.width, this.options.maxSize.height, this.options.minSize.width, this.options.minSize.height, origin, this.options.aspectRatio, this.options.maxAspectRatio);
      const {
        width: parentWidth,
        height: parentHeight
      } = this.imageEl.getBoundingClientRect();
      let boundaryOrigins = [origin];
      if (this.options.maxAspectRatio) boundaryOrigins = [[0, 0], [1, 1]];
      boundaryOrigins.map(boundaryOrigin => {
        box.constrainToBoundary(parentWidth, parentHeight, boundaryOrigin);
      });
      this.box = box;
      this.redraw();
      if (this.options.onCropMove !== null) {
        this.options.onCropMove(this.getValue());
      }
    }
    onHandleMoveEnd(e) {
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
    }
    onRegionMoveStart(e) {
      let {
        mouseX,
        mouseY
      } = e.detail;
      let container = this.cropperEl.getBoundingClientRect();
      mouseX = mouseX - container.left;
      mouseY = mouseY - container.top;
      this.currentMove = {
        offsetX: mouseX - this.box.x1,
        offsetY: mouseY - this.box.y1
      };
      if (this.options.onCropStart !== null) {
        this.options.onCropStart(this.getValue());
      }
    }
    onRegionMoveMoving(e) {
      let {
        mouseX,
        mouseY
      } = e.detail;
      let {
        offsetX,
        offsetY
      } = this.currentMove;
      let container = this.cropperEl.getBoundingClientRect();
      mouseX = mouseX - container.left;
      mouseY = mouseY - container.top;
      this.box.move(mouseX - offsetX, mouseY - offsetY);
      if (this.box.x1 < 0) {
        this.box.move(0, null);
      }
      if (this.box.x2 > container.width) {
        this.box.move(container.width - this.box.width(), null);
      }
      if (this.box.y1 < 0) {
        this.box.move(null, 0);
      }
      if (this.box.y2 > container.height) {
        this.box.move(null, container.height - this.box.height());
      }
      this.redraw();
      if (this.options.onCropMove !== null) {
        this.options.onCropMove(this.getValue());
      }
    }
    onRegionMoveEnd(e) {
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
    }
    getValue(mode = null) {
      if (mode === null) {
        mode = this.options.returnMode;
      }
      let cropData = {};
      if (mode == 'real') {
        cropData = this.getValueAsRealData();
      } else if (mode == 'ratio') {
        cropData = this.getValueAsRatio();
      } else if (mode == 'raw') {
        cropData = {
          x: Math.round(this.box.x1),
          y: Math.round(this.box.y1),
          width: Math.round(this.box.width()),
          height: Math.round(this.box.height())
        };
      }
      if (this.options.responsive) {
        if (mode == "ratio") this.responsiveData = cropData;else this.responsiveData = this.getValueAsRatio();
      }
      return cropData;
    }
    getValueAsRealData() {
      this.showModal();
      const actualWidth = this.imageEl.naturalWidth;
      const actualHeight = this.imageEl.naturalHeight;
      const {
        width: elementWidth,
        height: elementHeight
      } = this.imageEl.getBoundingClientRect();
      const factorX = actualWidth / elementWidth;
      const factorY = actualHeight / elementHeight;
      this.resetModal();
      return {
        x: Math.round(this.box.x1 * factorX),
        y: Math.round(this.box.y1 * factorY),
        width: Math.round(this.box.width() * factorX),
        height: Math.round(this.box.height() * factorY)
      };
    }
    getValueAsRatio() {
      this.showModal();
      const {
        width: elementWidth,
        height: elementHeight
      } = this.imageEl.getBoundingClientRect();
      this.resetModal();
      return {
        x: this.box.x1 / elementWidth,
        y: this.box.y1 / elementHeight,
        width: this.box.width() / elementWidth,
        height: this.box.height() / elementHeight
      };
    }
    parseOptions(opts = null) {
      if (opts === null) opts = this.options;
      const defaults = {
        aspectRatio: null,
        maxAspectRatio: null,
        maxSize: {
          width: null,
          height: null,
          unit: 'px',
          real: false
        },
        minSize: {
          width: null,
          height: null,
          unit: 'px',
          real: false
        },
        startSize: {
          width: 100,
          height: 100,
          unit: '%',
          real: false
        },
        startPosition: null,
        returnMode: 'real',
        onInitialize: null,
        onCropStart: null,
        onCropMove: null,
        onCropEnd: null,
        preview: null,
        responsive: true,
        modal: null
      };
      let preview = null;
      if (opts.preview !== null) preview = this.getElement(opts.preview);
      let modal = null;
      if (opts.modal !== null) modal = this.getElement(opts.modal);
      let responsive = null;
      if (opts.responsive !== null) responsive = opts.responsive;
      let aspectRatio = null;
      let maxAspectRatio = null;
      const ratioKeys = ["aspectRatio", "maxAspectRatio"];
      for (var i = 0; i < ratioKeys.length; i++) {
        if (opts[ratioKeys[i]] !== undefined) {
          if (typeof opts[ratioKeys[i]] === 'number') {
            let ratio = opts[ratioKeys[i]];
            if (ratioKeys[i] === "aspectRatio") aspectRatio = ratio;else maxAspectRatio = ratio;
          } else if (opts[ratioKeys[i]] instanceof Array) {
            let ratio = opts[ratioKeys[i]][1] / opts[ratioKeys[i]][0];
            if (ratioKeys[i] === "aspectRatio") aspectRatio = ratio;else maxAspectRatio = ratio;
          }
        }
      }
      let maxSize = null;
      if (opts.maxSize !== undefined && opts.maxSize !== null) {
        maxSize = {
          width: opts.maxSize[0] || null,
          height: opts.maxSize[1] || null,
          unit: opts.maxSize[2] || 'px',
          real: opts.minSize[3] || false
        };
      }
      let minSize = null;
      if (opts.minSize !== undefined && opts.minSize !== null) {
        minSize = {
          width: opts.minSize[0] || null,
          height: opts.minSize[1] || null,
          unit: opts.minSize[2] || 'px',
          real: opts.minSize[3] || false
        };
      }
      let startSize = null;
      if (opts.startSize !== undefined && opts.startSize !== null) {
        startSize = {
          width: opts.startSize[0] || null,
          height: opts.startSize[1] || null,
          unit: opts.startSize[2] || '%',
          real: opts.startSize[3] || false
        };
      }
      let startPosition = null;
      if (opts.startPosition !== undefined && opts.startPosition !== null) {
        startPosition = {
          x: opts.startPosition[0] || null,
          y: opts.startPosition[1] || null,
          unit: opts.startPosition[2] || '%',
          real: opts.startPosition[3] || false
        };
      }
      let onInitialize = null;
      if (typeof opts.onInitialize === 'function') {
        onInitialize = opts.onInitialize;
      }
      let onCropStart = null;
      if (typeof opts.onCropStart === 'function') {
        onCropStart = opts.onCropStart;
      }
      let onCropEnd = null;
      if (typeof opts.onCropEnd === 'function') {
        onCropEnd = opts.onCropEnd;
      }
      let onCropMove = null;
      if (typeof opts.onUpdate === 'function') {
        console.warn('Croppr.js: `onUpdate` is deprecated and will be removed in the next major release. Please use `onCropMove` or `onCropEnd` instead.');
        onCropMove = opts.onUpdate;
      }
      if (typeof opts.onCropMove === 'function') {
        onCropMove = opts.onCropMove;
      }
      let returnMode = null;
      if (opts.returnMode !== undefined) {
        const s = opts.returnMode.toLowerCase();
        if (['real', 'ratio', 'raw'].indexOf(s) === -1) {
          throw "Invalid return mode.";
        }
        returnMode = s;
      }
      const defaultValue = (v, d) => v !== null ? v : d;
      return {
        aspectRatio: defaultValue(aspectRatio, defaults.aspectRatio),
        maxAspectRatio: defaultValue(maxAspectRatio, defaults.maxAspectRatio),
        maxSize: defaultValue(maxSize, defaults.maxSize),
        minSize: defaultValue(minSize, defaults.minSize),
        startSize: defaultValue(startSize, defaults.startSize),
        startPosition: defaultValue(startPosition, defaults.startPosition),
        returnMode: defaultValue(returnMode, defaults.returnMode),
        onInitialize: defaultValue(onInitialize, defaults.onInitialize),
        onCropStart: defaultValue(onCropStart, defaults.onCropStart),
        onCropMove: defaultValue(onCropMove, defaults.onCropMove),
        onCropEnd: defaultValue(onCropEnd, defaults.onCropEnd),
        preview: defaultValue(preview, defaults.preview),
        responsive: defaultValue(responsive, defaults.responsive),
        modal: defaultValue(modal, defaults.modal)
      };
    }
  }

  class Croppr extends CropprCore {
    /**
     * @constructor
     * Calls the CropprCore's constructor.
     */
    constructor(element, options, _deferred = false) {
      super(element, options, _deferred);
    }
    /**
     * Gets the value of the crop region.
     * @param {String} [mode] Which mode of calculation to use: 'real', 'ratio' or
     *      'raw'.
     */
    getValue(mode) {
      return super.getValue(mode);
    }
    /**
     * Changes the image src.
     * @param {String} src
     */
    setImage(src, callback = null) {
      return super.setImage(src, callback);
    }
    destroy() {
      return super.destroy();
    }
    /**
     * Moves the crop region to a specified coordinate.
     * @param {Number} x
     * @param {Number} y
     */
    moveTo(x, y, constrain = true, mode = "px") {
      this.showModal("moveTo");
      if (mode === "%" || mode === "real") {
        let data = this.convertor({
          x,
          y
        }, mode, "px");
        x = data.x;
        y = data.y;
      }
      this.box.move(x, y);
      if (constrain === true) this.strictlyConstrain(null, [0, 0]);
      this.redraw();
      this.resetModal("moveTo");
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      return this;
    }
    /**
     * Resizes the crop region to a specified width and height.
     * @param {Number} width
     * @param {Number} height
     * @param {Array} origin The origin point to resize from.
     *      Defaults to [0.5, 0.5] (center).
     */
    resizeTo(width, height, origin = null, constrain = true, mode = "px") {
      this.showModal("resize");
      if (mode === "%" || mode === "real") {
        let data = {
          width: width,
          height: height
        };
        data = this.convertor(data, mode, "px");
        width = data.width;
        height = data.height;
      }
      if (origin === null) origin = [.5, .5];
      this.box.resize(width, height, origin);
      if (constrain === true) this.strictlyConstrain();
      this.redraw();
      this.resetModal("resize");
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      return this;
    }
    setValue(data, constrain = true, mode = "%") {
      this.showModal("setValue");
      if (mode === "%" || mode === "real") {
        data = this.convertor(data, mode, "px");
      }
      this.moveTo(data.x, data.y, false);
      this.resizeTo(data.width, data.height, [0, 0], constrain);
      this.resetModal("setValue");
      return this;
    }
    /**
     * Scale the crop region by a factor.
     * @param {Number} factor
     * @param {Array} origin The origin point to resize from.
     *      Defaults to [0.5, 0.5] (center).
     */
    scaleBy(factor, origin = null, constrain = true) {
      if (origin === null) origin = [.5, .5];
      this.showModal("scaleBy");
      this.box.scale(factor, origin);
      if (constrain === true) this.strictlyConstrain();
      this.redraw();
      this.resetModal("scaleBy");
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      return this;
    }
    reset() {
      this.showModal("reset");
      this.box = this.initializeBox(this.options);
      this.redraw();
      this.resetModal("reset");
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      return this;
    }
  }

  return Croppr;

}));
