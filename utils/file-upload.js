/**
 * 文件上传工具模块
 * 支持本地存储和腾讯云COS
 */

const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

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
 * 生成唯一文件名
 */
const generateFileName = (originalName) => {
  const ext = path.extname(originalName)
  const timestamp = Date.now()
  const random = crypto.randomBytes(8).toString('hex')
  return `${timestamp}_${random}${ext}`
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
    // 处理中文文件名
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
    const newName = generateFileName(originalName)
    cb(null, newName)
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
 * @returns {Object} 文件信息
 */
const processUploadedFile = (file, req) => {
  const category = getFileCategory(file.mimetype)
  
  // 构建文件URL
  const relativePath = path.relative('public', file.path).replace(/\\/g, '/')
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`
  const fileUrl = `${baseUrl}/${relativePath}`
  
  // 处理原始文件名
  const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
  
  return {
    fileName: originalName,
    savedName: file.filename,
    fileType: category,
    mimeType: file.mimetype,
    fileUrl: fileUrl,
    fileSize: file.size,
    filePath: file.path
  }
}

/**
 * 删除文件
 * @param {string} filePath - 文件路径
 */
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      resolve(false)
      return
    }
    
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('删除文件失败:', err)
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
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
  ensureDir
}
