
function getMedia(callback) {
    var mediaFounded = false;

//    if (!MediaStreamTrack.getSources) {
//        console.log("!MediaStreamTrack.getSources");
//        $("#loading").text("!MediaStreamTrack.getSources");
//        callback(true);
//        return;
//    }

//    MediaStreamTrack.getSources(function (media_sources) {
    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
    }).then(function (media_sources) {
        console.log(media_sources);
        callback(media_sources);

//        mediaFounded = true;
//
//        var video = document.createElement('video');
//        video.src = "tests/output_4.ogg";
//        video.width = 320;
//        video.height = 240;
//        video.loop = true;
//        video.volume = 0;
//        video.controls = true;
//        document.body.appendChild(video);
//
//        //var video = document.querySelector('video');
//        video.srcObject = media_sources;
//        
//        video.onloadedmetadata = function (e) {
//            console.log("onloadedmetadata()");
//            video.play();
//            callback(true);
//        };

//        for (var i = 0; i < media_sources.length; i++) {
//            if (media_sources[i].kind == 'video' && media_sources[i].facing == "environment" && !mediaFounded) {
//                mediaFounded = true;
//                getAllUserMedias(media_sources[i], function (media) {
//                    if (media) {
//                        callback(true);
//                    } else {
//                        alert("No video media founded (1)");
//                        callback(false);
//                    }
//                    return;
//                });
//            }
//        }
//
//        for (var i = 0; i < media_sources.length; i++) {
//            if (media_sources[i].kind == 'video' && !mediaFounded) {
//                mediaFounded = true;
//                getAllUserMedias(media_sources[i], function (media) {
//                    if (media) {
//                        callback(true);
//                    } else {
//                        alert("No video media founded (2)");
//                        callback(false);
//                    }
//                    return;
//                });
//            }
//        }
//
//        if (!mediaFounded) {
//            console.log("!mediaFounded")
//            callback(false);
//        }
    }).catch(function (err) {
        console.log(err.name + ": " + err.message);
    }); // always check for errors at the end.
}

function getAllUserMedias(media_source, callback) {
    var constraints = {
        video: {
//            mandatory: {
//                minWidth: 641,
//                minHeight: 1
//                maxWidth: 1920,
//                maxHeight: 1080
//                ,
//                minWidth: 640,
//                minHeight: 480
//            },

            optional: [
                {sourceId: media_source.id}
//                ,
//                {minWidth: 1920}
//                ,
//                {minHeight: 1080}
//                ,
//                {maxWidth: 320}
//                ,
//                {maxHeight: 240}
            ]
        }
    };


    var URL = window.URL || window.webkitURL;
    var createObjectURL = URL.createObjectURL || webkitURL.createObjectURL;
    if (!createObjectURL) {
        throw new Error("URL.createObjectURL not found.");
    }
    getUserMedia(constraints,
            function (stream) {
                var url = createObjectURL(stream);
                AR.video.src = url;

                //get video size!
                AR.video.addEventListener('playing', function () {
                    console.log("AR.video.videoWidth = " + AR.video.videoWidth);
                    console.log("AR.video.videoHeight = " + AR.video.videoHeight);

                    $("#header").html(AR.video.videoWidth + " , " + AR.video.videoHeight);
                }, false);

                callback(media_source);
            },
            function (str) {
                console.log(str);
                alert("Couldn't access camera: " + str.name);
                callback(false);
            }
    );
}

function getUserMedia(t, onsuccess, onerror) {
    if (navigator.getUserMedia) {
        navigator.getUserMedia(t, onsuccess, onerror);
    } else if (navigator.webkitGetUserMedia) {
        navigator.webkitGetUserMedia(t, onsuccess, onerror);
    } else if (navigator.mozGetUserMedia) {
        navigator.mozGetUserMedia(t, onsuccess, onerror);
    } else if (navigator.msGetUserMedia) {
        navigator.msGetUserMedia(t, onsuccess, onerror);
    } else {
        onerror(new Error("No getUserMedia implementation found."));
    }
}