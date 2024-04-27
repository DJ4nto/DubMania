const mic_btn = document.getElementById('start-mic');
const stop_btn = document.getElementById('stop-mic');
const play_btn = document.getElementById('play');
const pause_btn = document.getElementById('pause');
const playback = document.querySelector('.playback');

mic_btn.addEventListener('click', StartRecordMic);
stop_btn.addEventListener('click', StopRecordMic);
play_btn.addEventListener('click', PlayVideo);
pause_btn.addEventListener('click', PauseVideo);

mic_btn.disabled = false;
stop_btn.disabled = true;
play_btn.disabled = true;
pause_btn.disabled = true;

let can_record = false;

let recorder = null;

let chunks = [];

var player;
function onYouTubePlayerAPIReady() {
    player = new YT.Player('video', {
        events: {
            'onReady': onPlayerReady
        }
    });
}

var tag = document.createElement('script');
tag.src = "https://www.youtube.com/player_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function SetupAudio() {
    console.log("AudioSetup");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
            .getUserMedia({
                audio: true
            })
            .then(SetupStream)
            .catch(err => {
                console.error(err)
            });
    }
}

SetupAudio();

function SetupStream(stream) {
    recorder = new MediaRecorder(stream);

    recorder.ondataavailable = e => {
        chunks.push(e.data);
    }

    recorder.onstop = e => {
        const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus"});
        chunks = [];
        const audioURL = window.URL.createObjectURL(blob);
        playback.src = audioURL;
    }

    can_record = true;
}

function StartRecordMic() {
    if (!can_record) return;

    recorder.start();
    player.playVideo();
    mic_btn.classList.add("is-recording");

    player.addEventListener('onStateChange', function(e) {
        if (e.data === 0) {
            StopRecordMic()
        }
     });

    mic_btn.disabled = true;
    stop_btn.disabled = false;
    play_btn.disabled = true;
    pause_btn.disabled = true;
}

function StopRecordMic() {
    recorder.stop();
    player.stopVideo();
    mic_btn.classList.remove("is-recording");

    mic_btn.disabled = false;
    stop_btn.disabled = true;
    play_btn.disabled = false;
    pause_btn.disabled = true;
}

function PlayVideo() {
    playback.play();
    player.playVideo();

    playback.addEventListener("ended", (event) => {PauseVideo()});

    mic_btn.disabled = true;
    stop_btn.disabled = true;
    play_btn.disabled = true;
    pause_btn.disabled = false;
}

function PauseVideo() {
    playback.pause();
    player.pauseVideo();

    mic_btn.disabled = false;
    stop_btn.disabled = true;
    play_btn.disabled = false;
    pause_btn.disabled = true;
}
