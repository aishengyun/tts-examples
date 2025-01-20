
const HOST = "https://api.aishengyun.cn"

function mobileCheck() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

function sseevent(message) {
  let type = 'message', start = 0;
  if (message.startsWith('event: ')) {
    start = message.indexOf('\n');
    type = message.slice(7, start);
  }
  start = message.indexOf(': ', start) + 2;
  let data = message.slice(start, message.length);
  return new MessageEvent(type, {data: data})
}

function XhrSource(url, opts) {
  const eventTarget = new EventTarget();
  const xhr = new XMLHttpRequest();

  xhr.open(opts.method || 'GET', url, true);
  for (var k in opts.headers) {
    xhr.setRequestHeader(k, opts.headers[k]);
  }

  var ongoing = false, start = 0;
  xhr.onprogress = function() {
    if (!ongoing) {
      // onloadstart is sync with `xhr.send`, listeners don't have a chance
      ongoing = true;
      eventTarget.dispatchEvent(new Event('open', {
        status: xhr.status,
        headers: xhr.getAllResponseHeaders(),
        url: xhr.responseUrl,
      }));
    }

    var i, chunk;
    while ((i = xhr.responseText.indexOf('\n\n', start)) >= 0) {
      chunk = xhr.responseText.slice(start, i);
      start = i + 2;
      if (chunk.length) {
        eventTarget.dispatchEvent(sseevent(chunk));
      }
    }
  }

  xhr.onloadend = _ => {
    eventTarget.dispatchEvent(new CloseEvent('close'))
  }

  xhr.timeout = opts.timeout;
  xhr.ontimeout = _ => {
    eventTarget.dispatchEvent(new CloseEvent('error', {reason: 'Network request timed out'}));
  }
  xhr.onerror = _ => {
    eventTarget.dispatchEvent(new CloseEvent('error', {reason: xhr.responseText || 'Network request failed'}));
  }
  xhr.onabort = _ => {
    eventTarget.dispatchEvent(new CloseEvent('error', {reason: 'Network request aborted'}));
  }
  xhr.onreadystatechange = () =>{
    if(xhr.readyState == 4) { 
      if (xhr.status == 401) {
        alert("LLM authentication error");
        return;
      }
    }
  }
  eventTarget.close = _ => {
    xhr.abort();
  }
  xhr.withCredentials = true
  xhr.send(opts.body);
  return eventTarget;
}

