const canvas = document.getElementById("ctx");
const ctx = canvas.getContext("2d");
const width = 3840;
const height = 2160;
const scale = 2;
canvas.width = width;
canvas.height = height;
let pos = 0; // Poisition of red line
let started = false;
let timeStart = 0;
let waveScale = 0; // Wave scale, uses to draw full wave properly in screen size
const waveHeight = 400 * scale;

let wav = new Wav("./alison.wav");
let player = new Player(2); // Stereo

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
        for(let i = 1; i < wav.dataSize; i += 100) { // We can just increment i, but drawing function will became very slow
            ctx.lineTo(i / waveScale * scale, height / 2 - clamp(wav.audioDataLeft[i] * waveHeight, -waveHeight, waveHeight)); // Draw it by center and clamp values to get view of wave that we hear ( it will be funny, if function will draw sine, but we will hear square wave due to clipping )
        }
        ctx.stroke();

    } else {

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 4 - clamp(wav.audioDataLeft[0] * waveHeight / 2, -waveHeight / 2, waveHeight / 2));
        for(let i = 1; i < wav.dataSize; i += 200) { // 200, or drawing function will became very slow
            ctx.lineTo(i / waveScale * scale, height / 4 - clamp(wav.audioDataLeft[i] * waveHeight / 2, -waveHeight / 2, waveHeight / 2)); // Adjust left channel on top
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, height - height / 4 - clamp(wav.audioDataRight[0] * waveHeight / 2, -waveHeight / 2, waveHeight / 2));
        for(let i = 1; i < wav.dataSize; i += 200) { // 200, or drawing function will became very slow
            ctx.lineTo(i / waveScale * scale, height - height / 4 - clamp(wav.audioDataRight[i] * waveHeight / 2, -waveHeight / 2, waveHeight / 2)); // Adjust right channel on bottom
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
    waveScale = wav.dataSize / width / scale / wav.sampleDepth * 32 / wav.channelsCount; // Formula to get wave scale
    draw();
};

document.onclick = () => {
    started = true;
    timeStart = Number(new Date());
    player.getAudioContext(wav.dataSize, wav.sampleRate);
    player.play();
}