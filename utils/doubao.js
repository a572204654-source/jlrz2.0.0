const axios = require('axios')
const fs = require('fs')
const path = require('path')
const mammoth = require('mammoth')
const config = require('../config')

/**
 * 调用豆包AI API
 * @param {Array} messages - 对话消息列表 [{role: 'user'|'assistant', content: '...'}]
 * @param {Object} options - 可选配置
 * @returns {Promise<string>} AI回复内容
 */
async function callDoubaoAPI(messages, options = {}) {
  try {
    const {
      maxTokens = config.doubao.maxTokens,
      temperature = config.doubao.temperature,
      timeout = 60000 // 默认60秒超时，应对复杂AI对话
    } = options

    // 检查API Key是否配置
    if (!config.doubao.apiKey) {
      throw new Error('豆包API Key未配置')
    }

    // 检查Endpoint ID是否配置
    if (!config.doubao.endpointId) {
      throw new Error('豆包Endpoint ID未配置')
    }

    // 构建请求数据
    const requestData = {
      model: config.doubao.endpointId,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
      stream: false
    }

    // 调用豆包API（使用较短的超时时间）
    const response = await axios.post(
      `${config.doubao.apiUrl}/chat/completions`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.doubao.apiKey}`
        },
        timeout: timeout
      }
    )

    // 解析响应
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const aiReply = response.data.choices[0].message.content
      return aiReply
    } else {
      throw new Error('豆包API响应格式异常')
    }

  } catch (error) {
    console.error('调用豆包API失败:', error.message)
    
    // 根据不同的错误类型返回更友好的提示
    if (error.message.includes('API Key未配置') || error.message.includes('Endpoint ID未配置')) {
      return '抱歉，AI对话服务尚未配置完成。请联系管理员配置豆包AI相关参数。'
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return '抱歉，AI服务响应超时，请稍后再试。如果问题持续存在，请联系技术支持。'
    }
    
    if (error.response) {
      // API返回了错误响应
      const status = error.response.status
      if (status === 401) {
        return '抱歉，AI服务认证失败。请联系管理员检查API密钥配置。'
      } else if (status === 429) {
        return '抱歉，AI服务请求过于频繁，请稍后再试。'
      } else if (status >= 500) {
        return '抱歉，AI服务暂时不可用，请稍后再试。'
      }
    }
    
    // 网络错误
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return '抱歉，无法连接到AI服务。请检查网络连接或稍后再试。'
    }
    
    // 通用错误提示
    return '抱歉，AI服务暂时遇到了一些问题。请稍后再试，或联系技术支持寻求帮助。'
  }
}

/**
 * 单次对话（不带上下文）
 * @param {string} userMessage - 用户消息
 * @param {Object} options - 可选配置
 * @returns {Promise<string>} AI回复
 */
async function chatWithDoubao(userMessage, options = {}) {
  const messages = [
    {
      role: 'user',
      content: userMessage
    }
  ]
  
  return await callDoubaoAPI(messages, options)
}

/**
 * 多轮对话（带上下文）
 * @param {Array} conversationHistory - 对话历史 [{role: 'user'|'assistant', content: '...'}]
 * @param {string} newMessage - 新消息
 * @param {Object} options - 可选配置
 * @returns {Promise<string>} AI回复
 */
async function chatWithContext(conversationHistory, newMessage, options = {}) {
  const messages = [
    ...conversationHistory,
    {
      role: 'user',
      content: newMessage
    }
  ]
  
  // callDoubaoAPI现在会自动处理错误并返回mock数据
  return await callDoubaoAPI(messages, options)
}

/**
 * 多模态对话（支持图片）
 * @param {Array} conversationHistory - 对话历史
 * @param {string} textMessage - 文本消息
 * @param {Array} images - 图片列表 [{url, base64, type}]
 * @param {Object} options - 可选配置
 * @returns {Promise<string>} AI回复
 */
async function chatWithImages(conversationHistory, textMessage, images = [], options = {}) {
  try {
    // 构建多模态消息内容
    const contentParts = []
    
    // 添加图片
    for (const img of images) {
      if (img.base64) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType || 'image/jpeg'};base64,${img.base64}`
          }
        })
      } else if (img.url) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: img.url
          }
        })
      }
    }
    
    // 添加文本
    if (textMessage) {
      contentParts.push({
        type: 'text',
        text: textMessage
      })
    }
    
    // 构建消息
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: contentParts.length === 1 && contentParts[0].type === 'text' 
          ? textMessage 
          : contentParts
      }
    ]
    
    // 使用视觉模型endpoint（如果配置了）
    const visionOptions = {
      ...options,
      endpointId: config.doubao.visionEndpointId || config.doubao.endpointId
    }
    
    return await callDoubaoAPIWithModel(messages, visionOptions)
  } catch (error) {
    console.error('多模态对话失败:', error.message)
    return '抱歉，处理图片时遇到了问题。请稍后再试。'
  }
}

