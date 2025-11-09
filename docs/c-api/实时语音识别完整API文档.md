# 实时语音识别完整API文档

> **说明**: 本文档基于项目实际代码生成，所有接口均已实现并可用  
> **最后更新**: 2025-01-09  
> **基于代码**: `routes/realtime-voice.js`, `routes/realtime-voice-socketio.js`, `utils/voiceRecognition.js`

## 📋 目录

- [基础信息](#基础信息)
- [接口列表](#接口列表)
- [HTTP接口](#http接口)
  - [1. 实时语音识别（上传音频文件）](#1-实时语音识别上传音频文件)
  - [2. 获取识别历史](#2-获取识别历史)
  - [3. 删除识别记录](#3-删除识别记录)
  - [4. 获取统计信息](#4-获取统计信息)
- [WebSocket接口](#websocket接口)
  - [5. WebSocket流式识别](#5-websocket流式识别)
- [Socket.IO接口](#socketio接口)
  - [6. Socket.IO实时流式识别](#6-socketio实时流式识别)
- [数据结构说明](#数据结构说明)
- [错误码说明](#错误码说明)
- [小程序调用示例](#小程序调用示例)

---

## 基础信息

### API地址

- **HTTP接口基础路径**: `https://your-domain.com/api/realtime-voice`
- **Socket.IO接口基础路径**: `https://your-domain.com/api/realtime-voice-socketio`
- **WebSocket接口**: `wss://your-domain.com/api/realtime-voice/stream`
- **Socket.IO命名空间**: `/realtime-voice`

### 认证方式

所有接口都需要JWT Token认证（除了WebSocket/Socket.IO连接建立后的认证）。

**Token传递方式**:
- HTTP接口: 请求头 `Authorization: Bearer {token}` 或 `token: {token}`
- WebSocket: 在 `start` 消息中传递 `token` 字段
- Socket.IO: 在 `start` 事件中传递 `token` 字段

### Content-Type

- 文件上传: `multipart/form-data`
- JSON数据: `application/json`

---

## 接口列表

| 序号 | 接口路径 | 方法 | 说明 | 认证 |
|------|---------|------|------|------|
| 1 | `/api/realtime-voice/recognize` | POST | 上传音频文件识别 | ✅ |
| 2 | `/api/realtime-voice/history` | GET | 获取识别历史 | ✅ |
| 3 | `/api/realtime-voice/history/:id` | DELETE | 删除识别记录 | ✅ |
| 4 | `/api/realtime-voice/stats` | GET | 获取统计信息 | ✅ |
| 5 | `/api/realtime-voice/stream` | WS | WebSocket流式识别 | ✅ |
| 6 | `/api/realtime-voice-socketio/recognize` | POST | 上传音频文件识别（Socket.IO版本） | ✅ |
| 7 | `/api/realtime-voice-socketio/history` | GET | 获取识别历史（Socket.IO版本） | ✅ |
| 8 | `/api/realtime-voice-socketio/history/:id` | DELETE | 删除识别记录（Socket.IO版本） | ✅ |
| 9 | `/api/realtime-voice-socketio/stats` | GET | 获取统计信息（Socket.IO版本） | ✅ |
| 10 | Socket.IO `/realtime-voice` | Socket.IO | Socket.IO实时流式识别 | ✅ |

---

## HTTP接口

### 1. 实时语音识别（上传音频文件）

#### 接口说明

使用实时语音识别接口（WebSocket流式）识别上传的音频文件。将音频文件分块发送到实时识别服务，模拟实时流。

#### 请求信息

- **接口地址**: `POST /api/realtime-voice/recognize`
- **是否需要认证**: ✅ 是
- **Content-Type**: `multipart/form-data`

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|-------|------|------|------|--------|
| audio | File | ✅ | 音频文件 | - |
| engineType | String | ❌ | 识别引擎类型 | 16k_zh |
| voiceFormat | Int | ❌ | 音频格式（1:pcm 4:wav 6:mp3） | 1 |
| needvad | Int | ❌ | 是否需要VAD（0或1） | 1 |
| filterDirty | Int | ❌ | 是否过滤脏词（0或1） | 0 |
| filterModal | Int | ❌ | 是否过滤语气词（0或1） | 0 |
| filterPunc | Int | ❌ | 是否过滤标点（0或1） | 0 |
| convertNumMode | Int | ❌ | 是否转换数字（0或1） | 1 |
| wordInfo | Int | ❌ | 词级别时间戳（0-2） | 2 |
| vadSilenceTime | Int | ❌ | VAD静音检测时间(ms) | 200 |

**engineType 可选值**:
- `16k_zh`: 16kHz中文（推荐）
- `8k_zh`: 8kHz中文
- `16k_en`: 16kHz英文

**voiceFormat 可选值**:
- `1`: PCM格式（推荐）
- `4`: WAV格式
- `6`: MP3格式

**文件大小限制**: 10MB

#### 请求示例

```javascript
// 小程序端调用
wx.uploadFile({
  url: 'https://your-domain.com/api/realtime-voice/recognize',
  filePath: tempFilePath,
  name: 'audio',
  header: {
    'token': wx.getStorageSync('token')
  },
  formData: {
    engineType: '16k_zh',
    voiceFormat: '1',
    needvad: '1',
    filterDirty: '0',
    filterModal: '0',
    filterPunc: '0',
    convertNumMode: '1',
    wordInfo: '2',
    vadSilenceTime: '200'
  },
  success: (res) => {
    const data = JSON.parse(res.data)
    if (data.code === 0) {
      console.log('识别结果:', data.data.text)
      console.log('识别ID:', data.data.id)
      console.log('音频时长:', data.data.audioTime)
      console.log('词列表:', data.data.wordList)
    }
  }
})
```

#### 响应数据

**成功响应**:

```json
{
  "code": 0,
  "message": "识别成功",
  "data": {
    "id": 123,
    "text": "今天天气晴朗，施工进展顺利",
    "audioTime": 3000,
    "wordList": [
      {
        "word": "今天",
        "start_time": 0,
        "end_time": 500
      }
    ]
  },
  "timestamp": 1699200000000
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|-------|------|------|
| code | Int | 状态码，0表示成功 |
| message | String | 提示消息 |
| data.id | Int | 识别记录ID |
| data.text | String | 识别的文本内容 |
| data.audioTime | Int | 音频时长（毫秒） |
| data.wordList | Array | 词级别信息数组 |
| timestamp | Long | 响应时间戳 |

---

### 2. 获取识别历史

#### 接口说明

获取当前用户的语音识别历史记录，支持分页查询。

#### 请求信息

- **接口地址**: `GET /api/realtime-voice/history`
- **是否需要认证**: ✅ 是

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|-------|------|------|------|--------|
| page | Int | ❌ | 页码 | 1 |
| pageSize | Int | ❌ | 每页数量 | 20 |

#### 请求示例

```javascript
wx.request({
  url: 'https://your-domain.com/api/realtime-voice/history',
  method: 'GET',
  header: {
    'token': wx.getStorageSync('token')
  },
  data: {
    page: 1,
    pageSize: 20
  },
  success: (res) => {
    if (res.data.code === 0) {
      console.log('历史记录:', res.data.data.list)
      console.log('总数:', res.data.data.pagination.total)
    }
  }
})
```

#### 响应数据

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": 123,
        "audioSize": 102400,
        "recognizedText": "今天天气晴朗，施工进展顺利",
        "audioTime": 3000,
        "recognitionType": "realtime",
        "createdAt": "2025-01-09T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 150
    }
  },
  "timestamp": 1699200000000
}
```

---

### 3. 删除识别记录

#### 接口说明

删除指定的识别历史记录（只能删除自己的记录）。

#### 请求信息

- **接口地址**: `DELETE /api/realtime-voice/history/:id`
- **是否需要认证**: ✅ 是

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| id | Int | ✅ | 记录ID（URL路径参数） |

#### 请求示例

```javascript
wx.request({
  url: 'https://your-domain.com/api/realtime-voice/history/123',
  method: 'DELETE',
  header: {
    'token': wx.getStorageSync('token')
  },
  success: (res) => {
    if (res.data.code === 0) {
      wx.showToast({
        title: '删除成功'
      })
    }
  }
})
```

#### 响应数据

**成功响应**:

```json
{
  "code": 0,
  "message": "删除成功",
  "data": null,
  "timestamp": 1699200000000
}
```

**错误响应**:

```json
{
  "code": 400,
  "message": "记录不存在",
  "data": null,
  "timestamp": 1699200000000
}
```

---

### 4. 获取统计信息

#### 接口说明

获取当前用户的语音识别使用统计信息。

#### 请求信息

- **接口地址**: `GET /api/realtime-voice/stats`
- **是否需要认证**: ✅ 是

#### 请求示例

```javascript
wx.request({
  url: 'https://your-domain.com/api/realtime-voice/stats',
  method: 'GET',
  header: {
    'token': wx.getStorageSync('token')
  },
  success: (res) => {
    if (res.data.code === 0) {
      console.log('统计信息:', res.data.data)
    }
  }
})
```

#### 响应数据

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "totalCount": 500,
    "totalAudioSize": 10485760,
    "totalAudioTime": 150000,
    "todayCount": 20,
    "weekCount": 100,
    "monthCount": 300
  },
  "timestamp": 1699200000000
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|-------|------|------|
| totalCount | Int | 总识别次数 |
| totalAudioSize | Int | 总音频大小（字节） |
| totalAudioTime | Int | 总音频时长（毫秒） |
| todayCount | Int | 今日识别次数 |
| weekCount | Int | 本周识别次数 |
| monthCount | Int | 本月识别次数 |

---

## WebSocket接口

### 5. WebSocket流式识别

#### 接口说明

实时流式语音识别，支持边录音边识别，适用于长时间语音输入和实时反馈场景。

#### 连接信息

- **接口地址**: `wss://your-domain.com/api/realtime-voice/stream`
- **协议**: WebSocket
- **是否需要认证**: ✅ 是（在start消息中传递token）

#### 消息格式

所有消息均为JSON格式字符串。

#### 客户端消息类型

##### 5.1 初始化消息 (start)

建立连接后首先发送初始化消息。

```json
{
  "type": "start",
  "userId": 123,
  "token": "your_jwt_token",
  "engineType": "16k_zh",
  "voiceFormat": 1,
  "needvad": 1,
  "filterDirty": 0,
  "filterModal": 0,
  "convertNumMode": 1,
  "wordInfo": 2,
  "vadSilenceTime": 200
}
```

**参数说明**:

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|-------|------|------|------|--------|
| type | String | ✅ | 消息类型，固定为"start" | - |
| userId | Int | ✅ | 用户ID | - |
| token | String | ✅ | JWT Token | - |
| engineType | String | ❌ | 识别引擎 | 16k_zh |
| voiceFormat | Int | ❌ | 音频格式(1:pcm 4:wav 6:mp3) | 1 |
| needvad | Int | ❌ | 是否启用VAD(0/1) | 1 |
| filterDirty | Int | ❌ | 过滤脏词(0/1) | 0 |
| filterModal | Int | ❌ | 过滤语气词(0/1) | 0 |
| convertNumMode | Int | ❌ | 数字转换(0/1) | 1 |
| wordInfo | Int | ❌ | 词级别信息(0/1/2) | 2 |
| vadSilenceTime | Int | ❌ | VAD静音时间(ms) | 200 |

##### 5.2 音频数据消息 (audio)

持续发送音频数据帧。

```json
{
  "type": "audio",
  "data": "base64_encoded_audio_data",
  "isEnd": false
}
```

**参数说明**:

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| type | String | ✅ | 消息类型，固定为"audio" |
| data | String | ✅ | Base64编码的音频数据 |
| isEnd | Boolean | ✅ | 是否为最后一帧 |

##### 5.3 停止识别消息 (stop)

主动停止识别。

```json
{
  "type": "stop"
}
```

#### 服务器消息类型

##### 5.4 就绪消息 (ready)

服务器连接就绪通知。

```json
{
  "type": "ready",
  "message": "识别服务已就绪"
}
```

##### 5.5 识别结果消息 (result)

实时返回识别结果（中间结果和最终结果）。

```json
{
  "type": "result",
  "voiceId": "1699200000_abc123",
  "text": "今天天气晴朗",
  "isFinal": false,
  "wordList": [
    {
      "word": "今天",
      "start_time": 0,
      "end_time": 500
    }
  ]
}
```

##### 5.6 停止确认消息 (stopped)

识别停止确认。

```json
{
  "type": "stopped",
  "message": "识别已停止",
  "logId": 123,
  "text": "今天天气晴朗，施工进展顺利",
  "audioSize": 102400,
  "duration": 5000
}
```

##### 5.7 错误消息 (error)

识别过程中的错误。

```json
{
  "type": "error",
  "message": "识别失败：音频格式不支持"
}
```

---

## Socket.IO接口

### 6. Socket.IO实时流式识别

#### 接口说明

使用Socket.IO实现的实时流式语音识别，适用于微信小程序等需要Socket.IO的场景。

#### 连接信息

- **命名空间**: `/realtime-voice`
- **协议**: Socket.IO
- **是否需要认证**: ✅ 是（在start事件中传递token）

#### 事件说明

##### 6.1 连接命名空间

```javascript
const socket = io('https://your-domain.com/realtime-voice', {
  transports: ['websocket']
})
```

##### 6.2 客户端事件

###### start - 初始化识别

```javascript
socket.emit('start', {
  token: 'your_jwt_token',
  engineType: '16k_zh',
  voiceFormat: 1,
  needvad: 1,
  filterDirty: 0,
  filterModal: 0,
  convertNumMode: 1,
  wordInfo: 2,
  vadSilenceTime: 200
})
```

**参数说明**: 与WebSocket的start消息相同。

###### audio - 发送音频数据

```javascript
socket.emit('audio', {
  data: 'base64_encoded_audio_data',
  isEnd: false
})
```

**参数说明**: 与WebSocket的audio消息相同。

###### stop - 停止识别

```javascript
socket.emit('stop')
```

##### 6.3 服务器事件

###### ready - 识别服务就绪

```javascript
socket.on('ready', (data) => {
  console.log(data.message) // "识别服务已就绪"
})
```

###### result - 识别结果

```javascript
socket.on('result', (data) => {
  console.log('识别结果:', data.text)
  console.log('是否最终结果:', data.isFinal)
  console.log('词列表:', data.wordList)
})
```

**数据格式**:

```json
{
  "voiceId": "1699200000_abc123",
  "text": "今天天气晴朗",
  "isFinal": false,
  "wordList": [
    {
      "word": "今天",
      "start_time": 0,
      "end_time": 500
    }
  ]
}
```

###### stopped - 识别已停止

```javascript
socket.on('stopped', (data) => {
  console.log('识别已停止')
  console.log('最终文本:', data.text)
  console.log('记录ID:', data.logId)
})
```

**数据格式**:

```json
{
  "message": "识别已停止",
  "logId": 123,
  "text": "今天天气晴朗，施工进展顺利",
  "audioSize": 102400,
  "duration": 5000
}
```

###### error - 错误消息

```javascript
socket.on('error', (data) => {
  console.error('错误:', data.message)
})
```

**数据格式**:

```json
{
  "message": "识别失败：音频格式不支持"
}
```

---

### Socket.IO版本HTTP接口

Socket.IO版本也提供了相同的HTTP接口，路径前缀为 `/api/realtime-voice-socketio`：

- `POST /api/realtime-voice-socketio/recognize` - 上传音频文件识别
- `GET /api/realtime-voice-socketio/history` - 获取识别历史
- `DELETE /api/realtime-voice-socketio/history/:id` - 删除识别记录
- `GET /api/realtime-voice-socketio/stats` - 获取统计信息

这些接口的参数、响应格式与 `/api/realtime-voice` 版本完全相同，只是路径不同。

---

## 数据结构说明

### 识别记录对象

```typescript
interface RecognitionLog {
  id: number                    // 记录ID
  audioSize: number             // 音频大小（字节）
  recognizedText: string        // 识别文本
  audioTime: number             // 音频时长（毫秒）
  recognitionType: string       // 识别类型(realtime/stream)
  createdAt: string             // 创建时间(ISO8601格式)
}
```

### 词级别信息对象

```typescript
interface WordInfo {
  word: string                  // 词语
  start_time: number           // 开始时间（毫秒）
  end_time: number             // 结束时间（毫秒）
}
```

### 统计信息对象

```typescript
interface Stats {
  totalCount: number            // 总识别次数
  totalAudioSize: number        // 总音频大小（字节）
  totalAudioTime: number        // 总音频时长（毫秒）
  todayCount: number            // 今日识别次数
  weekCount: number             // 本周识别次数
  monthCount: number            // 本月识别次数
}
```

---

## 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 0 | 成功 | - |
| 400 | 参数错误 | 检查请求参数 |
| 401 | 未授权 | 请先登录 |
| 403 | 无权限 | 无权操作该资源 |
| 404 | 资源不存在 | 记录不存在 |
| 500 | 服务器错误 | 联系技术支持 |

### 常见错误示例

```json
{
  "code": 400,
  "message": "请上传音频文件",
  "data": null,
  "timestamp": 1699200000000
}
```

```json
{
  "code": 401,
  "message": "未授权，请先登录",
  "data": null,
  "timestamp": 1699200000000
}
```

```json
{
  "code": 500,
  "message": "语音识别失败",
  "data": null,
  "timestamp": 1699200000000
}
```

---

## 小程序调用示例

### 完整示例：使用Socket.IO实时识别

```javascript
// pages/voice-recognition/index.js
Page({
  data: {
    recognizedText: '',
    isRecording: false,
    socket: null
  },

  onLoad() {
    // 初始化Socket.IO连接
    const socket = io('https://your-domain.com/realtime-voice', {
      transports: ['websocket']
    })

    this.setData({ socket })

    // 监听连接成功
    socket.on('connect', () => {
      console.log('Socket.IO连接成功')
    })

    // 监听识别服务就绪
    socket.on('ready', (data) => {
      console.log('识别服务已就绪')
      this.startRecording()
    })

    // 监听识别结果
    socket.on('result', (data) => {
      console.log('识别结果:', data.text)
      this.setData({
        recognizedText: data.text
      })
    })

    // 监听识别停止
    socket.on('stopped', (data) => {
      console.log('识别已停止')
      console.log('最终文本:', data.text)
      this.setData({
        isRecording: false
      })
    })

    // 监听错误
    socket.on('error', (data) => {
      console.error('错误:', data.message)
      wx.showToast({
        title: data.message,
        icon: 'none'
      })
    })
  },

  // 开始识别
  startRecognition() {
    const socket = this.data.socket
    const token = wx.getStorageSync('token')

    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 发送start事件
    socket.emit('start', {
      token: token,
      engineType: '16k_zh',
      voiceFormat: 1,
      needvad: 1,
      filterModal: 1,
      convertNumMode: 1
    })

    this.setData({
      isRecording: true
    })
  },

  // 开始录音
  startRecording() {
    const recorderManager = wx.getRecorderManager()

    recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'pcm',
      frameSize: 10
    })

    // 监听音频帧
    recorderManager.onFrameRecorded((res) => {
      const { frameBuffer } = res
      const base64 = wx.arrayBufferToBase64(frameBuffer)

      // 发送音频数据
      this.data.socket.emit('audio', {
        data: base64,
        isEnd: false
      })
    })

    // 监听录音停止
    recorderManager.onStop((res) => {
      console.log('录音已停止')
      
      // 发送最后一帧
      this.data.socket.emit('audio', {
        data: '',
        isEnd: true
      })

      // 停止识别
      this.data.socket.emit('stop')
    })
  },

  // 停止识别
  stopRecognition() {
    const recorderManager = wx.getRecorderManager()
    recorderManager.stop()
  },

  onUnload() {
    // 清理资源
    if (this.data.socket) {
      this.data.socket.disconnect()
    }
  }
})
```

### 完整示例：使用HTTP接口上传识别

```javascript
// pages/voice-recognition/upload.js
Page({
  // 录音并上传识别
  recordAndRecognize() {
    const recorderManager = wx.getRecorderManager()

    // 开始录音
    recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      format: 'mp3'
    })

    // 停止录音
    setTimeout(() => {
      recorderManager.stop()
    }, 5000) // 录音5秒

    // 录音停止后上传
    recorderManager.onStop((res) => {
      const { tempFilePath } = res
      const token = wx.getStorageSync('token')

      wx.uploadFile({
        url: 'https://your-domain.com/api/realtime-voice/recognize',
        filePath: tempFilePath,
        name: 'audio',
        header: {
          'token': token
        },
        formData: {
          engineType: '16k_zh',
          voiceFormat: '1',
          needvad: '1',
          filterModal: '1',
          convertNumMode: '1'
        },
        success: (uploadRes) => {
          const data = JSON.parse(uploadRes.data)
          if (data.code === 0) {
            console.log('识别结果:', data.data.text)
            wx.showToast({
              title: '识别成功',
              icon: 'success'
            })
          } else {
            wx.showToast({
              title: data.message,
              icon: 'none'
            })
          }
        },
        fail: (err) => {
          console.error('上传失败:', err)
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      })
    })
  }
})
```

---

## 最佳实践

### 1. 音频配置推荐

```javascript
// 一句话识别（短语音）
recorderManager.start({
  duration: 60000,
  sampleRate: 16000,
  numberOfChannels: 1,
  format: 'mp3'
})

// 实时流式识别（长语音）
recorderManager.start({
  duration: 60000,
  sampleRate: 16000,
  numberOfChannels: 1,
  format: 'pcm',        // 使用PCM
  frameSize: 10         // 10KB一帧
})
```

### 2. 错误处理

```javascript
// HTTP接口错误处理
wx.uploadFile({
  url: 'https://your-domain.com/api/realtime-voice/recognize',
  filePath: tempFilePath,
  name: 'audio',
  header: {
    'token': wx.getStorageSync('token')
  },
  success: (res) => {
    const data = JSON.parse(res.data)
    if (data.code === 0) {
      // 成功
      console.log(data.data.text)
    } else {
      // 失败
      wx.showToast({
        title: data.message,
        icon: 'none'
      })
    }
  },
  fail: (err) => {
    console.error('上传失败:', err)
    wx.showToast({
      title: '上传失败',
      icon: 'none'
    })
  }
})
```

### 3. 资源清理

```javascript
// 页面卸载时清理
onUnload() {
  if (this.recorderManager) {
    this.recorderManager.stop()
  }
  
  if (this.socket) {
    this.socket.disconnect()
  }
}
```

---

## 常见问题

### Q1: WebSocket/Socket.IO连接失败？

**解决方案**:
1. 检查URL是否正确（wss:// 或 https://）
2. 检查Token是否有效
3. 在小程序管理后台配置合法域名
4. 检查网络连接

### Q2: 识别结果不准确？

**优化建议**:
1. 使用16kHz采样率
2. 在安静环境录音
3. 启用VAD和语气词过滤
4. 靠近麦克风说话

### Q3: 音频上传失败？

**检查项**:
1. 文件大小是否超过10MB
2. 音频格式是否支持
3. Token是否有效
4. 网络连接是否正常

### Q4: Socket.IO连接不稳定？

**解决方案**:
1. 使用websocket传输方式
2. 添加重连机制
3. 处理断线重连
4. 添加心跳机制

---

**文档版本**: v2.0.0  
**最后更新**: 2025-01-09  
**维护者**: 开发团队



