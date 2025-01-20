/**
 * Raw wav audio file contents
 * @typedef {Object} WavPackerAudioType
 * @property {Blob} blob
 * @property {string} url
 * @property {number} channelCount
 * @property {number} sampleRate
 * @property {number} duration
 */

/**
 * Utility class for assembling PCM16 "audio/wav" data
 * @class
 */
export class WavPacker {
    /**
     * Converts Float32Array of amplitude data to ArrayBuffer in Int16Array format
     * @param {Float32Array} float32Array
     * @returns {ArrayBuffer}
     */
    static floatTo16BitPCM(float32Array) {
      const buffer = new ArrayBuffer(float32Array.length * 2);
      const view = new DataView(buffer);
      let offset = 0;
      for (let i = 0; i < float32Array.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
      return buffer;
    }
    
    static bufferToFloat32Array (data) {
      let buffer = new Int16Array(data)
      return Float32Array.from(buffer, (k, v) => k / ( k >= 0 ? 32767 : 32768))
    }
    /**
     * Concatenates two ArrayBuffers
     * @param {ArrayBuffer} leftBuffer
     * @param {ArrayBuffer} rightBuffer
     * @returns {ArrayBuffer}
     */
    static mergeBuffers(leftBuffer, rightBuffer) {
      const tmpArray = new Uint8Array(
        leftBuffer.byteLength + rightBuffer.byteLength
      );
      tmpArray.set(new Uint8Array(leftBuffer), 0);
      tmpArray.set(new Uint8Array(rightBuffer), leftBuffer.byteLength);
      return tmpArray.buffer;
    }

    static base64ToArrayBuffer(base64) {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
  
    static arrayBufferToBase64(arrayBuffer) {
      if (arrayBuffer instanceof Float32Array) {
        arrayBuffer = this.floatTo16BitPCM(arrayBuffer);
      } else if (arrayBuffer instanceof Int16Array) {
        arrayBuffer = arrayBuffer.buffer;
      }
      let binary = '';
      let bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 0x8000; // 32KB chunk size
      for (let i = 0; i < bytes.length; i += chunkSize) {
        let chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binary);
    }
  
    static mergeInt16Arrays(left, right) {
      if (left instanceof ArrayBuffer) {
        left = new Int16Array(left);
      }
      if (right instanceof ArrayBuffer) {
        right = new Int16Array(right);
      }
      if (!(left instanceof Int16Array) || !(right instanceof Int16Array)) {
        throw new Error(`Both items must be Int16Array`);
      }
      const newValues = new Int16Array(left.length + right.length);
      for (let i = 0; i < left.length; i++) {
        newValues[i] = left[i];
      }
      for (let j = 0; j < right.length; j++) {
        newValues[left.length + j] = right[j];
      }
      return newValues;
    }
  
    static generateId(prefix, length = 16) {
      // base58; non-repeating chars
      const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      const str = Array(length - prefix.length)
        .fill(0)
        .map((_) => chars[Math.floor(Math.random() * chars.length)])
        .join('');
      return `${prefix}_${str}`;
    }
    
    /**
     * Packs data into an Int16 format
     * @private
     * @param {number} size 0 = 1x Int16, 1 = 2x Int16
     * @param {number} arg value to pack
     * @returns
     */
    _packData(size, arg) {
      return [
        new Uint8Array([arg, arg >> 8]),
        new Uint8Array([arg, arg >> 8, arg >> 16, arg >> 24]),
      ][size];
    }
  
    /**
     * Packs audio into "audio/wav" Blob
     * @param {number} sampleRate
     * @param {{bitsPerSample: number, channels: Array<Float32Array>, data: Int16Array}} audio
     * @returns {WavPackerAudioType}
     */
    pack(sampleRate, audio) {
      if (!audio?.bitsPerSample) {
        throw new Error(`Missing "bitsPerSample"`);
      } else if (!audio?.channels) {
        throw new Error(`Missing "channels"`);
      } else if (!audio?.data) {
        throw new Error(`Missing "data"`);
      }
      const { bitsPerSample, channels, data } = audio;
      const output = [
        // Header
        'RIFF',
        this._packData(
          1,
          4 + (8 + 24) /* chunk 1 length */ + (8 + 8) /* chunk 2 length */
        ), // Length
        'WAVE',
        // chunk 1
        'fmt ', // Sub-chunk identifier
        this._packData(1, 16), // Chunk length
        this._packData(0, 1), // Audio format (1 is linear quantization)
        this._packData(0, channels.length),
        this._packData(1, sampleRate),
        this._packData(1, (sampleRate * channels.length * bitsPerSample) / 8), // Byte rate
        this._packData(0, (channels.length * bitsPerSample) / 8),
        this._packData(0, bitsPerSample),
        // chunk 2
        'data', // Sub-chunk identifier
        this._packData(
          1,
          (channels[0].length * channels.length * bitsPerSample) / 8
        ), // Chunk length
        data,
      ];
      const blob = new Blob(output, { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      return {
        blob,
        url,
        channelCount: channels.length,
        sampleRate,
        duration: data.byteLength / (channels.length * sampleRate * 2),
      };
    }
  }
  
  globalThis.WavPacker = WavPacker;