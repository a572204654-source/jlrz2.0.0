/**
 * 语音识别路由
 * 使用腾讯云语音识别 API 进行语音转文字
 * 文档: https://cloud.tencent.com/document/product/1093/35637
 */

const express = require('express')
const multer = require('multer')
const router = express.Router()
const { success, badRequest, serverError, unauthorized } = require('../utils/response')
const { authenticate, optionalAuth } = require('../middleware/auth')

// 延迟加载 tencent-asr 模块，避免启动时加载失败
let sentenceRecognition
try {
  const tencentAsr = require('../utils/tencent-asr')
  sentenceRecognition = tencentAsr.sentenceRecognition
} catch (error) {
  console.error('⚠️ 语音识别模块加载失败:', error.message)
  // 创建一个占位函数，返回错误信息
  sentenceRecognition = async () => {
    throw new Error('语音识别服务未正确配置，请检查腾讯云SDK依赖和配置')
  }
}

// 配置 multer 用于处理文件上传
// 内存存储，不保存到磁盘
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 最大10MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的音频格式
    const allowedMimes = [
      'audio/pcm',
      'audio/wav',
      'audio/wave',
      'audio/mp3',
      'audio/mpeg',
      'audio/x-wav',
      'application/octet-stream' // 小程序可能使用这个类型
    ]

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的音频格式，支持 PCM、WAV、MP3 格式'))
    }
  }
})

/**
 * 一句话识别
 * POST /api/voice-recognition/recognize
 * 
 * 请求参数:
 * - audio: 音频文件（multipart/form-data）
 * - engineType: 引擎类型（可选，默认16k_zh）
 * - voiceFormat: 音频格式（可选，1=PCM, 4=WAV, 8=MP3，默认自动检测）
 * - filterDirty: 是否过滤脏词（可选，0/1，默认0）
 * - filterModal: 是否过滤语气词（可选，0/1，默认0）
 * - filterPunc: 是否过滤标点符号（可选，0/1，默认0）
 * - convertNumMode: 数字转换模式（可选，0/1，默认1）
 * - wordInfo: 词级别时间戳（可选，0/1/2，默认0）
 * 
 * 返回数据:
 * - text: 识别文本
 * - requestId: 请求ID
 * - audioTime: 音频时长（秒）
 */
router.post('/recognize', optionalAuth, upload.single('audio'), async (req, res) => {
  try {
    // 检查文件是否存在
    if (!req.file) {
      return badRequest(res, '请上传音频文件')
    }

    const audioFile = req.file
    const audioBuffer = audioFile.buffer

    // 检查文件大小（一句话识别限制60秒，约1MB的PCM数据）
    if (audioBuffer.length === 0) {
      return badRequest(res, '音频文件为空')
    }

    // 构建识别选项
    const options = {
      engineType: req.body.engineType || '16k_zh',
      voiceFormat: req.body.voiceFormat ? parseInt(req.body.voiceFormat) : undefined,
      filterDirty: req.body.filterDirty !== undefined ? parseInt(req.body.filterDirty) : 0,
      filterModal: req.body.filterModal !== undefined ? parseInt(req.body.filterModal) : 0,
      filterPunc: req.body.filterPunc !== undefined ? parseInt(req.body.filterPunc) : 0,
      convertNumMode: req.body.convertNumMode !== undefined ? parseInt(req.body.convertNumMode) : 1,
      wordInfo: req.body.wordInfo !== undefined ? parseInt(req.body.wordInfo) : 0
    }

    // 根据文件类型自动检测音频格式
    if (!options.voiceFormat) {
      const mimeType = audioFile.mimetype.toLowerCase()
      if (mimeType.includes('pcm') || mimeType === 'application/octet-stream') {
        options.voiceFormat = 1 // PCM
      } else if (mimeType.includes('wav') || mimeType.includes('wave')) {
        options.voiceFormat = 4 // WAV
      } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
        options.voiceFormat = 8 // MP3
      } else {
        // 默认尝试PCM格式
        options.voiceFormat = 1
      }
    }

    console.log('开始语音识别，文件大小:', audioBuffer.length, '字节，格式:', options.voiceFormat)

    // 调用腾讯云API进行识别
    const result = await sentenceRecognition(audioBuffer, options)

    // 记录识别日志（如果用户已登录）
    if (req.userId) {
      console.log(`用户 ${req.userId} 完成语音识别，识别文本: ${result.text}`)
    }

    return success(res, {
      text: result.text,
      requestId: result.requestId,
      audioTime: result.audioTime
    }, '识别成功')

  } catch (error) {
    console.error('语音识别错误:', error)
    return serverError(res, error.message || '语音识别失败')
  }
})

/**
 * 识别状态查询（用于测试）
 * GET /api/voice-recognition/status
 */
router.get('/status', (req, res) => {
  const config = require('../config')
  const asrConfig = config.tencentAsr

  return success(res, {
    configured: !!(asrConfig.secretId && asrConfig.secretKey),
    region: asrConfig.region,
    defaultEngineType: asrConfig.defaultEngineType,
    defaultVoiceFormat: asrConfig.defaultVoiceFormat
  }, '语音识别服务状态')
})

module.exports = router

