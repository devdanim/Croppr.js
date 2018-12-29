smartcrop.crop(document.getElementById("cropper"), { width: 50, height: 50 }).then(function(result) {
    var cropData = result.topCrop;
    console.log(cropData);
    var croppr = new Croppr("#cropper", {
        returnMode: "ratio",
        responsive: true,
        startSize: [cropData.width, cropData.height, "px", true],
        startPosition: [cropData.x, cropData.y, "px", true],
        //minSize: [500,400,"px",true],
        //minSize: [300,300,"px",true],
        //aspectRatio: 2,
        //maxAspectRatio: 1/1,
        preview: "#cropPreview",
        onInitialize: instance => {},
        onCropEnd: data => {},
        onCropStart: (data) => {},
        onCropMove: data => {}
    });
});