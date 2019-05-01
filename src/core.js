/**
 * CropprCore
 * Here lies the main logic.
 */

import Handle from './handle';
import Box from './box';
import enableTouch from './touch';

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
const HANDLES = [
  { position: [0.0, 0.0], constraints: [1, 0, 0, 1], cursor: 'nw-resize' },
  { position: [0.5, 0.0], constraints: [1, 0, 0, 0], cursor: 'n-resize' },
  { position: [1.0, 0.0], constraints: [1, 1, 0, 0], cursor: 'ne-resize' },
  { position: [1.0, 0.5], constraints: [0, 1, 0, 0], cursor: 'e-resize' },
  { position: [1.0, 1.0], constraints: [0, 1, 1, 0], cursor: 'se-resize' },
  { position: [0.5, 1.0], constraints: [0, 0, 1, 0], cursor: 's-resize' },
  { position: [0.0, 1.0], constraints: [0, 0, 1, 1], cursor: 'sw-resize' },
  { position: [0.0, 0.5], constraints: [0, 0, 0, 1], cursor: 'w-resize' }
]

/**
 * Core class for Croppr containing most of its functional logic.
 */
export default class CropprCore {
  constructor(element, options, deferred = false) {    

    //Save options before parsing
    this.initOptions = options;

    // Parse options
    this.options = this.parseOptions(options);

    // Get target img element
    element = this.getElement(element)
    if (!element.getAttribute('src')) {
      throw 'Image src not provided.'
    }

    // Define internal props
    this._initialized = false;
    this._restore = {
      parent: element.parentNode,
      element: element
    }

    if(this.options.preview) {
      this._restore.preview = this.options.preview;
      this._restore.parentPreview = this.options.preview.parentNode;
    }

    // Wait until image is loaded before proceeding
    if (!deferred) {
      if (element.width === 0 || element.height === 0) {
        element.onload = () => { this.initialize(element); }
      } else {
        this.initialize(element);
      }
    }
  }

  /**
   * Initialize the Croppr instance
   */
  initialize(element) {

    // Create DOM elements
    this.createDOM(element);

    // Process option values
    this.getSourceSize();

    // Listen for events from children
    this.attachHandlerEvents();
    this.attachRegionEvents();
    this.attachOverlayEvents();

    // Bootstrap this cropper instance
    this.showModal("init")
    this.initializeBox(null, false)
    //Temporary FIX, see resizePreview() comments
    //Need a first redraw() to init cropprEl, imageEl dimensions
    this.strictlyConstrain()
    this.redraw()
    this.resetModal("init")

    // Set the initalized flag to true and call the callback
    this._initialized = true;
    if (this.options.onInitialize !== null) {
      this.options.onInitialize(this);
    }
    
    this.cropperEl.onwheel = event => {
      event.preventDefault();

      let { deltaY } = event;
      const maxDelta = 0.05;
      let coeff = deltaY > 0 ? 1 : -1;
      deltaY = Math.abs(deltaY) / 100;
      deltaY = deltaY > maxDelta ? maxDelta : deltaY
      deltaY = 1 + coeff*deltaY;
      this.scaleBy(deltaY);

      // Trigger callback
      if(this.options.onCropMove !== null) {
        this.options.onCropMove(this.getValue());
      } 
      if(this.options.onCropStart !== null) {
        this.options.onCropStart(this.getValue());
      }

    }


    if(this.options.responsive) {
      let onResize;
      const resizeFunc = () => {
        let newOptions = this.options;
        let cropData = this.responsiveData;

        const controlKeys = ["x","y","width","height"];
        for(var i=0; i<controlKeys.length; i++) {
          cropData[controlKeys[i]] *= 100;
          cropData[controlKeys[i]] = cropData[controlKeys[i]] > 100 ? 100 : cropData[controlKeys[i]] < 0 ? 0 : cropData[controlKeys[i]];
        }

        newOptions.startPosition = [cropData.x, cropData.y, "ratio"];
        newOptions.startSize = [cropData.width, cropData.height, "ratio"];
        newOptions = this.parseOptions(newOptions);
        
        this.showModal("onResize");
        this.initializeBox(newOptions);
        this.resetModal("onResize");
        
      }
      window.onresize = function() {
          clearTimeout(onResize);
          onResize = setTimeout(() => {
              resizeFunc();
          }, 100);
      };
    }

  }



