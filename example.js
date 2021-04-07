const canvas = document.getElementById("ctx");
const ctx = canvas.getContext("2d");
const width = 3840;
const height = 2160;
const scale = 2;
canvas.width = width;
canvas.height = height;
let pos = 0;
let started = false;
let timeStart = 0;
let waveScale = 0;

const waveHeight = 400 * scale;
let wav = new Wav("./test.wav");
let player = new Player(2);

function clamp(number, min, max) {
    return Math.max(Math.min(number, max), min);
}

function draw() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    if(wav.channelsCount === 1) {

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2 - clamp(wav.audioDataLeft[0] * waveHeight, -waveHeight, waveHeight));
        for(let i = 1; i < wav.dataSize; i += 100) {
            ctx.lineTo(i / waveScale * scale, height / 2 - clamp(wav.audioDataLeft[i] * waveHeight, -waveHeight, waveHeight));
        }
        ctx.stroke();

    } else {

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 4 - clamp(wav.audioDataLeft[0] * waveHeight / 2, -waveHeight / 2, waveHeight / 2));
        for(let i = 1; i < wav.dataSize; i += 200) {
            ctx.lineTo(i / waveScale * scale, height / 4 - clamp(wav.audioDataLeft[i] * waveHeight / 2, -waveHeight / 2, waveHeight / 2));
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, height - height / 4 - clamp(wav.audioDataRight[0] * waveHeight / 2, -waveHeight / 2, waveHeight / 2));
        for(let i = 1; i < wav.dataSize; i += 200) {
            ctx.lineTo(i / waveScale * scale, height - height / 4 - clamp(wav.audioDataRight[i] * waveHeight / 2, -waveHeight / 2, waveHeight / 2));
        }
        ctx.stroke();

    }

    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos / waveScale * scale - scale, 0);
    ctx.lineTo(pos / waveScale * scale - scale, 2160);
    ctx.stroke();

    if(started) {
        pos = (Number(new Date()) - timeStart) / 1000 * wav.sampleRate;
    }

    requestAnimationFrame(draw);
}

wav.onload = () => {
    player.putAudioInChannel(0, wav.audioDataLeft);
    player.putAudioInChannel(1, wav.audioDataRight);
    waveScale = wav.dataSize / width / scale / wav.sampleDepth * 32 / wav.channelsCount;
    draw();
};

document.onclick = () => {
    started = true;
    timeStart = Number(new Date());
    player.getAudioContext(wav.dataSize, wav.sampleRate);
    player.play();
}