const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const yargs = require('yargs');
const { EventSource } = require('eventsource');

const { access_key, speech_url, voice } = require('./config');


const sample_rate = 24000;


function sseMode(message) {
    const id = uuidv4();
    const fileName = `sse-${id}.wav`;

    const es = new EventSource(speech_url,  {
        fetch: (input, init) => fetch(input, {
            ...init,
            method: 'POST',
            body: JSON.stringify(message),
            headers: {
                ...init.headers,
                Authorization: `Bearer ${access_key}`,
                'Content-Type': 'application/json',
            },
        })
    });

    const writeStream = fs.createWriteStream(fileName);
    es.addEventListener("chunk", (event) => {
        const data = JSON.parse(event.data)
        const audioChunk = Buffer.from(data.data, 'base64');
        writeStream.write(audioChunk);
    })
    es.addEventListener("done", (event) => {
        writeStream.end();
        es.close();
        console.log(`File saved as ${fileName}`);
    })
    es.addEventListener("error", (err) => {
        if (err.code === 401 || err.code === 403) {
            console.log('not authorized')
        }
        writeStream.end();
        es.close();
    })
}

async function bytesMode(message) {
    try {
        const response = await axios.post(speech_url, message, {
            headers: {
                Authorization: `Bearer ${access_key}`,
                'Content-Type': 'application/json',
            },
            responseType: 'stream',
        });

        const contentType = response.headers['content-type'];
        console.log('Content-Type:', contentType);

        const contentDisposition = response.headers['content-disposition'];
        const fileName = contentDisposition
            ? contentDisposition.split('filename=')[1]
            : `output-${uuidv4()}.wav`;

        const writeStream = fs.createWriteStream(fileName);
        response.data.pipe(writeStream);

        writeStream.on('finish', () => {
            console.log(`File saved as ${fileName}`);
        });
    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

async function main(args) {

    const message = {
        model_id: 'emotion-tts-v1',
        voice: { mode: 'id', id: voice },
        output_format: {
            container: 'wav',
            encoding: 'pcm_s16le',
            sample_rate: sample_rate,
        },
        control: {
            // emotion: ""
            emotion: "happy" // emotion control, see doument for more detail: https://docs.aishengyun.cn/api/speech/post
        },
        language: 'zh',
        transcript: '哈哈哈!今天发奖金，我开心死了!',
    };

    if (args.sse) {
        sseMode(message);
    } else {
        await bytesMode(message);
    }
}
if (typeof require !== 'undefined' && require.main === module) {
    // 解析命令行参数
    const argv = yargs
    .option('sse', {
        describe: 'Enable server-side events',
        type: 'boolean',
        default: false,
    })
    .help()
    .argv;

    main(argv);
}
