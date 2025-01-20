const fs = require('fs');
const WebSocket = require('ws');
const Speaker = require('speaker');
const { OpenAI } = require('openai');
const { v4: uuidv4 } = require('uuid');

const AudioReadableStream = require("./AudioReadableStream")
const { access_key, stream_url, llm_url, llm_key, llm_model, voice } = require('./config');


let audioStreamFinished = false;

// sample rate
const sampleRate = 24000;

// Create the OpenAI instance
const llm = new OpenAI({
    baseURL: llm_url,
    apiKey: llm_key,
});

// Create the Speaker instance
let speaker = new Speaker({
    channels: 1,
    bitDepth: 16,
    sampleRate: sampleRate 
});

audioStream = new AudioReadableStream()

audioStream.pipe(speaker)

async function llmStream() {
    const params = {
        model: llm_model,
        max_tokens: 1000,
        temperature: 0.8,
        messages: [
            {
                role: 'user',
                content: '讲一个儿童故事',
            },
        ],
        stream: true,
    };
    return llm.chat.completions.create(params);
}


async function receiver(ws) {
    // save the raw audio, usage: 
    // node speaker.js < output.raw
    // ffplay  -autoexit -f s16le  -ar 24000 output.raw
    const outputFileName = `output.raw`;
    const writeStream = fs.createWriteStream(outputFileName);

    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        const event = data.type;
        const done = data.done;
        const statusCode = data.status_code;
        console.log("receive chunk: %s, %d, %s", data.context_id, data.status_code, done)
        if (event === 'chunk') {
            const speech = Buffer.from(data.data, 'base64');
            audioStream.add(speech)
            writeStream.write(speech);
        } 
        if (done === 'done' || statusCode === 200) {
            audioStreamFinished = true;
            audioStream.end()
            console.log(`Audio stream finished. Saved to ${outputFileName}`);
        }
    });

    ws.once('close', () => {
        writeStream.end();
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

async function processStream(ws, maxTokens) {
    const contextId = uuidv4();
    const item = {
        model_id: 'emotion-tts-v1',
        voice: { mode: 'id', id: voice },
        output_format: {
            container: 'raw',
            encoding: 'pcm_s16le',
            sample_rate: sampleRate,
        },
        language: 'zh',
        transcript: '',
        context_id: contextId,
        continue: true,
    };

    try {
        const stream = await llmStream();
        for await (const chunk of stream) {
            const choices = chunk.choices || [];
            if (choices.length === 0) continue;

            const content = choices[0].delta?.content;
            if (!content) continue;

            const message = { ...item, transcript: content };
            console.log('Sending message:', message.transcript);

            ws.send(JSON.stringify(message));

            if (maxTokens > 0 && chunk.index >= maxTokens) {
                ws.send(JSON.stringify({ cancel: true, context_id: contextId }));
                break;
            }
        }
    } catch (error) {
        console.error('Error in processStream:', error);
    } finally {
        while (!audioStreamFinished) {
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
        ws.send(JSON.stringify({ ...item, transcript: '', continue: false }));
        console.log('Sent close message.');
    }
}

async function main(args) {
    const ws = new WebSocket(stream_url, {
        headers: { Authorization: `Bearer ${access_key}` },
    });

    ws.on('open', () => {
        console.log('WebSocket connection established.');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    try {
        await Promise.all([processStream(ws, args.max_tokens), receiver(ws)])
    } finally {
        ws.close();
        console.log('WebSocket connection closed');
    }
}

if (typeof require !== 'undefined' && require.main === module) {
    const args = require('yargs')
    .option('max_tokens', {
        type: 'number',
        default: 0,
        describe: 'Specifies the max number of tokens to cancel TTS inference',
    })
    .help()
    .argv;

    main(args).catch((error) => {
        console.error('Error in main:', error);
    });
}
