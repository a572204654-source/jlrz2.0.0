const express = require('express')
const router = express.Router()
const multer = require('multer')
const { success, badRequest, serverError } = require('../utils/response')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { getVoiceRecognitionService } = require('../utils/voiceRecognition')

// 注意：WebSocket 支持已在 bin/www 中通过 expressWs(app, server) 启用
// 所有通过 app.use() 挂载的 router 都会自动获得 .ws() 方法

// 配置文件上传（使用内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制10MB
  }
})

/**
 * 实时语音识别（上传音频文件）
 * POST /api/realtime-voice/recognize
 * 
 * 使用实时语音识别接口（WebSocket流式）识别上传的音频文件
 * 将音频文件分块发送到实时识别服务，模拟实时流
 * 
 * 请求参数:
 * - audio: 音频文件（multipart/form-data）
 * - engineType: 识别引擎类型（可选，默认16k_zh）
 * - voiceFormat: 音频格式（可选，1:pcm 4:wav 6:mp3）
 * - needvad: 是否需要VAD（可选，0或1，默认1）
 * - filterDirty: 是否过滤脏词（可选，0或1）
 * - filterModal: 是否过滤语气词（可选，0或1）
 * - filterPunc: 是否过滤标点（可选，0或1）
 * - convertNumMode: 是否转换数字（可选，0或1）
 * - wordInfo: 词级别时间戳（可选，0-2，默认2）
 * - vadSilenceTime: VAD静音检测时间(ms)（可选，默认200）
 */
