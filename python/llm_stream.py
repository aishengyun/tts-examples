import os
import sys
import copy
import uuid
import json
import base64
import asyncio
import pyaudio
import argparse
import websockets
import logging
from openai import OpenAI

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append('{}/'.format(ROOT_DIR))

from config import access_key, stream_url, llm_url, llm_key, llm_model, voice

logging.basicConfig(
    format = '%(levelname)s: %(asctime)s %(name)s:%(lineno)s %(message)s',
    level = logging.INFO
)

logger = logging.getLogger(__name__)

# output sample rate
sample_rate = 24000 

p = pyaudio.PyAudio()

def llm_stream():
    llm = OpenAI(
        base_url = llm_url,
        api_key = llm_key,
    )
    params = {
        "model": llm_model,
        "max_tokens": 300,
        "temperature": 0.8,
        "messages": [
            {
                "role": "user",
                "content": "讲一个儿童故事",
            }
        ],
        "stream": True,
    }
    return llm.chat.completions.create(**params)


async def receiver(websocket):

    stream = None
    # ffplay  -autoexit -f s16le  -ar 24000 output.raw
    ws = open("output.raw", "wb")

    try:
        stream = p.open(format=pyaudio.paInt16, channels=1, rate=sample_rate, output=True)
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            event = data.get("type")
            context_id = data.get("context_id")
            status_code = data.get("status_code")
            done = data.get("done")
            
            logger.info("receive chunk: %s, %d, %s", context_id, status_code, done)
            if event == "chunk":
                speech = base64.b64decode(data.get("data"))
                stream.write(speech)
                ws.write(speech)
            elif done:
                logger.info("All chunks received")  
                await asyncio.sleep(1)      
                break
            elif status_code not in [200, 206]:
                logger.info("Server error: %s", message)
            await asyncio.sleep(0.001)
    except websockets.exceptions.ConnectionClosed:
            logger.error("WebSocket connection closed")
    except Exception as e:
        logger.error(f"Error in receiver: {e}")
    finally:
        ws.close()
        await websocket.close()
        stream.close()
        p.terminate()    

async def sender(websocket, max_tokens):

    context_id = str(uuid.uuid4())
    item = {
        "model_id": "emotion-tts-v1",
        "voice": { "mode": "id", "id": voice },
        "output_format": {
            "container": "raw", # only support raw for Bidirection Streaming API
            "encoding": "pcm_s16le", # can be pcm_s16le, pcm_mulaw and pcm_alaw
            "sample_rate": sample_rate
        }, 
        "language": "zh", # support cn, en and jp
        "transcript": "",
        "context_id": context_id,
        "continue": True # Whether this input may be followed by more inputs. If not specified, this defaults to false.
    }
    try:
        stream = llm_stream()
        for idx, chunk in enumerate(stream):
            try:
                # send cancel for this context
                if max_tokens > 0 and idx >= max_tokens:
                    await websocket.send(json.dumps({"cancel": True, "context_id": context_id}))
                    break
                
                choices = chunk.choices
                if not choices or len(choices) == 0:
                    continue      
                content = choices[0].delta.content
                if not content:
                    continue
                message = copy.deepcopy(item)
                message["transcript"] = content
                logger.info("send: %s, %s", message["context_id"], message["transcript"])

                try:
                    await websocket.send(json.dumps(message))
                except Exception as e:
                    continue       
                await asyncio.sleep(0.001)
            except Exception as e:
                logger.error(f"Error in sender_stream: {e}")
                continue
            except websockets.exceptions.ConnectionClosed:
                logger.error("WebSocket connection closed")
                break
    except Exception as e:
        logger.error(f"Error during sender streaming: {e}")
    finally:
        message = copy.deepcopy(item)
        message["transcript"] = ""
        message["continue"] = False # no more input
        await websocket.send(json.dumps(message))
        # Close the stream
        if stream:
            stream.close()  # OpenAI stream close is synchronous

async def main(args):
    try:
        headers = {
            "Authorization": f"Bearer {access_key}"
        }
        async with websockets.connect(
            stream_url,
            additional_headers=headers,
            ping_interval=60,
            ping_timeout=60
        ) as websocket:
            await asyncio.gather(sender(websocket, args.max_tokens), receiver(websocket))
    except Exception as e:
        logger.error(f"Connection error: {e}")
            
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='inference with emotion tts model by bidirectional streaming API')
    parser.add_argument('--max_tokens', type=int, default=0, help='specifies the max number of tokens to cancel tts inference')
    args = parser.parse_args()
    try:
        asyncio.run(main(args))
    finally:
        p.terminate()
        logger.info("PyAudio terminated")