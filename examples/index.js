var croppr = new Croppr("#cropper", {
    returnMode: "ratio",
    responsive: true,
    startSize: [400, 300, "px", true],
    aspectRatio: 2,
    maxAspectRatio: 1/1,
    preview: "#cropPreview",
    onInitialize: instance => {},
    onCropEnd: data => {},
    onCropStart: (data) => {},
    onCropMove: data => {}
});