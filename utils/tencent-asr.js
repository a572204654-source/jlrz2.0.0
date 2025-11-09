/**
 * 腾讯云语音识别工具类
 * 使用腾讯云语音识别 API 进行语音转文字
 * 文档: https://cloud.tencent.com/document/product/1093/35637
 */

const config = require('../config')

// 引入语音识别产品模块
// 使用更安全的导入方式，延迟加载，避免模块加载失败导致应用无法启动
let AsrClient
let tencentcloud

try {
  tencentcloud = require('tencentcloud-sdk-nodejs')
  if (!tencentcloud || !tencentcloud.asr || !tencentcloud.asr.v20190614) {
    throw new Error('腾讯云SDK结构不正确')
  }
  AsrClient = tencentcloud.asr.v20190614.Client
  if (!AsrClient) {
    throw new Error('无法加载腾讯云语音识别客户端类')
  }
} catch (error) {
  console.error('⚠️ 加载腾讯云SDK失败:', error.message)
  console.error('请确保已安装 tencentcloud-sdk-nodejs 依赖: npm install tencentcloud-sdk-nodejs')
  // 不抛出错误，允许模块加载，但在使用时再报错
  AsrClient = null
}

/**
 * 创建语音识别客户端
 */
function createAsrClient() {
  if (!AsrClient) {
    throw new Error('腾讯云SDK未正确加载，请检查 tencentcloud-sdk-nodejs 依赖是否正确安装')
  }

  const asrConfig = config.tencentAsr

  if (!asrConfig.secretId || !asrConfig.secretKey) {
    throw new Error('腾讯云语音识别配置不完整，请设置 TENCENTCLOUD_SECRET_ID 和 TENCENTCLOUD_SECRET_KEY')
  }

  const clientConfig = {
    credential: {
      secretId: asrConfig.secretId,
      secretKey: asrConfig.secretKey
    },
    region: asrConfig.region,
    profile: {
      httpProfile: {
        endpoint: 'asr.tencentcloudapi.com',
        reqTimeout: asrConfig.timeout
      }
    }
  }

  return new AsrClient(clientConfig)
}

/**
 * 一句话识别（适合60秒以内的短音频）
 * @param {Buffer} audioData - 音频数据（Base64编码或原始Buffer）
 * @param {Object} options - 识别选项
 * @param {string} options.engineType - 引擎类型，默认16k_zh（16k中文普通话）
 * @param {number} options.voiceFormat - 音频格式，1=PCM, 4=WAV, 8=MP3，默认1
 * @param {number} options.filterDirty - 是否过滤脏词，0=不过滤，1=过滤，默认0
 * @param {number} options.filterModal - 是否过滤语气词，0=不过滤，1=过滤，默认0
 * @param {number} options.filterPunc - 是否过滤标点符号，0=不过滤，1=过滤，默认0
 * @param {number} options.convertNumMode - 数字转换模式，0=不转换，1=转为阿拉伯数字，默认1
 * @param {number} options.wordInfo - 词级别时间戳，0=不返回，1=返回，2=返回详细信息，默认0
 * @returns {Promise<Object>} 识别结果
 */
