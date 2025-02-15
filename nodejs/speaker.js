#!/usr/bin/env node
/*
Usage: node speaker.js < output.raw
*/

const Speaker = require('speaker');

// Create the Speaker instance
const speaker = new Speaker({
  channels: 1,          // 2 channels
  sampleRate: 24000     // 44,100 Hz sample rate
});

// PCM data from stdin gets piped into the speaker
process.stdin.pipe(speaker);