router.post('/recognize', authenticate, upload.single('audio'), async (req, res) => {
  try {
    const userId = req.userId

    if (!req.file) {
      return badRequest(res, '请上传音频文件')
    }

    const audioBuffer = req.file.buffer
    const audioSize = req.file.size

    console.log('收到实时语音识别请求:', {
      userId,
      fileName: req.file.originalname,
      size: audioSize
    })

    // 获取识别选项
    const options = {
      engineType: req.body.engineType || '16k_zh',
      voiceFormat: parseInt(req.body.voiceFormat) || 1,
      needvad: parseInt(req.body.needvad) !== undefined ? parseInt(req.body.needvad) : 1,
      filterDirty: parseInt(req.body.filterDirty) || 0,
      filterModal: parseInt(req.body.filterModal) || 0,
      filterPunc: parseInt(req.body.filterPunc) || 0,
      convertNumMode: parseInt(req.body.convertNumMode) || 1,
      wordInfo: parseInt(req.body.wordInfo) || 2,
      vadSilenceTime: parseInt(req.body.vadSilenceTime) || 200
    }

    const voiceService = getVoiceRecognitionService()
    const result = await voiceService.recognizeFileWithRealtime(audioBuffer, options)

    // 保存识别记录
    const insertResult = await query(
      `INSERT INTO voice_recognition_logs 
        (user_id, audio_size, recognized_text, audio_time, recognition_type, options, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, audioSize, result.text || '', result.audioTime || 0, 'realtime', JSON.stringify(options)]
    )

    return success(res, {
      id: insertResult.insertId,
      text: result.text,
      audioTime: result.audioTime,
      wordList: result.wordList || []
    }, '识别成功')

  } catch (error) {
    console.error('实时语音识别错误:', error)
    return serverError(res, error.message || '语音识别失败')
  }
})

/**
 * WebSocket测试接口
 * WS /api/realtime-voice/test
 * 
 * 用于测试WebSocket连接是否正常
 */
router.ws('/test', (ws, req) => {
  console.log('WebSocket测试客户端已连接')
  
  // 立即发送欢迎消息
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'WebSocket连接成功！',
    timestamp: Date.now()
  }))
  
  // 监听消息
  ws.on('message', (msg) => {
    try {
      const message = JSON.parse(msg.toString())
      console.log('收到测试消息:', message)
      
      // 回显消息
      ws.send(JSON.stringify({
        type: 'echo',
        original: message,
        timestamp: Date.now()
      }))
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '消息格式错误'
      }))
    }
  })
  
  // 连接关闭
  ws.on('close', () => {
    console.log('WebSocket测试客户端已断开')
  })
  
  // 连接错误
  ws.on('error', (error) => {
    console.error('WebSocket测试错误:', error)
  })
})

/**
 * 实时语音识别（WebSocket流式）
 * WS /api/realtime-voice/stream
 * 
 * 用于长时间实时语音输入，支持边说边识别
 * 客户端需要持续发送音频数据帧
 */
router.ws('/stream', (ws, req) => {
  console.log('WebSocket客户端已连接:', req.url)

  let recognition = null
  let userId = null
  let voiceLogId = null
  let recognizedText = ''
  let audioSize = 0
  let startTime = Date.now()

  // 接收客户端消息
  ws.on('message', async (msg) => {
    try {
      const message = JSON.parse(msg.toString())
      console.log('收到客户端消息:', message.type)

      // 初始化识别
      if (message.type === 'start') {
        userId = message.userId
        const token = message.token

        // TODO: 验证token和userId
        // 简化处理，实际应该验证token
        if (!userId || !token) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '缺少认证信息'
          }))
          ws.close()
          return
        }

        // 获取识别选项
        const options = {
          engineType: message.engineType || '16k_zh',
          voiceFormat: message.voiceFormat || 1,
          needvad: message.needvad !== undefined ? message.needvad : 1,
          filterDirty: message.filterDirty || 0,
          filterModal: message.filterModal || 0,
          convertNumMode: message.convertNumMode || 1,
          wordInfo: message.wordInfo || 2,
          vadSilenceTime: message.vadSilenceTime || 200
        }

        console.log('开始实时识别，用户ID:', userId, '选项:', options)

        // 创建实时识别连接
        const voiceService = getVoiceRecognitionService()
        
        recognition = voiceService.createRealtimeRecognition(
          options,
          // 识别结果回调
          (result) => {
            console.log('识别结果:', result)
            recognizedText = result.text

            // 发送识别结果到客户端
            ws.send(JSON.stringify({
              type: 'result',
              voiceId: result.voiceId,
              text: result.text,
              isFinal: result.isFinal,
              wordList: result.wordList
            }))

            // 如果是最终结果，保存到数据库
            if (result.isFinal && userId) {
              saveRecognitionLog(userId, recognizedText, audioSize, options)
                .then(id => {
                  voiceLogId = id
                  console.log('识别记录已保存，ID:', id)
                })
                .catch(err => {
                  console.error('保存识别记录错误:', err)
                })
            }
          },
          // 错误回调
          (error) => {
            console.error('识别错误:', error)
            ws.send(JSON.stringify({
              type: 'error',
              message: error.message || '识别失败'
            }))
          }
        )

        // 发送就绪消息
        ws.send(JSON.stringify({
          type: 'ready',
          message: '识别服务已就绪'
        }))
      }
      // 发送音频数据
      else if (message.type === 'audio') {
        if (!recognition) {
          ws.send(JSON.stringify({
            type: 'error',
            message: '识别服务未初始化'
          }))
          return
        }

        // 解码Base64音频数据
        const audioData = Buffer.from(message.data, 'base64')
        audioSize += audioData.length

        // 发送到腾讯云
        recognition.send(audioData, message.isEnd || false)

        // 如果是最后一帧，发送完成消息
        if (message.isEnd) {
          console.log('音频发送完成，总大小:', audioSize)
        }
      }
      // 停止识别
      else if (message.type === 'stop') {
        if (recognition) {
          recognition.close()
          recognition = null
        }

        ws.send(JSON.stringify({
          type: 'stopped',
          message: '识别已停止',
          logId: voiceLogId,
          text: recognizedText,
          audioSize: audioSize,
          duration: Date.now() - startTime
        }))
      }
    } catch (error) {
      console.error('处理WebSocket消息错误:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message || '处理消息失败'
      }))
    }
  })

  // 连接关闭
  ws.on('close', () => {
    console.log('WebSocket客户端已断开')
    if (recognition) {
      recognition.close()
      recognition = null
    }
  })

  // 连接错误
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error)
    if (recognition) {
      recognition.close()
      recognition = null
    }
  })
})

/**
 * 保存识别记录到数据库
 */
async function saveRecognitionLog(userId, text, audioSize, options) {
  try {
    const result = await query(
      `INSERT INTO voice_recognition_logs 
        (user_id, audio_size, recognized_text, recognition_type, options, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, audioSize, text, 'stream', JSON.stringify(options)]
    )
    return result.insertId
  } catch (error) {
    console.error('保存识别记录错误:', error)
    throw error
  }
}

/**
 * 获取识别历史记录
 * GET /api/realtime-voice/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const offset = (page - 1) * pageSize

    // 查询识别历史
    const logs = await query(
      `SELECT 
        id,
        audio_size,
        recognized_text,
        audio_time,
        recognition_type,
        created_at
       FROM voice_recognition_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    )

    // 查询总数
    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM voice_recognition_logs WHERE user_id = ?',
      [userId]
    )

    return success(res, {
      list: logs.map(log => ({
        id: log.id,
        audioSize: log.audio_size,
        recognizedText: log.recognized_text,
        audioTime: log.audio_time,
        recognitionType: log.recognition_type,
        createdAt: log.created_at
      })),
      pagination: {
        page,
        pageSize,
        total: countResult.total
      }
    })

  } catch (error) {
    console.error('获取识别历史错误:', error)
    return serverError(res, '获取历史记录失败')
  }
})

/**
 * 删除识别记录
 * DELETE /api/realtime-voice/history/:id
 */
router.delete('/history/:id', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const { id } = req.params

    // 查询记录是否存在且属于当前用户
    const logs = await query(
      'SELECT id FROM voice_recognition_logs WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    if (logs.length === 0) {
      return badRequest(res, '记录不存在')
    }

    // 删除记录
    await query('DELETE FROM voice_recognition_logs WHERE id = ?', [id])

    return success(res, null, '删除成功')

  } catch (error) {
    console.error('删除识别记录错误:', error)
    return serverError(res, '删除失败')
  }
})

/**
 * 获取识别统计信息
 * GET /api/realtime-voice/stats
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.userId

    // 查询统计信息
    const [stats] = await query(
      `SELECT 
        COUNT(*) as totalCount,
        SUM(audio_size) as totalAudioSize,
        SUM(audio_time) as totalAudioTime,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as todayCount,
        COUNT(CASE WHEN YEARWEEK(created_at) = YEARWEEK(NOW()) THEN 1 END) as weekCount,
        COUNT(CASE WHEN YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW()) THEN 1 END) as monthCount
       FROM voice_recognition_logs
       WHERE user_id = ?`,
      [userId]
    )

    return success(res, {
      totalCount: stats.totalCount || 0,
      totalAudioSize: stats.totalAudioSize || 0,
      totalAudioTime: stats.totalAudioTime || 0,
      todayCount: stats.todayCount || 0,
      weekCount: stats.weekCount || 0,
      monthCount: stats.monthCount || 0
    })

  } catch (error) {
    console.error('获取识别统计错误:', error)
    return serverError(res, '获取统计信息失败')
  }
})

module.exports = router