async function sentenceRecognition(audioData, options = {}) {
  try {
    const asrConfig = config.tencentAsr
    const client = createAsrClient()

    // 处理音频数据
    let audioBase64
    let dataLen
    if (Buffer.isBuffer(audioData)) {
      audioBase64 = audioData.toString('base64')
      dataLen = audioData.length
    } else if (typeof audioData === 'string') {
      // 如果已经是Base64字符串，直接使用
      audioBase64 = audioData
      // 计算Base64解码后的长度
      dataLen = Buffer.from(audioBase64, 'base64').length
    } else {
      throw new Error('音频数据格式不正确，需要 Buffer 或 Base64 字符串')
    }

    // 构建请求参数
    const params = {
      ProjectId: asrConfig.projectId || 0,
      SubServiceType: 2, // 2=一句话识别
      EngSerViceType: options.engineType || asrConfig.defaultEngineType,
      SourceType: 1, // 0=语音URL，1=语音数据（通过Data字段传递）
      VoiceFormat: options.voiceFormat || asrConfig.defaultVoiceFormat,
      UsrAudioKey: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 用户唯一标识
      Data: audioBase64,
      DataLen: dataLen,
      FilterDirty: options.filterDirty !== undefined ? options.filterDirty : 0,
      FilterModal: options.filterModal !== undefined ? options.filterModal : 0,
      FilterPunc: options.filterPunc !== undefined ? options.filterPunc : 0,
      ConvertNumMode: options.convertNumMode !== undefined ? options.convertNumMode : 1,
      WordInfo: options.wordInfo !== undefined ? options.wordInfo : 0
    }

    console.log('调用腾讯云一句话识别接口，参数:', {
      EngSerViceType: params.EngSerViceType,
      VoiceFormat: params.VoiceFormat,
      DataLen: params.DataLen
    })

    // 调用API
    const response = await client.SentenceRecognition(params)

    // 处理响应
    if (response.Result) {
      return {
        success: true,
        text: response.Result,
        requestId: response.RequestId,
        audioTime: response.AudioTime || 0
      }
    } else {
      throw new Error('识别结果为空')
    }

  } catch (error) {
    console.error('腾讯云语音识别错误:', error)
    
    // 处理错误信息
    let errorMessage = '语音识别失败'
    if (error.code) {
      errorMessage = `语音识别失败: ${error.message || error.code}`
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * 录音文件识别（适合长音频，异步识别）
 * @param {string} audioUrl - 音频文件URL
 * @param {Object} options - 识别选项
 * @returns {Promise<Object>} 任务ID
 */
async function createRecTask(audioUrl, options = {}) {
  try {
    const asrConfig = config.tencentAsr
    const client = createAsrClient()

    const params = {
      ProjectId: asrConfig.projectId || 0,
      SubServiceType: 2,
      EngSerViceType: options.engineType || asrConfig.defaultEngineType,
      SourceType: 0, // 0=语音URL
      Url: audioUrl,
      VoiceFormat: options.voiceFormat || asrConfig.defaultVoiceFormat,
      FilterDirty: options.filterDirty !== undefined ? options.filterDirty : 0,
      FilterModal: options.filterModal !== undefined ? options.filterModal : 0,
      FilterPunc: options.filterPunc !== undefined ? options.filterPunc : 0,
      ConvertNumMode: options.convertNumMode !== undefined ? options.convertNumMode : 1,
      SpeakerDiarization: options.speakerDiarization || 0, // 是否开启说话人分离
      SpeakerNumber: options.speakerNumber || 0 // 说话人数量
    }

    console.log('创建录音文件识别任务，URL:', audioUrl)

    const response = await client.CreateRecTask(params)

    return {
      success: true,
      taskId: response.Data.TaskId,
      requestId: response.RequestId
    }

  } catch (error) {
    console.error('创建录音文件识别任务错误:', error)
    throw new Error(`创建识别任务失败: ${error.message || error.code}`)
  }
}

/**
 * 查询录音文件识别结果
 * @param {number} taskId - 任务ID
 * @returns {Promise<Object>} 识别结果
 */
async function describeTaskStatus(taskId) {
  try {
    const client = createAsrClient()

    const params = {
      TaskId: taskId
    }

    const response = await client.DescribeTaskStatus(params)

    return {
      success: true,
      status: response.Data.Status, // 0=等待处理，1=识别中，2=识别完成，3=识别失败
      statusText: response.Data.StatusStr,
      result: response.Data.Result,
      errorMsg: response.Data.ErrorMsg,
      requestId: response.RequestId
    }

  } catch (error) {
    console.error('查询识别任务状态错误:', error)
    throw new Error(`查询识别结果失败: ${error.message || error.code}`)
  }
}

module.exports = {
  sentenceRecognition,
  createRecTask,
  describeTaskStatus,
  createAsrClient
}

