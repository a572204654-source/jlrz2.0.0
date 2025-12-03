/**
 * 文件上传工具模块
 * 支持本地存储和腾讯云COS
 */

const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const config = require('../config')
const { uploadToCOS, deleteFromCOS, isCosAvailable, getKeyFromUrl } = require('./cos-upload')

// 上传目录配置
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads'
const AI_CHAT_DIR = path.join(UPLOAD_DIR, 'ai-chat')

// 确保上传目录存在
const ensureDir = (dir) => {
  const fullPath = path.resolve(dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
  }
  return fullPath
}

// 初始化目录
ensureDir(AI_CHAT_DIR)

/**
 * 生成基于原始文件名的安全文件名（含时间戳防重名）
 */
const generateFileName = (originalName) => {
  const ext = path.extname(originalName)
  const base = path.basename(originalName, ext)
  // 清理非法字符：Windows/Unix不允许的符号统一替换为下划线
  const safeBase = base
    .replace(/[\\\/\:\*\?\"\<\>\|]/g, '_')
    .replace(/\s+/g, ' ') // 多空格归一
    .trim()
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString('hex')
  return `${safeBase}_${timestamp}_${random}${ext}`
}

/**
 * 获取文件类型分类
 */
const getFileCategory = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image'
  if (mimetype.startsWith('audio/')) return 'audio'
  if (mimetype.startsWith('video/')) return 'video'
  if (mimetype.includes('pdf') || mimetype.includes('document') || 
      mimetype.includes('word') || mimetype.includes('excel') ||
      mimetype.includes('text') || mimetype.includes('sheet')) {
    return 'document'
  }
  return 'other'
}

/**
 * 支持的文件类型
 */
const ALLOWED_MIME_TYPES = {
  // 图片
  'image/jpeg': true,
  'image/png': true,
  'image/gif': true,
  'image/webp': true,
  'image/bmp': true,
  // 文档
  'application/pdf': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/vnd.ms-excel': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
  'text/plain': true,
  'text/csv': true,
  'text/markdown': true,
  // 音频
  'audio/mpeg': true,
  'audio/wav': true,
  'audio/ogg': true
}

/**
 * 文件大小限制（字节）
 */
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,    // 图片最大10MB
  document: 20 * 1024 * 1024, // 文档最大20MB
  audio: 50 * 1024 * 1024,    // 音频最大50MB
  other: 10 * 1024 * 1024     // 其他最大10MB
}

/**
 * Multer存储配置 - AI聊天专用
 */
const aiChatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = getFileCategory(file.mimetype)
    const dir = path.join(AI_CHAT_DIR, category)
    ensureDir(dir)
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    // 处理中文文件名，并尽量使用原始文件名保存
    const originalNameRaw = file.originalname
    const originalName = Buffer.from(originalNameRaw, 'latin1').toString('utf8')

    const ext = path.extname(originalName)
    const base = path.basename(originalName, ext)
    const safeBase = base
      .replace(/[\\\/\:\*\?\"\<\>\|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || '文件'

    const category = getFileCategory(file.mimetype)
    const dir = path.join(AI_CHAT_DIR, category)

    // 首选使用“原名.ext”，若已存在则追加(1)(2)...避免重名
    let candidate = `${safeBase}${ext}`
    let idx = 1
    while (fs.existsSync(path.join(dir, candidate))) {
      candidate = `${safeBase}(${idx})${ext}`
      idx += 1
    }
    cb(null, candidate)
  }
})

/**
 * 文件过滤器
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true)
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false)
  }
}

/**
 * AI聊天文件上传中间件
 */
const aiChatUpload = multer({
  storage: aiChatStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 总体限制50MB
    files: 9 // 最多9个文件
  }
})

/**
 * 处理上传后的文件信息
 * @param {Object} file - Multer文件对象
 * @param {Object} req - Express请求对象
 * @returns {Promise<Object>} 文件信息
 */
const processUploadedFile = async (file, req) => {
  const category = getFileCategory(file.mimetype)
  
  // 处理原始文件名
  const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
  
  let fileUrl = ''
  let cosKey = ''
  let storageType = 'local'

  // 如果启用COS，上传到COS
  if (isCosAvailable()) {
    try {
      const result = await uploadToCOS(
        file.path,  // 传入本地临时文件路径
        originalName,
        `ai-chat/${category}`  // 按分类存储
      )
      fileUrl = result.url
      cosKey = result.key
      storageType = 'cos'
      
      // 删除本地临时文件
      try {
        fs.unlinkSync(file.path)
      } catch (unlinkErr) {
        console.warn('删除本地临时文件失败:', unlinkErr.message)
      }
    } catch (err) {
      console.error('COS上传失败，回退到本地存储:', err.message)
      // 回退到本地存储
      const relativePath = path.relative('public', file.path).replace(/\\/g, '/')
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`
      fileUrl = `${baseUrl}/${relativePath}`
    }
  } else {
    // 本地存储
    const relativePath = path.relative('public', file.path).replace(/\\/g, '/')
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`
    fileUrl = `${baseUrl}/${relativePath}`
  }

  return {
    fileName: originalName,
    savedName: file.filename,
    fileType: category,
    mimeType: file.mimetype,
    fileUrl: fileUrl,
    fileSize: file.size,
    filePath: file.path,
    cosKey: cosKey,        // COS文件Key，用于后续删除
    storageType: storageType  // 存储类型：'local' 或 'cos'
  }
}

/**
 * 删除文件（支持本地和COS）
 * @param {string} filePath - 本地文件路径
 * @param {string} cosKey - COS文件Key（可选）
 * @param {string} storageType - 存储类型：'local' 或 'cos'
 */
const deleteFile = async (filePath, cosKey = '', storageType = 'local') => {
  try {
    // 如果是COS存储，优先删除COS文件
    if (storageType === 'cos' && cosKey) {
      try {
        await deleteFromCOS(cosKey)
        return true
      } catch (err) {
        console.error('删除COS文件失败:', err.message)
        return false
      }
    }
    
    // 本地文件删除
    if (!filePath) {
      return false
    }
    
    return new Promise((resolve) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('删除本地文件失败:', err)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  } catch (err) {
    console.error('删除文件异常:', err)
    return false
  }
}

/**
 * 从URL提取文件路径
 * @param {string} fileUrl - 文件URL
 * @returns {string|null} 文件路径
 */
const getFilePathFromUrl = (fileUrl) => {
  try {
    const url = new URL(fileUrl)
    const relativePath = url.pathname.substring(1) // 移除开头的/
    return path.join('public', relativePath)
  } catch (e) {
    return null
  }
}

/**
 * 验证图片是否可以被AI处理
 * @param {string} mimeType - MIME类型
 * @returns {boolean}
 */
const isImageForAI = (mimeType) => {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  return supportedTypes.includes(mimeType)
}

/**
 * 图片转Base64（用于AI API）
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} Base64字符串
 */
const imageToBase64 = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data.toString('base64'))
      }
    })
  })
}

module.exports = {
  aiChatUpload,
  processUploadedFile,
  deleteFile,
  getFilePathFromUrl,
  getFileCategory,
  isImageForAI,
  imageToBase64,
  ALLOWED_MIME_TYPES,
  FILE_SIZE_LIMITS,
  ensureDir,
  // 重新导出COS相关函数，方便外部使用
  uploadToCOS,
  deleteFromCOS,
  isCosAvailable,
  getKeyFromUrl
}