  //Return element by html element or string
  getElement(element, type) {
    if(element) {
      if (!element.nodeName) {
        element = document.querySelector(element);
        if (element == null) { throw 'Unable to find element.' }
      }
    }
    return element
  }

  /**
   * Create Croppr's DOM elements
   */
  createDOM(targetEl) {
    // Create main container and use it as the main event listeners
    this.containerEl = document.createElement('div');
    this.containerEl.className = 'croppr-container';
    this.eventBus = this.containerEl;
    enableTouch(this.containerEl);

    // Create cropper element
    this.cropperEl = document.createElement('div');
    this.cropperEl.className = 'croppr';

    // Create image element
    this.imageEl = document.createElement('img');
    this.imageEl.setAttribute('src', targetEl.getAttribute('src'));
    this.imageEl.setAttribute('alt', targetEl.getAttribute('alt'));
    this.imageEl.className = 'croppr-image';

    // Create clipped image element
    this.imageClippedEl = this.imageEl.cloneNode();
    this.imageClippedEl.className = 'croppr-imageClipped';

    // Create region box element
    this.regionEl = document.createElement('div');
    this.regionEl.className = 'croppr-region';

    // Create overlay element
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'croppr-overlay';

    // Create handles element
    let handleContainerEl = document.createElement('div');
    handleContainerEl.className = 'croppr-handleContainer';
    this.handles = [];
    for (let i = 0; i < HANDLES.length; i++) {
      const handle = new Handle(HANDLES[i].position,
        HANDLES[i].constraints,
        HANDLES[i].cursor,
        this.eventBus);
      this.handles.push(handle);
      handleContainerEl.appendChild(handle.el);
    }

    // And then we piece it all together!
    this.cropperEl.appendChild(this.imageEl);
    this.cropperEl.appendChild(this.imageClippedEl);
    this.cropperEl.appendChild(this.regionEl);
    this.cropperEl.appendChild(this.overlayEl);
    this.cropperEl.appendChild(handleContainerEl);
    this.containerEl.appendChild(this.cropperEl);

    // And then finally insert it into the document
    targetEl.parentElement.replaceChild(this.containerEl, targetEl);

    //Create Live Preview
    this.setLivePreview();

  }

