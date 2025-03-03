
// Mainland, overseas https://api.aishengyun.com
const host = "https://api.aishengyun.cn"

// api access key, visit https://console.aishengyun.cn
const access_key = ""

//system voice id, see https://docs.aishengyun.cn/voices
const voice = "zh_female_tianmei"

// speech api for byts and sse output, API doc: https://docs.aishengyun.cn/api/speech/post
const speech_url = `${host}/v1/audio/speech`

// Bidirection Streaming API, API doc: https://docs.aishengyun.cn/api/speech/websocket
const stream_url = `${host.replace(/^http(s)?/,"ws$1")}/v1/audio/speech`

// your OpenAI Completions API url, access_key and model
const llm_url =  "https://api.deepseek.com/v1"
const llm_model = "deepseek-chat"
// your deepseek access_key
const llm_key = ""

module.exports = {
    access_key,
    speech_url,
    stream_url,
    llm_url,
    llm_model,
    llm_key,
    voice,  
};
  