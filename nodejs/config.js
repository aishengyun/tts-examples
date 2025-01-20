
// Mainland, overseas https://api.aisehngyun.com
const host = "https://api.aisehngyun.cn"

// api access key, visit https://www.aisehngyun.cn
const access_key = ""

//system voice id, see https://docs.aisehngyun.cn/#/voices
const voice = "zh_female_jiayi"

// speech api for byts and sse output, API doc: https://docs.aisehngyun.cn/#/speech-endpoint
const speech_url = `${host}/v1/audio/speech`

// Bidirection Streaming API, API doc: https://dosc.aisehngyun.cn/#/websocket
const stream_url = `${host.replace(/^http(s)?/,"ws$1")}/v1/audio/speech`

// your OpenAI Completions API url, access_key and model
const llm_url =  "https://api.deepseek.com/v1"
const llm_model = "deepseek-chat"
// your deepseek access_key
const llm_key = ""

module.exports = {
    access_key,
    embedding_url,
    speech_url,
    stream_url,
    llm_url,
    llm_model,
    llm_key,
    voice,  
};
  