/**
 * 调用豆包API（支持自定义模型）
 * @param {Array} messages - 消息列表
 * @param {Object} options - 配置选项
 * @returns {Promise<string>} AI回复
 */
async function callDoubaoAPIWithModel(messages, options = {}) {
  try {
    const {
      maxTokens = config.doubao.maxTokens,
      temperature = config.doubao.temperature,
      timeout = 90000, // 视觉模型可能需要更长时间
      endpointId = config.doubao.endpointId
    } = options

    if (!config.doubao.apiKey) {
      throw new Error('豆包API Key未配置')
    }

    if (!endpointId) {
      throw new Error('豆包Endpoint ID未配置')
    }

    const requestData = {
      model: endpointId,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
      stream: false
    }

    const response = await axios.post(
      `${config.doubao.apiUrl}/chat/completions`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.doubao.apiKey}`
        },
        timeout: timeout
      }
    )

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content
    } else {
      throw new Error('豆包API响应格式异常')
    }

  } catch (error) {
    console.error('调用豆包API失败:', error.message)
    throw error
  }
}

/**
 * 分析文档内容
 * @param {string} documentText - 文档文本内容
 * @param {string} question - 用户问题
 * @returns {Promise<string>} AI分析结果
 */
async function analyzeDocument(documentText, question = '请分析这份文档的主要内容') {
  const messages = [
    {
      role: 'system',
      content: '你是一个专业的文档分析助手，擅长阅读和理解各类文档，并提供专业的分析和总结。'
    },
    {
      role: 'user',
      content: `以下是文档内容：\n\n${documentText}\n\n${question}`
    }
  ]
  
  return await callDoubaoAPI(messages, { maxTokens: 4096 })
}

/**
 * 从文件路径读取图片并转为Base64
 * @param {string} filePath - 图片文件路径
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
async function readImageAsBase64(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err)
        return
      }
      
      const ext = path.extname(filePath).toLowerCase()
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      }
      
      resolve({
        base64: data.toString('base64'),
        mimeType: mimeTypes[ext] || 'image/jpeg'
      })
    })
  })
}

/**
 * 监理日志优化专用（带系统提示）
 * @param {string} logContent - 日志内容
 * @returns {Promise<string>} 优化后的内容
 */
async function optimizeSupervisionLog(logContent) {
  const messages = [
    {
      role: 'system',
      content: '你是一个专业的工程监理助手，擅长撰写和优化监理日志。请帮助用户优化监理日志内容，使其更加专业、规范、完整。'
    },
    {
      role: 'user',
      content: `请帮我优化以下监理日志内容，使其更加专业规范：\n\n${logContent}`
    }
  ]
  
  return await callDoubaoAPI(messages)
}

/**
 * 获取AI建议
 * @param {string} question - 用户问题
 * @param {string} context - 上下文信息（可选）
 * @returns {Promise<string>} AI建议
 */
async function getAISuggestion(question, context = '') {
  const systemPrompt = '你是一个工程监理领域的AI助手，请根据用户的问题提供专业的建议和指导。'
  
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    }
  ]
  
  if (context) {
    messages.push({
      role: 'user',
      content: `背景信息：${context}`
    })
  }
  
  messages.push({
    role: 'user',
    content: question
  })
  
  return await callDoubaoAPI(messages)
}

/**
 * 解析DOCX文件内容
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 文档文本内容
 */
async function parseDocxFile(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value.trim()
  } catch (error) {
    console.error('解析DOCX文件失败:', error.message)
    return null
  }
}

/**
 * 解析TXT文件内容
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 文本内容
 */
async function parseTxtFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return content.trim()
  } catch (error) {
    console.error('读取TXT文件失败:', error.message)
    return null
  }
}

/**
 * 根据文件类型解析文档内容
 * @param {string} filePath - 文件路径
 * @param {string} mimeType - MIME类型
 * @returns {Promise<string|null>} 文档文本内容
 */
async function parseDocumentContent(filePath, mimeType) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null
  }

  // DOCX文件
  if (mimeType.includes('word') || mimeType.includes('document') || filePath.endsWith('.docx')) {
    return await parseDocxFile(filePath)
  }
  
  // 纯文本文件
  if (mimeType.includes('text') || filePath.endsWith('.txt') || filePath.endsWith('.md')) {
    return await parseTxtFile(filePath)
  }
  
  // PDF暂不支持（需要额外库）
  if (mimeType.includes('pdf')) {
    return '[PDF文件暂不支持解析，请上传Word文档或文本文件]'
  }
  
  return null
}

module.exports = {
  callDoubaoAPI,
  callDoubaoAPIWithModel,
  chatWithDoubao,
  chatWithContext,
  chatWithImages,
  optimizeSupervisionLog,
  getAISuggestion,
  analyzeDocument,
  readImageAsBase64,
  parseDocxFile,
  parseTxtFile,
  parseDocumentContent
}

