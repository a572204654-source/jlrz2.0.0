# 语音识别 API 使用说明

## 概述

本项目已集成腾讯云语音识别 API，支持将音频文件转换为文字。

**API 文档**: https://cloud.tencent.com/document/product/1093/35637

## 环境变量配置

在 `.env` 文件中配置以下环境变量：

```env
# 腾讯云 API 密钥（必需）
TENCENTCLOUD_SECRET_ID=your_secret_id
TENCENTCLOUD_SECRET_KEY=your_secret_key

# 腾讯云地域（可选，默认 ap-guangzhou）
TENCENT_REGION=ap-guangzhou

# 项目ID（可选，默认 0）
TENCENT_PROJECT_ID=0

# 默认引擎类型（可选，默认 16k_zh）
ASR_ENGINE_TYPE=16k_zh

# 默认音频格式（可选，1=PCM, 4=WAV, 8=MP3，默认 1）
ASR_VOICE_FORMAT=1

# 请求超时时间（可选，默认 10000 毫秒）
ASR_TIMEOUT=10000
```

## API 接口

### 一句话识别

**接口地址**: `POST /api/voice-recognition/recognize`

**请求方式**: `multipart/form-data`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| audio | File | 是 | 音频文件（最大10MB） |
| engineType | String | 否 | 引擎类型，默认 `16k_zh`（16k中文普通话） |
| voiceFormat | Number | 否 | 音频格式，1=PCM, 4=WAV, 8=MP3，默认自动检测 |
| filterDirty | Number | 否 | 是否过滤脏词，0=不过滤，1=过滤，默认0 |
| filterModal | Number | 否 | 是否过滤语气词，0=不过滤，1=过滤，默认0 |
| filterPunc | Number | 否 | 是否过滤标点符号，0=不过滤，1=过滤，默认0 |
| convertNumMode | Number | 否 | 数字转换模式，0=不转换，1=转为阿拉伯数字，默认1 |
| wordInfo | Number | 否 | 词级别时间戳，0=不返回，1=返回，2=返回详细信息，默认0 |

**支持的音频格式**:
- PCM
- WAV
- MP3

**音频限制**:
- 最大文件大小: 10MB
- 最长时长: 60秒（一句话识别限制）

**响应格式**:

```json
{
  "code": 0,
  "message": "识别成功",
  "data": {
    "text": "识别出的文字内容",
    "requestId": "请求ID",
    "audioTime": 3.5
  },
  "timestamp": 1699200000000
}
```

**错误响应**:

```json
{
  "code": 400,
  "message": "请上传音频文件",
  "data": null,
  "timestamp": 1699200000000
}
```

### 服务状态查询

**接口地址**: `GET /api/voice-recognition/status`

**响应格式**:

```json
{
  "code": 0,
  "message": "语音识别服务状态",
  "data": {
    "configured": true,
    "region": "ap-guangzhou",
    "defaultEngineType": "16k_zh",
    "defaultVoiceFormat": 1
  },
  "timestamp": 1699200000000
}
```

## 小程序调用示例

### 使用 wx.uploadFile 上传音频

```javascript
// 录音完成后
wx.stopRecord({
  success: (res) => {
    const tempFilePath = res.tempFilePath
    
    // 上传音频文件进行识别
    wx.uploadFile({
      url: app.globalData.apiUrl + '/api/voice-recognition/recognize',
      filePath: tempFilePath,
      name: 'audio',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token')
      },
      formData: {
        engineType: '16k_zh',
        convertNumMode: 1
      },
      success: (res) => {
        const data = JSON.parse(res.data)
        if (data.code === 0) {
          console.log('识别结果:', data.data.text)
          // 显示识别结果
          this.setData({
            recognizedText: data.data.text
          })
        } else {
          wx.showToast({
            title: data.message || '识别失败',
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
  }
})
```

### 使用 wx.request 上传 Base64 音频

```javascript
// 将音频文件转换为 Base64
wx.getFileSystemManager().readFile({
  filePath: tempFilePath,
  encoding: 'base64',
  success: (res) => {
    // 使用 FormData 上传
    wx.request({
      url: app.globalData.apiUrl + '/api/voice-recognition/recognize',
      method: 'POST',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token'),
        'Content-Type': 'multipart/form-data'
      },
      data: {
        audio: res.data, // Base64 字符串
        engineType: '16k_zh'
      },
      success: (res) => {
        if (res.data.code === 0) {
          console.log('识别结果:', res.data.data.text)
        }
      }
    })
  }
})
```

## 引擎类型说明

| 引擎类型 | 说明 | 适用场景 |
|---------|------|---------|
| 16k_zh | 16k中文普通话 | 通用场景 |
| 16k_zh_large | 16k中文普通话（大模型） | 高准确率需求 |
| 16k_en | 16k英文 | 英文识别 |
| 16k_ca | 16k粤语 | 粤语识别 |
| 16k_ja | 16k日语 | 日语识别 |
| 16k_ko | 16k韩语 | 韩语识别 |

## 注意事项

1. **API 密钥安全**: 请妥善保管 `SecretId` 和 `SecretKey`，不要提交到代码仓库
2. **费用说明**: 调用腾讯云语音识别 API 会产生费用，请参考[计费说明](https://cloud.tencent.com/document/product/1093/35635)
3. **音频格式**: 建议使用 PCM 或 WAV 格式，识别准确率更高
4. **文件大小**: 单次上传的音频文件不能超过 10MB
5. **时长限制**: 一句话识别接口最长支持 60 秒音频
6. **认证**: 接口支持可选认证，已登录用户会记录识别日志

## 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| 400 | 参数错误 | 检查请求参数是否正确 |
| 401 | 未授权 | 检查 Token 是否有效 |
| 500 | 服务器错误 | 检查腾讯云配置是否正确 |

## 常见问题

### 1. 识别结果为空

- 检查音频文件是否损坏
- 确认音频格式是否支持
- 检查音频时长是否超过 60 秒

### 2. 上传失败

- 检查文件大小是否超过 10MB
- 检查网络连接是否正常
- 确认 API 地址是否正确

### 3. 识别准确率低

- 使用 PCM 或 WAV 格式
- 确保音频清晰，无噪音
- 选择合适的引擎类型

## 相关文档

- [腾讯云语音识别 API 文档](https://cloud.tencent.com/document/product/1093/35637)
- [一句话识别接口文档](https://cloud.tencent.com/document/product/1093/35646)
- [计费说明](https://cloud.tencent.com/document/product/1093/35635)

