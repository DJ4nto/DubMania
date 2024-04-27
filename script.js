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

    mic_btn.disabled = true;
    stop_btn.disabled = false;
    play_btn.disabled = true;
    pause_btn.disabled = true;

    recorder.start();
    mic_btn.classList.add("is-recording");
}

function StopRecordMic() {
    mic_btn.disabled = false;
    stop_btn.disabled = true;
    play_btn.disabled = false;
    pause_btn.disabled = true;

    recorder.stop();
    mic_btn.classList.remove("is-recording");
}

function PlayVideo() {
    playback.play();

    mic_btn.disabled = true;
    stop_btn.disabled = true;
    play_btn.disabled = false;
    pause_btn.disabled = false;

    playback.addEventListener("ended", (event) => {PauseVideo()});
}

function PauseVideo() {
    mic_btn.disabled = false;
    stop_btn.disabled = true;
    play_btn.disabled = true;
    pause_btn.disabled = true;

    playback.pause();
}
