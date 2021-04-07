function intFromBytes( arrayBuffer, start, end ){
    let x = [];

    for(let i = start; i < end; i++) {
        x.push(arrayBuffer[i]);
    }

    let val = 0;

    for (var i = 0; i < x.length; ++i) {        
        val += x[x.length - i - 1];        
        if (i < x.length-1) {
            val = val << 8;
        }
    }

    return val;
}

class Wav {
    constructor(url) {
        let _this = this;
        this.channelsCount = 0;
        this.sampleRate = 0;
        this.sampleDepth = 0;
        this.chunkSize = 0;
        this.byteRate = 0;
        this.blockAlign = 0;
        this.successfulLoad = false;
        this.wavLoaded = false;
        this.dataSize = 0;
        this.audioDataLeft = null;
        this.audioDataRight = null;

        fetch(url)
            .then(data => data.arrayBuffer())
            .then(text => {
                _this.data = new Uint8Array(text);
                _this.dirtyData = text;
                _this.ondataloaded();
            });
    }

    onload() {
        // Just do nothing
    }

    parseData() {
        let chunkId = String.fromCharCode(this.data[0]) + String.fromCharCode(this.data[1]) + String.fromCharCode(this.data[2]) + String.fromCharCode(this.data[3]);
        let chunkSize = intFromBytes(this.data, 4, 8) - 8;

        this.wavLoaded = true;

        if(chunkId === "RIFF") {

            this.chunkSize = chunkSize;

            let format = String.fromCharCode(this.data[8]) + String.fromCharCode(this.data[9]) + String.fromCharCode(this.data[10]) + String.fromCharCode(this.data[11]) + String.fromCharCode(this.data[12]) + String.fromCharCode(this.data[13]) + String.fromCharCode(this.data[14]);

            if(format === "WAVEfmt") {

                let subChunkSize = intFromBytes(this.data, 16, 19);

                this.subChunkSize = subChunkSize;

                this.audioFormat = intFromBytes(this.data, 20, 21);

                this.channelsCount = intFromBytes(this.data, 22, 23);
                this.sampleRate = intFromBytes(this.data, 24, 27);

                this.byteRate = intFromBytes(this.data, 28, 31);

                this.blockAlign = intFromBytes(this.data, 32, 33);
                /*
                blockAlign

                It's count of bytes, that needs to get wave amplitude for current sample.
                The pcm keeps wave amplitude by digital data, that looks like pcm square.
                So, you need to get medium of them to get wave amplitude for current sample.
                */
                this.sampleDepth = intFromBytes(this.data, 34, 35);

                let shift = 0;
                /*
                shift

                Shift for audio data. Some programms put some data in their wavs, so position of data chunk isn't constant.
                Wav header info didn't say us, where is data chunk, so we must get its position "blindy".
                */

                let subChunk2Id = String.fromCharCode(this.data[36]) + String.fromCharCode(this.data[37]) + String.fromCharCode(this.data[38]) + String.fromCharCode(this.data[39]);
                while(subChunk2Id !== "data" && shift < 999) {
                    subChunk2Id = String.fromCharCode(this.data[36 + shift]) + String.fromCharCode(this.data[37 + shift]) + String.fromCharCode(this.data[38 + shift]) + String.fromCharCode(this.data[39 + shift]);
                    shift++;
                }

                // Next code is fixing problems aka start offset of <Float64Array/Float32Array/Int32Array and etc.> should be multiple of <2/4/8> and length of <Float64Array/Float32Array/Int32Array and etc.> should be multiple of <2/4/8>
                let int8View = new Uint8Array(this.dirtyData);
                this.dirtyData = new ArrayBuffer(this.dirtyData.byteLength + this.dirtyData.byteLength % (this.sampleDepth / 8));
                let dataView = new DataView(this.dirtyData);

                for(let i = 0; i < int8View.length; i++) {
                    dataView.setInt8(i, int8View[i]);
                }

                shift -= (shift + 44) % (this.sampleDepth / 8);
                
                // End of fix code

                if(subChunk2Id === "data") {
                    this.successfulLoad = true;

                    this.dataSize = this.data.length - 44 - shift;

                    this.audioDataLeft = [];
                    this.audioDataRight = [];

                    let pcmData;

                    if(this.audioFormat === 1) { // (Un) signed 8/16/32 int values for waveform
                        switch(this.sampleDepth) {
                            case 8: {
                                pcmData = new Uint8Array(this.dirtyData, 44 + shift);
                                break;
                            }
                            case 16: {
                                pcmData = new Int16Array(this.dirtyData, 44 + shift);
                                break;
                            }
                            case 32: {
                                pcmData = new Int32Array(this.dirtyData, 44 + shift);
                                break;
                            }
                        }

                        if(this.channelsCount === 1) {
                            for(let i = 0; i < this.data.length - 44 - shift; i++) {
                                this.audioDataLeft[i] = 0;
    
                                for(let j = i; j < i + this.blockAlign; j++) {
                                    this.audioDataLeft[i] += pcmData[j] / (2 ** this.sampleDepth / 2);
                                }
    
                                this.audioDataLeft[i] = this.audioDataLeft[i] / this.blockAlign;
                                this.audioDataRight[i] = this.audioDataLeft[i];
                            }
                        } else if(this.channelsCount === 2) {
                            for(let i = 0; i < this.data.length - 44 - shift; i += 2) {
                                this.audioDataLeft[i / 2] = 0;
                                this.audioDataRight[i / 2] = 0;
    
                                for(let j = i; j < i + this.blockAlign / 2; j += 2) { // if block align will be divided by greater value, then waveform will sounds like compressed.
                                    this.audioDataLeft[i / 2] += pcmData[j] / (2 ** this.sampleDepth / 2);
                                    this.audioDataRight[i / 2] += pcmData[j + 1] / (2 ** this.sampleDepth / 2);
                                }
                                
                                this.audioDataLeft[i / 2] = Math.max(Math.min(this.audioDataLeft[i / 2] / this.blockAlign * 2, 1), -1);
                                this.audioDataRight[i / 2] = Math.max(Math.min(this.audioDataRight[i / 2] / this.blockAlign * 2, 1), -1);
                            }
                        }
                    } else if(this.audioFormat === 3) { // 32/64 bit float values for waveform
                        switch(this.sampleDepth) {
                            case 32: {
                                pcmData = new Float32Array(this.dirtyData, 44 + shift);
                                break;
                            }
                            case 64: {
                                pcmData = new Float64Array(this.dirtyData, 44 + shift);
                                break;
                            }
                        }

                        if(this.channelsCount === 1) {
                            for(let i = 0; i < this.data.length - 44 - shift; i++) {
                                this.audioDataLeft[i] = 0;
    
                                for(let j = i; j < i + this.blockAlign / (this.sampleDepth / 16); j++) {
                                    this.audioDataLeft[i] += pcmData[j];
                                }
    
                                this.audioDataLeft[i] = this.audioDataLeft[i] / this.blockAlign * this.sampleDepth / 16;
                                this.audioDataRight[i] = this.audioDataLeft[i];
                            }
                        } else if(this.channelsCount === 2) {
                            for(let i = 0; i < this.data.length - 44 - shift; i += 2) {
                                this.audioDataLeft[i / 2] = 0;
                                this.audioDataRight[i / 2] = 0;
    
                                for(let j = i; j < i + this.blockAlign / (this.sampleDepth / 16); j += 2) { // if block align will be divided by greater value, then waveform will sounds like compressed.
                                    this.audioDataLeft[i / 2] += pcmData[j];
                                    this.audioDataRight[i / 2] += pcmData[j + 1];
                                }
                                
                                this.audioDataLeft[i / 2] = Math.max(Math.min(this.audioDataLeft[i / 2] / this.blockAlign * this.sampleDepth / 8, 1), -1);
                                this.audioDataRight[i / 2] = Math.max(Math.min(this.audioDataRight[i / 2] / this.blockAlign * this.sampleDepth / 8, 1), -1);
                            }
                        }
                    }
                } else {
                    console.error("Wav: subChunk2Id is not \"data\".");
                }
            } else {
                console.error("Wav: Unknown format.");
            }
        } else {
            console.error("Wav: Chunk id is not \"RIFF\".");
        }
    }

    ondataloaded() {
        /*
        For future i kept ondataloaded with calling one function.
        Maybe, i will do something with it.
        */
        this.parseData();
        this.onload();
    }
}