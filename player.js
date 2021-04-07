class Player {
    constructor(channelCount) {
        this.channels = [];
        this.channelCount = channelCount;

        for(let i = 0; i < channelCount; i++) {
            this.channels[i] = [];
        }
    }

    putAudioInChannel(channel, data) {
        this.channels[channel] = data;
    }

    getComposedAudioData() {
        let out = [];

        for(let i = 0; i < this.channels[0].length; i++) {
            out[i] = 0;
        }

        for(let i = 0; i < this.channelCount; i++) {
            for(let j = 0; j < this.channels[i].length; j++) {
                out[j] += this.channels[i][j];
            }
        }

        return out;
    }

    getAudioContext(length, discretizationFreq) {
        this.actx = new AudioContext();
        this.buffer = this.actx.createBuffer(2, Number(length), discretizationFreq);
        this.bufl   = this.buffer.getChannelData(0);
        this.bufr   = this.buffer.getChannelData(1);
        this.shift = 0;
        this.node   = this.actx.createBufferSource(0);
        this.node.buffer = this.buffer;
        this.node.connect(this.actx.destination);
        this.started = false;
    }

    play() {
        if(this.started) {
            this.node.stop(0);
        }
        let arrayl, arrayr;
        if(this.channelCount === 1) {
            arrayl = this.channels[0];
            arrayr = this.channels[0];
        } else {
            arrayl = this.channels[0];
            arrayr = this.channels[1];
        }

        for (let i = 0; i < arrayl.length; i++) {
            if(!isNaN(arrayl[i])) {
                this.bufl[i] = arrayl[i];
            } else {
                this.bufl[i] = 0;
            }
        }
        for (let i = 0; i < arrayr.length; i++) {
            if(!isNaN(arrayr[i])) {
                this.bufr[i] = arrayr[i];
            } else {
                this.bufr[i] = 0;
            }
        }
        this.node.loopStart = 1;
        this.node.start(0);
        this.started = true;
    }
}