const app = {
  sample_rate: 24_000,
  debug: true,
  is_mobile: mobileCheck(),
  wavStreamPlayer: null,
  blob: null,
  embedding: null,
  speakers: [
     {
          "name": "天美",
          "language": "zh",
          "text": "哎呀，今天过得怎么样呀？今天下雪了，满天飞舞，可漂亮啦！想不想下班后一起堆雪人？",
          "file_name": "zh_female_tianmei.wav"
      },
      {
          "name": "江剑",
          "language": "zh",
          "text": "今天给大家推荐的这款电动牙刷采用声波震动技术，清洁效果非常好，而且有多种模式可以选择，特别适合牙齿敏感的朋友。",
          "file_name": "zh_male_jiangjian.wav"
      },
      {
          "name":"晓彤",
          "language": "zh",
          "text": "各位新进的大哥，这件羊绒大衣采用双面呢面料，保暖效果特别好，而且版型很显瘦，现在购买享受超级优惠价，还能免费定制。",
          "file_name": "zh_female_xiaotong.wav"
      },
      {
          "name":"佳怡",
          "language": "zh",
          "text": "大家好，今天给大家介绍一个歌手王雨萱。王雨萱演绎过许多浪漫情歌，今天晚上，她带来个人单曲，想你的夜晚。",
          "file_name": "zh_female_jiayi.wav"
      },
      {
          "name": "云亮",
          "language": "zh",
          "text": "阳台的多肉植物长得特别好，五颜六色的特别漂亮，周末打算邀请几个同事来家里做客，顺便交流一下养护心得。",
          "file_name": "zh_male_yunliang.wav"
      },
      {
          "name": "家敏",
          "language": "zh",
          "text": "今天天气特别好，阳光明媚，微风轻拂，我们一家人可以去附近的森林公园野餐，顺便带上相机拍些照片留作纪念。",
          "file_name": "zh_female_jiamin.wav"
      },
      {
          "name": "建平",
          "language": "zh",
          "text": "家里的智能音箱已经设置好了定时功能，每天早上七点准时播放轻音乐，让我们能够在美妙的音乐中自然醒来开始新的一天。",
           "file_name": "zh_male_jianping.wav"
      },
      {
          "name": "淑芬",
          "language": "zh",
          "text": "欢迎来到西湖景区，眼前这座历史悠久的断桥就是白娘子与许仙相会的地方。",
           "file_name": "zh_female_shufen.wav"
      },
      {
          "name":"美玲",
          "language": "zh",
          "text": "今年我们准备把家里的装修风格改成简约北欧风，需要更换一些家具和装饰品，周末可以去逛逛家居城看看有什么合适的。",
          "file_name": "zh_female_meiling.wav"
      },
      {
          "name":"梦瑶",
          "language": "zh",
          "text": "今天晚上有个特大的好消息，公司推出一个新活动。大家注册体验师之后，你就可以免费体验公司的美容产品了。",
          "file_name": "zh_female_mengyao.wav"
      },
      {
          "name":"静怡",
          "language": "zh",
          "text": "生活中的每一次挫折，都是一次成长的机会，不要被困难打倒，静下心来，保持乐观的心态，继续向前。",
          "file_name": "zh_female_jingyi.wav"
      },
      {
          "name":"子涵",
          "language": "zh",
          "text": "浅秋，念你。我静坐在流年里，将心放逐与时光共舞，与你共谱一曲秋水长天，花好月圆。",
          "file_name": "zh_female_zihan.wav"
      },
      {
          "name":"皓然",
          "language": "zh",
          "text": "在这个静谧的夜晚，让我们一起走进这个充满温情的故事，跟随主人公小明展开一段奇妙的乡村寻宝之旅。",
          "file_name": "zh_male_haoran.wav"
      },
      {
          "name": "真由美",
          "language": "jp",
          "text": "ヨガの練習では、呼吸を均等に保ち、動作をゆっくりと柔らかく行い、身体の伸び伸びを感じるようにしてください。",
          "file_name": "jp_female_mayumi.wav"
      },
      {
          "name": "佐藤",
          "language": "jp",
          "text": "長い間会っていません。 最近何で忙しかったのですか？",
          "file_name": "jp_male_satou.wav"
      },
      {
          "name": "加奈子",
          "language": "jp",
          "text": "初めまして、私は教師ですが、あなたはどうですか？",
          "file_name": "jp_female_kanako.wav"
      },
      {
          "name": "中村",
          "language": "jp",
          "text": "北海道では、一年中さまざまなアクティビティが楽しめます。夏の穏やかな気候は、緑豊かな丘や国立公園の探索に最適です。",
          "file_name": "jp_male_nakamura.wav"
      },
      {
          "name": "Amy",
          "language": "en",
          "text": "Let me take care of that for you; I’ll ensure everything is done accurately and efficiently, step by step.",
          "file_name": "en_female_amy.wav"
      },
      {
          "name": "John",
          "language": "en",
          "text": "Meta Odyssey, a free-to-play NFT trading card game which is playable on your web browser. ",
          "file_name": "en_male_john.wav"
      },
      {
          "name": "Ray",
          "language": "en",
          "text": "Remember, it’s okay to ask for help when you need it—support from others can make all the difference.",
          "file_name": "en_male_ray.wav"
      },
      {
          "name": "Orva",
          "language": "en",
          "text": "Hello, we’d like to know if you’re available to handle some of our live phone calls in Miami. Press 1 now to connect with a lead engineer specialist. ",
          "file_name": "en_female_orva.wav"
      }
  ],
  llms: {
    deepseek: {
      llm_url: "https://api.deepseek.com/v1/chat/completions",
      model: "deepseek-chat",
      llm_key: "",
    },
    openai: {
      llm_url: "https://api.openai.com/v1/chat/completions",
      model: "o1-2024-12-17",
      llm_key: "",
    }
  },
  voice: "zh_female_jiayi",
  host: API_HOST,
  model: "deepseek-chat",
  llm_url: "https://api.deepseek.com/v1/chat/completions",
  llm_text: "讲个儿童故事",
  api_key: "",
  llm_key: "",
  transcript: "",
  placeholder: "",
  llm_output: "",
  disabled: false,
  async init() {
    this.set_placeholder(this.speakers[0])
    this.api_key = localStorage.getItem("api_key") || this.api_key
    this.llm_key = localStorage.getItem("llm_key") || this.llm_key
    if (this.api_key){
      this.ws_connect()
    }
  },

  async set_placeholder(speaker){
    const text = speaker.text
    this.voice = speaker.file_name.replace(".wav", "")
    this.transcript = ""
    this.placeholder = text
    await this.cdn_request(this.voice)
  },

  async embedding_request() {
    const headers = {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${this.api_key}`,
    };

    const response = await axios.post(`${this.host}/v1/audio/embedding`, {
      file: document.querySelector('#file').files[0]
    }, { headers });
    this.embedding = response.data.embedding
  },

  async cdn_request(id){
    try{
      var audio = new Audio(`https://cdn.aishengyun.cn/speakers/${id}.wav`);
      audio.play();
      return 
    } catch (error) {
      this.log('Error play file:', error.message);
      throw error;
    }
  },

  async file_request() {

    if (!this.api_key){
      return alert("请输入 API Key")
    }
    if (!this.transcript){
      return alert("请输入文字")
    }
    this.disabled = true
    const voiceConfig = this.embedding
        ? { mode: 'embedding', embedding: this.embedding }
        : { mode: 'id', id: this.voice };
    const message = {
      model_id: 'emotion-tts-v1',
      voice: voiceConfig,
      output_format: {
          container: 'wav',
          encoding: 'pcm_s16le',
          sample_rate: this.sample_rate,
      },
      language: 'zh',
      transcript: this.transcript,
    };
    try{
      const response =  await axios.post(`${this.host}/v1/audio/speech`, message, {
            headers: {
                Authorization: `Bearer ${this.api_key}`,
                'Content-Type': 'application/json',
            },
            responseType: 'blob',
      });
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'unknown_file.wav';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      this.filename = filename
      this.blob = new Blob([response.data], { type: 'audio/mpeg' });
      this.storage("api_key", this.api_key)
      const speech = window.URL.createObjectURL(this.blob);
      var audio = new Audio(speech);
      audio.play();
      this.disabled = false
    } catch (error) {
      this.log('Error downloading file:', error.message);
      throw error;
    }
  },

  llm_request(){
    if (!this.llm_key){
      return alert("请输入 llm Key")
    }
    this.llm_output = ""
    let cache = []
    const contextId = this.uuidv4()
    let message = {
      model_id: 'emotion-tts-v1',
      voice: { mode: 'id', id: this.voice },
      output_format: {
          container: 'raw',
          encoding: 'pcm_s16le',
          sample_rate: this.sample_rate,
      },
      language: 'zh',
      transcript: '',
      context_id: contextId,
      continue: true,
    };
    const xs = new XhrSource(this.llm_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.llm_key}`,
      },
      body: JSON.stringify(
        {
          "model": this.model,
          "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": this.llm_text}
          ],
          "stream": true
        }
      )
    });
    
    xs.addEventListener('error', e => {
      this.log('ERROR: ' + e.reason)
    });
    
    xs.addEventListener('close', e => {
      this.log('DONE');
    });
    
    xs.addEventListener('message', e => {
      if (e.data == "[DONE]"){
        message.transcript = ''
        message.continue = false
        this.ws.send(JSON.stringify(message))
        this.storage("llm_key", this.llm_key)
        return;
      }
      const parsed = JSON.parse(e.data);
      const text = parsed.choices[0].delta.content
      message.transcript = text
      this.llm_output += text
      this.log(message)
      if(this.ws.readyState != WebSocket.OPEN){
        return cache.push(JSON.stringify(message))
      }
      if(cache.length){
        cache.forEach((message)=>{
          this.ws.send(message);
        })
        cache = []
      }
      this.ws.send(JSON.stringify(message));
    });
  },

  ws_connect(){

    if (!this.api_key){
      return alert("请输入 API Key")
    }
    if (!this.ws){
      this.ws =  new WebSocket(`${this.host.replace(/^http(s)?/,"ws$1")}/v1/audio/speech`, [
        'tts',
        `api-key.${this.api_key}`,
      ]);
    }
    
    this.ws.onclose = (event) => {
      this.log("WebSocket closed:", event)
      // see: https://developer.mozilla.org/zh-CN/docs/Web/API/CloseEvent#status_codes
      if (event.code === 1006) {
        alert("Unauthorization, api_key is invalid")
      }
      this.ws = null
    }

    this.ws.onopen = () => {
      this.log("WebSocket opened")
    };

    this.ws.onerror = (event) => {
      this.log("WebSocket error: ", event);
    }

    this.ws.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      const event = data.type;
      const done = data.done;
      const statusCode = data.status_code;
      this.log("Receive chunk: %s, %d, %s", data.context_id, data.status_code, done)
      if (event === 'chunk') {
        const samples = WavPacker.base64ToArrayBuffer(data.data)
        this.wavStreamPlayer.add16BitPCM(samples, data.context_id)
      }
      if (event === 'done' || statusCode === 200) {
        this.storage("api_key", this.api_key)
      }
    }
  },

  async player() {
    const wavStreamPlayer = new WavStreamPlayer({ sampleRate: this.sample_rate })
    this.wavStreamPlayer = wavStreamPlayer
    await wavStreamPlayer.connect()
  },

  async dialog(){
    if(!this.wavStreamPlayer){
      await this.player()
    }
    this.ws_connect()
    this.llm_request()
  },

  storage(key, val){
    localStorage.setItem(key, val)
  },

  download () {
    if (!this.blob){
      return alert("请生成语音")
    }
    const downloadUrl = URL.createObjectURL(this.blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = this.filename || this.uuidv4() + ".wav";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    this.log(`File downloaded: ${filename}`)
  },

  uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
  },

  log() {
    if (this.debug) {
      console.log(...arguments);
    }
  },
  
}

globalThis.app = app