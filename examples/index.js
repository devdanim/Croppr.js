var croppr = new Croppr("#cropper", {
    returnMode: "ratio",
    responsive: true,
    startSize: [700, 700, "real"],
    aspectRatio: 0.5,
    maxAspectRatio: 1,
    preview: "#cropPreview",
    onInitialize: function(instance) { console.log("INIT", instance) },
    onCropEnd: function(data) { console.log("END", data) },
    onCropStart: function(data) { console.log("START", data) },
    onCropMove: function(data) { console.log("MOVE", data) }
});

var setImageBtn = document.getElementsByClassName("setImage");

for(var i=0; i < setImageBtn.length; i++) {
    setImageBtn[i].addEventListener("click", function() {
        var callback = function() {
            console.log("New image loaded : " + src)
        };
        var src = this.getAttribute("data-img");
        croppr.setImage(src, callback);
    })
}
