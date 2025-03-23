import os
import sys
import uuid
import json
import base64
import httpx
import argparse


sample_rate = 24000

time_out = 30

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append('{}/'.format(ROOT_DIR))

from config import access_key, speech_url, voice

def sse(message): 
    # sse for httpx
    from httpx_sse import connect_sse
    
    id = str(uuid.uuid4())
    file_name = f"sse-{id}.wav"
    
    with httpx.Client(timeout=httpx.Timeout(timeout=time_out)) as client:
        with connect_sse(client, "POST", speech_url, headers={
            'Authorization': f"Bearer {access_key}",
            'Accept': 'text/event-stream',
            'Content-Type': 'application/json'
        }, data=json.dumps(message)) as event_source:
            
            with open(file_name, "wb") as f:
                for sse in event_source.iter_sse():
                    data = json.loads(sse.data)
                    # inference done
                    if sse.event == "done":
                        print(f"Save to {file_name}")
                    # chunk data
                    if sse.event == "chunk":
                        f.write(base64.b64decode(data.get("data")))


def main(args):
    
    headers = {
        'Authorization': f"Bearer {access_key}",
        'Content-Type': 'application/json'
    }

    message = {
        "model_id": "emotion-tts-v1",
        "voice": { "mode": "id", "id": voice },
        "output_format": {
            "container": "wav", # one of wav, mp3 and raw
            "encoding": "pcm_s16le", # can be pcm_s16le, pcm_mulaw and pcm_alaw if container is wav or raw
            "sample_rate": sample_rate, # value is one of 8000, 16000, 22050, 24000, 32000, 44100, 48000
            # "bit_rate": 128000, # if container is mp3, uncomment bit_rate, value is one of 32000, 64000, 96000, 128000, 192000
        },
        "control": {
            #"emotion": None
            "emotion": "happy" # emotion control, see doument for more detail: https://docs.aishengyun.cn/api/speech/post
        },
        "language": "zh", # support zh, en and jp
        "transcript": "哈哈哈!今天发奖金，我开心死了!"
    }
    
    # sse api
    if args.sse:
        return sse(message)

    # bytes api
    with httpx.Client(timeout=time_out).stream("POST", speech_url, headers=headers, data=json.dumps(message)) as res:
        # should like audio/wav;codec=pcm;rate=24000, otherwise authorization error orinput message error
        
        # 检查响应状态码
        if res.status_code != 200:
            error_text = res.read()
            print(f"Error: {error_text}")
            return
        
        # 从响应头获取文件名
        file_name = res.headers["content-disposition"].split("filename=")[1]
        
        # 写入文件
        with open(file_name, "wb") as f:
            for chunk in res.iter_raw():
                    f.write(chunk)
            print(f"Save to {file_name}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='inference with emotion tts model')
    parser.add_argument('--sse', type=bool, default=False, help='enable server side event')
    args = parser.parse_args()
    main(args)