  //If preview isn't null, create preview DOM
  setLivePreview() {

    if(this.options.preview) {

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
    if(cropData === null) cropData = this.getValue("ratio");
    if(this.preview && cropData.width && cropData.height) {
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

      //Can't explain why this affect this.getValue(), need to be fixed
      //console.log(1, this.getValue("ratio"));
      this.preview.container.style.width = containerWidth + "px";
      this.preview.container.style.height = containerHeight + "px";
      //console.log(2, this.getValue("ratio"));

      let resizeWidth = (this.sourceSize.width * containerWidth) / cropWidth;
      let resizeHeight = (this.sourceSize.height * containerHeight) / cropHeight;

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
    if(origin === null) {
      origins = [[0,0], [1,1]];
      origin = [.5, .5];
    } else {
      origins = [origin];
    }

    if(opts === null) opts = this.options;

    const { width: parentWidth, height: parentHeight } = this.imageEl.getBoundingClientRect();

    this.box.constrainToRatio(opts.aspectRatio, origin, "height", opts.maxAspectRatio);
    this.box.constrainToSize(opts.maxSize.width, opts.maxSize.height, opts.minSize.width, opts.minSize.height, origin, opts.aspectRatio, opts.maxAspectRatio);

    origins.map( newOrigin => {
      this.box.constrainToBoundary(parentWidth, parentHeight, newOrigin);
    } )
    
  }

  /**
   * Changes the image src.
   * @param {String} src
   */
  setImage(src, callback) {
    // Add onload listener to reinitialize box
    this.imageEl.onload = () => {
      this.getSourceSize();
      this.options = this.parseOptions(this.initOptions);
      this.showModal("setImage")
      this.initializeBox(null, false);
      //Temporary FIX, see initialize()
      this.strictlyConstrain();
      this.redraw();
      this.resetModal("setImage")
      if (this.options.onCropEnd !== null) {
        this.options.onCropEnd(this.getValue());
      }
      if(callback) callback()
    }

    // Change image source
    this.imageEl.src = src;
    this.imageClippedEl.src = src;
    return this;
  }

  /**
   * Destroy the Croppr instance and replace with the original element.
   */
  destroy() {
    this._restore.parent.replaceChild(this._restore.element, this.containerEl);
    if(this.options.preview) {
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

    if(opts === null) opts = this.options;

    this.convertOptionsToPixels(opts);

    //Define box size
    let boxWidth = opts.startSize.width;
    let boxHeight = opts.startSize.height;

    if(opts.minSize) {
      if(boxWidth < opts.minSize.width) boxWidth = opts.minSize.width;
      else if(boxWidth < opts.maxSize.width) boxWidth = opts.maxSize.width;
    }
    if(opts.maxSize) {
      if(boxHeight < opts.minSize.height) boxHeight = opts.minSize.height;
      else if(boxHeight < opts.maxSize.height) boxHeight = opts.maxSize.height;
    }

    //Create initial box
    let box = new Box(0, 0, boxWidth, boxHeight);

    //Define crop position
    let x = 0;
    let y = 0;
    if(opts.startPosition === null) {
      // Move to center
      const { width: parentWidth, height: parentHeight } = this.imageEl.getBoundingClientRect();
      x = (parentWidth / 2) - (boxWidth / 2);
      y = (parentHeight / 2) - (boxHeight / 2);
    } else {
      x = opts.startPosition.x;
      y = opts.startPosition.y;
    }
    box.move(x, y);

    //Reset preview img
    if(this.preview) {

      //If image in live preview already exists, delete it
      if(this.preview.image) {
        this.preview.image.parentNode.removeChild(this.preview.image);
        this.preview.image = null;
      }
      let new_img = document.createElement("img");
      new_img.src = this.imageEl.src;

      this.preview.image = this.preview.container.appendChild(new_img);
      this.preview.image.style.position = "relative";

    }

    if(constrain === true) this.strictlyConstrain();
    this.box = box;
    this.redraw();

    //Hide some handles if there are 2 ratios
    for(var i=0; i<this.handles.length; i++) {
      if(this.options.maxAspectRatio && (this.handles[i].position[0] == 0.5 || this.handles[i].position[1] == 0.5) ) {
        this.handles[i].el.style.display = "none";
      } else {
        this.handles[i].el.style.display = "block";
      }
    }

    return box;
  }

  showModal(operationName="default") {

    let modalStyle = this.modalStyle
    if(modalStyle && modalStyle.modalIsDisplayed === true) {
      return modalStyle
    }

    if(this.options.modal) {
      let { modal } = this.options

      let display = modal.currentStyle ? modal.currentStyle.display :
      getComputedStyle(modal, null).display
      let visibility =  modal.currentStyle ? modal.currentStyle.visibility :
      getComputedStyle(modal, null).visibility

      modalStyle = {
        operationName: operationName,
        modalIsDisplayed: true,
        display: display,
        visibility: visibility
      }
      this.modalStyle = modalStyle

      if(display === "none") {
        modal.style.visibility = "hidden";
        modal.style.display = "block";
      }
    }

    return modalStyle

  }

  resetModal(oldOperationName="default") {
    let modalStyle = this.modalStyle
    if(modalStyle) {
      let { visibility, display, operationName, modalIsDisplayed } = modalStyle
      if( modalIsDisplayed && oldOperationName === operationName  ) {
        let { modal } = this.options
        modal.style.visibility = visibility
        modal.style.display = display
        this.modalStyle = {
          operationName: null,
          modalIsDisplayed: false
        }
      }
    }
  }

  getSourceSize() {
    //Get raw image dimensions
    this.sourceSize = {};
    this.sourceSize.width = this.imageEl.naturalWidth;
    this.sourceSize.height = this.imageEl.naturalHeight;
    return this.sourceSize;
  }

  convertor(data, inputMode, outputMode) {
    const convertRealDataToPixel = data => {
      this.showModal()
      const { width, height } = this.imageEl.getBoundingClientRect();
      this.resetModal()
      const factorX = this.sourceSize.width / width;
      const factorY = this.sourceSize.height / height;
      if(data.width) {
        data.width /= factorX;
      } 
      if(data.x) {
        data.x /= factorX;
      }
      if(data.height) {
        data.height /= factorY;
      } 
      if(data.y) {
        data.y /= factorY;
      }
      return data;
    }
    const convertPercentToPixel = data => {
      this.showModal()
      const { width, height } = this.imageEl.getBoundingClientRect();
      this.resetModal()
      if (data.width) {
        data.width *= width;
      } 
      if (data.x) {
        data.x *= width;
      }

      if (data.height) {
        data.height *= height;
      } 
      if (data.y) {
        data.y *= height;
      } 
      return data;
    }
    if(inputMode === "real" && outputMode === "raw") {
      return convertRealDataToPixel(data)
    } else if(inputMode === "ratio" && outputMode === "raw") {
      return convertPercentToPixel(data)
    }
    return null
  }

  convertOptionsToPixels(opts = null) {
    let setOptions = false
    if(opts === null) {
      opts = this.options
      setOptions = true
    }
    const { width, height } = this.imageEl.getBoundingClientRect();
    // Convert sizes
    const sizeKeys = ['maxSize', 'minSize', 'startSize', 'startPosition'];
    for (let i = 0; i < sizeKeys.length; i++) {
      const key = sizeKeys[i];
      if (opts[key] !== null) {
        if (opts[key].unit == 'ratio') {
          opts[key] = this.convertor(opts[key], "ratio", "raw");
        } else if(opts[key].unit === 'real') {
          opts[key] = this.convertor(opts[key], "real", "raw");
        }
        delete opts[key].unit;
      }
    }
    if(opts.minSize) {
      if(opts.minSize.width > width) opts.minSize.width = width;
      if(opts.minSize.height > height) opts.minSize.height = height;
    }
    if(opts.startSize && opts.startPosition) {
      let xEnd = opts.startPosition.x + opts.startSize.width;
      if(xEnd > width) opts.startPosition.x -= (xEnd-width);
      let yEnd = opts.startPosition.y + opts.startSize.height;
      if(yEnd > height) opts.startPosition.y -= (yEnd-height);
    }
    if(setOptions) this.options = opts
    return opts
  }


  /**
   * Draw visuals (border, handles, etc) for the current box.
   */
  redraw() {

    //Resize Live Preview
    this.resizePreview();

    // Round positional values to prevent subpixel coordinates, which can
    // result in element that is rendered blurly
    const width = Math.round(this.box.width()),
      height = Math.round(this.box.height()),
      x1 = Math.round(this.box.x1),
      y1 = Math.round(this.box.y1),
      x2 = Math.round(this.box.x2),
      y2 = Math.round(this.box.y2);

    window.requestAnimationFrame(() => {
      // Update region element
      this.regionEl.style.transform = `translate(${x1}px, ${y1}px)`
      this.regionEl.style.width = width + 'px';
      this.regionEl.style.height = height + 'px';

      // Update clipped image element
      this.imageClippedEl.style.clip = `rect(${y1}px, ${x2}px, ${y2}px, ${x1}px)`;

      // Determine which handle to bring forward. The following code
      // calculates the quadrant the box is in using bitwise operators.
      // Reference: https://stackoverflow.com/questions/9718059
      const center = this.box.getAbsolutePoint([.5, .5]);
      const { width: parentWidth, height: parentHeight } = this.imageEl.getBoundingClientRect();
      const xSign = (center[0] - parentWidth / 2) >> 31;
      const ySign = (center[1] - parentHeight / 2) >> 31;
      const quadrant = (xSign ^ ySign) + ySign + ySign + 4;

      // The following equation calculates which handle index to bring
      // forward. The equation is derived using algebra (if youre curious)
      const foregroundHandleIndex = -2 * quadrant + 8

      // Update handle positions
      for (let i = 0; i < this.handles.length; i++) {
        let handle = this.handles[i];

        // Calculate handle position
        const handleWidth = handle.el.offsetWidth;
        const handleHeight = handle.el.offsetHeight;
        const left = x1 + (width * handle.position[0]) - handleWidth / 2;
        const top = y1 + (height * handle.position[1]) - handleHeight / 2;

        // Apply new position. The positional values are rounded to
        // prevent subpixel positions which can result in a blurry element
        handle.el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
        handle.el.style.zIndex = foregroundHandleIndex == i ? 5 : 4;
      }
    });
  }


  /**
   * Attach listeners for events emitted by the handles.
   * Enables resizing of the region element.
   */
  attachHandlerEvents() {
    const eventBus = this.eventBus;
    eventBus.addEventListener('handlestart', this.onHandleMoveStart.bind(this));
    eventBus.addEventListener('handlemove', this.onHandleMoveMoving.bind(this));
    eventBus.addEventListener('handleend', this.onHandleMoveEnd.bind(this));
  }

  /**
   * Attach event listeners for the crop region element.
   * Enables dragging/moving of the region element.
   */
  attachRegionEvents() {
    const eventBus = this.eventBus;
    const self = this;

    this.regionEl.addEventListener('mousedown', onMouseDown);
    eventBus.addEventListener('regionstart', this.onRegionMoveStart.bind(this));
    eventBus.addEventListener('regionmove', this.onRegionMoveMoving.bind(this));
    eventBus.addEventListener('regionend', this.onRegionMoveEnd.bind(this));

    function onMouseDown(e) {
      e.stopPropagation();
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('mousemove', onMouseMove);

      // Notify parent
      eventBus.dispatchEvent(new CustomEvent('regionstart', {
        detail: { mouseX: e.clientX, mouseY: e.clientY }
      }));
    }

    function onMouseMove(e) {
      e.stopPropagation();

      // Notify parent
      eventBus.dispatchEvent(new CustomEvent('regionmove', {
        detail: { mouseX: e.clientX, mouseY: e.clientY }
      }));
    }

    function onMouseUp(e) {
      e.stopPropagation();
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);

      // Notify parent
      eventBus.dispatchEvent(new CustomEvent('regionend', {
        detail: { mouseX: e.clientX, mouseY: e.clientY }
      }));
    }
  }

  /**
   * Attach event listeners for the overlay element.
   * Enables the creation of a new selection by dragging an empty area.
   */
  attachOverlayEvents() {
    const SOUTHEAST_HANDLE_IDX = 4;
    const self = this;
    let tmpBox = null;
    this.overlayEl.addEventListener('mousedown', onMouseDown);

    function onMouseDown(e) {
      e.stopPropagation();
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('mousemove', onMouseMove);

      // Calculate mouse's position in relative to the container
      const container = self.cropperEl.getBoundingClientRect();
      const mouseX = e.clientX - container.left;
      const mouseY = e.clientY - container.top;

      // Create new box at mouse position
      tmpBox = self.box;
      self.box = new Box(mouseX, mouseY, mouseX + 1, mouseY + 1);

      // Activate the bottom right handle
      self.eventBus.dispatchEvent(new CustomEvent('handlestart', {
        detail: { handle: self.handles[SOUTHEAST_HANDLE_IDX] }
      }));
    }

    function onMouseMove(e) {
      e.stopPropagation();
      self.eventBus.dispatchEvent(new CustomEvent('handlemove', {
        detail: { mouseX: e.clientX, mouseY: e.clientY }
      }));
    }

    function onMouseUp(e) {
      e.stopPropagation();
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);

      // If the new box has no width and height, it suggests that
      // the user had just clicked on an empty area and did not drag
      // a new box (ie. an accidental click). In this scenario, we
      // simply replace it with the previous box.
      if (self.box.width() === 1 && self.box.height() === 1) {
        self.box = tmpBox;
        return;
      }

      self.eventBus.dispatchEvent(new CustomEvent('handleend', {
        detail: { mouseX: e.clientX, mouseY: e.clientY }
      }));
    }

  }

  /**
   * EVENT HANDLER
   * Executes when user begins dragging a handle.
   */
  onHandleMoveStart(e) {
    let handle = e.detail.handle;

    // The origin point is the point where the box is scaled from.
    // This is usually the opposite side/corner of the active handle.
    const originPoint = [1 - handle.position[0], 1 - handle.position[1]];
    let [originX, originY] = this.box.getAbsolutePoint(originPoint);

    this.activeHandle = { handle, originPoint, originX, originY }

    // Trigger callback
    if (this.options.onCropStart !== null) {
      this.options.onCropStart(this.getValue());
    }
  }

  /**
   * EVENT HANDLER
   * Executes on handle move. Main logic to manage the movement of handles.
   */
  onHandleMoveMoving(e) {
    let { mouseX, mouseY } = e.detail;

    // Calculate mouse's position in relative to the container
    let container = this.cropperEl.getBoundingClientRect();
    mouseX = mouseX - container.left;
    mouseY = mouseY - container.top;

    // Ensure mouse is within the boundaries
    if (mouseX < 0) { mouseX = 0; }
    else if (mouseX > container.width) { mouseX = container.width; }

    if (mouseY < 0) { mouseY = 0; }
    else if (mouseY > container.height) { mouseY = container.height; }

    // Bootstrap helper variables
    let origin = this.activeHandle.originPoint.slice();
    const originX = this.activeHandle.originX;
    const originY = this.activeHandle.originY;
    const handle = this.activeHandle.handle;
    const TOP_MOVABLE = handle.constraints[0] === 1;
    const RIGHT_MOVABLE = handle.constraints[1] === 1;
    const BOTTOM_MOVABLE = handle.constraints[2] === 1;
    const LEFT_MOVABLE = handle.constraints[3] === 1;
    const MULTI_AXIS = (LEFT_MOVABLE || RIGHT_MOVABLE) &&
      (TOP_MOVABLE || BOTTOM_MOVABLE);

    // Apply movement to respective sides according to the handle's
    // constraint values.
    let x1 = LEFT_MOVABLE || RIGHT_MOVABLE ? originX : this.box.x1;
    let x2 = LEFT_MOVABLE || RIGHT_MOVABLE ? originX : this.box.x2;
    let y1 = TOP_MOVABLE || BOTTOM_MOVABLE ? originY : this.box.y1;
    let y2 = TOP_MOVABLE || BOTTOM_MOVABLE ? originY : this.box.y2;
    x1 = LEFT_MOVABLE ? mouseX : x1;
    x2 = RIGHT_MOVABLE ? mouseX : x2;
    y1 = TOP_MOVABLE ? mouseY : y1;
    y2 = BOTTOM_MOVABLE ? mouseY : y2;

    // Check if the user dragged past the origin point. If it did,
    // we set the flipped flag to true.
    let [isFlippedX, isFlippedY] = [false, false];
    if (LEFT_MOVABLE || RIGHT_MOVABLE) {
      isFlippedX = LEFT_MOVABLE ? mouseX > originX : mouseX < originX;
    }
    if (TOP_MOVABLE || BOTTOM_MOVABLE) {
      isFlippedY = TOP_MOVABLE ? mouseY > originY : mouseY < originY;
    }

    // If it is flipped, we swap the coordinates and flip the origin point.
    if (isFlippedX) {
      const tmp = x1; x1 = x2; x2 = tmp; // Swap x1 and x2
      origin[0] = 1 - origin[0]; // Flip origin x point
    }
    if (isFlippedY) {
      const tmp = y1; y1 = y2; y2 = tmp; // Swap y1 and y2
      origin[1] = 1 - origin[1]; // Flip origin y point
    }

    // Create new box object
    let box = new Box(x1, y1, x2, y2);

    // Maintain aspect ratio
    if (this.options.aspectRatio) {
      let ratio = this.options.aspectRatio;
      let isVerticalMovement = false;
      if (MULTI_AXIS) {
        isVerticalMovement = (mouseY > box.y1 + ratio * box.width()) ||
          (mouseY < box.y2 - ratio * box.width());
      } else if (TOP_MOVABLE || BOTTOM_MOVABLE) {
        isVerticalMovement = true;
      }
      const ratioMode = isVerticalMovement ? 'width' : 'height';
      box.constrainToRatio(ratio, origin, ratioMode, this.options.maxAspectRatio);
    }

    // Maintain minimum/maximum size
    box.constrainToSize(this.options.maxSize.width, this.options.maxSize.height, this.options.minSize.width, this.options.minSize.height,
      origin, this.options.aspectRatio, this.options.maxAspectRatio);
    
    // Constrain to boundary
    const { width: parentWidth, height: parentHeight } = this.imageEl.getBoundingClientRect();
    let boundaryOrigins = [origin];
    if(this.options.maxAspectRatio) boundaryOrigins = [[0, 0], [1, 1]];
    boundaryOrigins.map( boundaryOrigin => {
      box.constrainToBoundary(parentWidth, parentHeight, boundaryOrigin);
    })
    
    // Finally, update the visuals (border, handles, clipped image, etc)
    this.box = box;
    this.redraw();

    // Trigger callback
    if (this.options.onCropMove !== null) {
      this.options.onCropMove(this.getValue());
    }
  }

  /**
   * EVENT HANDLER
   * Executes on handle move end.
   */
  onHandleMoveEnd(e) {

    // Trigger callback
    if (this.options.onCropEnd !== null) {
      this.options.onCropEnd(this.getValue());
    }
  }

  /**
   * EVENT HANDLER
   * Executes when user starts moving the crop region.
   */
  onRegionMoveStart(e) {
    let { mouseX, mouseY } = e.detail;

    // Calculate mouse's position in relative to the container
    let container = this.cropperEl.getBoundingClientRect();
    mouseX = mouseX - container.left;
    mouseY = mouseY - container.top;

    this.currentMove = {
      offsetX: mouseX - this.box.x1,
      offsetY: mouseY - this.box.y1
    }

    // Trigger callback
    if (this.options.onCropStart !== null) {
      this.options.onCropStart(this.getValue());
    }

  }

  /**
   * EVENT HANDLER
   * Executes when user moves the crop region.
   */
  onRegionMoveMoving(e) {
    let { mouseX, mouseY } = e.detail;
    let { offsetX, offsetY } = this.currentMove;

    // Calculate mouse's position in relative to the container
    let container = this.cropperEl.getBoundingClientRect();
    mouseX = mouseX - container.left;
    mouseY = mouseY - container.top;

    this.box.move(mouseX - offsetX, mouseY - offsetY);

    // Ensure box is within the boundaries
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

    // Update visuals
    this.redraw();

    // Trigger callback
    if (this.options.onCropMove !== null) {
      this.options.onCropMove(this.getValue());
    }
  }

  /**
   * EVENT HANDLER
   * Executes when user stops moving the crop region (mouse up).
   */
  onRegionMoveEnd(e) {
    // Trigger callback
    if (this.options.onCropEnd !== null) {
      this.options.onCropEnd(this.getValue());
    }
  }

  /**
   * Calculate the value of the crop region.
   */
  getValue(mode = null) {
    if (mode === null) { mode = this.options.returnMode; }
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
      }
    }
    if(this.options.responsive) {
      if(mode == "ratio") this.responsiveData = cropData;
      else this.responsiveData = this.getValueAsRatio();
    }
    return cropData;
  }

  getValueAsRealData() {
    this.showModal()
    const actualWidth = this.imageEl.naturalWidth;
    const actualHeight = this.imageEl.naturalHeight;
    const { width: elementWidth, height: elementHeight } = this.imageEl.getBoundingClientRect();
    const factorX = actualWidth / elementWidth;
    const factorY = actualHeight / elementHeight;
    this.resetModal()
    return {
      x: Math.round(this.box.x1 * factorX),
      y: Math.round(this.box.y1 * factorY),
      width: Math.round(this.box.width() * factorX),
      height: Math.round(this.box.height() * factorY)
    }
  }

  getValueAsRatio() {
    this.showModal()
    const { width: elementWidth, height: elementHeight } = this.imageEl.getBoundingClientRect();
    this.resetModal()
    return {
      x: this.box.x1 / elementWidth,
      y: this.box.y1 / elementHeight,
      width: this.box.width() / elementWidth,
      height: this.box.height() / elementHeight
    }
  }

  /**
   * Parse user options and set default values.
   */
  parseOptions(opts = null) {
    if(opts === null) opts = this.options
    const defaults = {
      aspectRatio: null,
      maxAspectRatio: null,
      maxSize: { width: null, height: null, unit: 'raw' },
      minSize: { width: null, height: null, unit: 'raw' },
      startSize: { width: 1, height: 1, unit: 'ratio' },
      startPosition: null,
      returnMode: 'real',
      onInitialize: null,
      onCropStart: null,
      onCropMove: null,
      onCropEnd: null,
      preview: null,
      responsive: true,
      modal: null
    }

    //Parse preview
    let preview = null;
    if(opts.preview !== null) preview = this.getElement(opts.preview);

    //Parse preview
    let modal = null;
    if(opts.modal !== null) modal = this.getElement(opts.modal);

    //Parse responsive
    let responsive = null;
    if(opts.responsive !== null) responsive = opts.responsive;

    // Parse aspect ratio
    let aspectRatio = null;
    let maxAspectRatio = null;
    const ratioKeys = ["aspectRatio", "maxAspectRatio"];
    for(var i=0; i<ratioKeys.length; i++) {
      if (opts[ratioKeys[i]] !== undefined) {
        if (typeof (opts[ratioKeys[i]]) === 'number') {
          let ratio = opts[ratioKeys[i]];
          if(ratioKeys[i] === "aspectRatio") aspectRatio = ratio;
          else maxAspectRatio = ratio;
        } else if (opts[ratioKeys[i]] instanceof Array) {
          let ratio = opts[ratioKeys[i]][1] / opts[ratioKeys[i]][0];
          if(ratioKeys[i] === "aspectRatio") aspectRatio = ratio;
          else maxAspectRatio = ratio;
        }
      }
    }
    

    // Parse max width/height
    let maxSize = null;
    if (opts.maxSize !== undefined && opts.maxSize !== null) {
      maxSize = {
        width: opts.maxSize[0] || null,
        height: opts.maxSize[1] || null,
        unit: opts.maxSize[2] || 'raw'
      }
    }

    // Parse min width/height
    let minSize = null;
    if (opts.minSize !== undefined && opts.minSize !== null) {
      minSize = {
        width: opts.minSize[0] || null,
        height: opts.minSize[1] || null,
        unit: opts.minSize[2] || 'raw'
      }
    }

    // Parse start size
    let startSize = null;
    if (opts.startSize !== undefined && opts.startSize !== null) {
      startSize = {
        width: opts.startSize[0] || null,
        height: opts.startSize[1] || null,
        unit: opts.startSize[2] || 'ratio'
      }
    }

    // Parse start position
    let startPosition = null;
    if (opts.startPosition !== undefined && opts.startPosition !== null) {
      startPosition = {
        x: opts.startPosition[0] || null,
        y: opts.startPosition[1] || null,
        unit: opts.startPosition[2] || 'ratio'
      }
    }

    // Parse callbacks
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
      // DEPRECATED: onUpdate is deprecated to create a more uniform
      // callback API, such as: onCropStart, onCropMove, onCropEnd
      console.warn('Croppr.js: `onUpdate` is deprecated and will be removed in the next major release. Please use `onCropMove` or `onCropEnd` instead.');
      onCropMove = opts.onUpdate;
    }
    if (typeof opts.onCropMove === 'function') {
      onCropMove = opts.onCropMove;
    }

    // Parse returnMode value
    let returnMode = null;
    if (opts.returnMode !== undefined) {
      const s = opts.returnMode.toLowerCase();
      if (['real', 'ratio', 'raw'].indexOf(s) === -1) {
        throw "Invalid return mode.";
      }
      returnMode = s;
    } 


    const defaultValue = (v, d) => (v !== null ? v : d);
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
    }
  }
}

/**
 * HELPER FUNCTIONS
 */

function round(value, decimals) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}
