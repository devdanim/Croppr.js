var croppr = new Croppr("#cropper", {
    returnMode: "ratio",
    responsive: true,
    //startSize: [2000, 100, "px", true],
    startSize: [110, 100, "%", true],
    //aspectRatio: 2,
    //maxAspectRatio: 1/1,
    preview: "#cropPreview",
    onInitialize: instance => {},
    onCropEnd: data => {},
    onCropStart: (data) => {},
    onCropMove: data => {}
});