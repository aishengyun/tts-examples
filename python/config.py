import os
import re

# Mainland, overseas https://api.aishengyun.com
host = "https://api.aishengyun.cn"

# api access key, visit https://console.aishengyun.cn
access_key = ""
# system voice id, see https://docs.aishengyun.cn/voices
voice = "zh_female_wanwanxiaohe"

# speech api for byts and sse output, API doc: https://docs.aishengyun.cn/api/speech/post
speech_url = f"{host}/v1/audio/speech"

# Bidirection Streaming API, API doc: https://docs.aishengyun.cn/api/speech/websocket
ws = re.sub(r"^http(s)?", r"ws\1", host)
stream_url = f"{ws}/v1/audio/speech"

# your OpenAI Completions API url, access_key and model
llm_url =  "https://api.deepseek.com/v1"
llm_model = "deepseek-chat"

# your deepseek access_key
llm_key = ""
