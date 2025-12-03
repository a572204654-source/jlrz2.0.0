/**
 * 通用文件上传路由
 * 支持用户头像、附件、监理日志等各类文件上传到COS
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { success, badRequest, serverError } = require('../utils/response')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { uploadToCOS, deleteFromCOS, isCosAvailable } = require('../utils/cos-upload')

// 临时上传目录
const TEMP_DIR = 'public/uploads/temp'
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

// Multer临时存储配置
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`)
  }
})

// 图片过滤器
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('只支持 JPG、PNG、GIF、WebP 格式的图片'), false)
  }
}

// 文档过滤器
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
  ]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型'), false)
  }
}

// 上传中间件
const avatarUpload = multer({
  storage: tempStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})

const attachmentUpload = multer({
  storage: tempStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 9 }
})

/**
 * 处理上传文件到COS
 */
const processUpload = async (file, folder, req) => {
  const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
  
  let fileUrl = ''
  let cosKey = ''
  let storageType = 'local'

  if (isCosAvailable()) {
    try {
      const result = await uploadToCOS(file.path, originalName, folder)
      fileUrl = result.url
      cosKey = result.key
      storageType = 'cos'
      try { fs.unlinkSync(file.path) } catch (e) {}
    } catch (err) {
      console.error('COS上传失败，回退到本地存储:', err.message)
      const relativePath = path.relative('public', file.path).replace(/\\/g, '/')
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`
      fileUrl = `${baseUrl}/${relativePath}`
    }
  } else {
    const targetDir = path.join('public/uploads', folder)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    const targetPath = path.join(targetDir, file.filename)
    fs.renameSync(file.path, targetPath)
    const relativePath = path.relative('public', targetPath).replace(/\\/g, '/')
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`
    fileUrl = `${baseUrl}/${relativePath}`
  }

  return { fileName: originalName, fileUrl, fileSize: file.size, mimeType: file.mimetype, cosKey, storageType }
}

/**
 * 上传用户头像
 * POST /api/upload/avatar
 */
router.post('/avatar', authenticate, avatarUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return badRequest(res, '请选择要上传的图片')
    const userId = req.userId
    const fileInfo = await processUpload(req.file, 'avatars', req)
    await query('UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?', [fileInfo.fileUrl, userId])
    return success(res, { avatar: fileInfo.fileUrl, fileName: fileInfo.fileName, fileSize: fileInfo.fileSize }, '头像上传成功')
  } catch (error) {
    console.error('头像上传错误:', error)
    if (error.message && error.message.includes('只支持')) return badRequest(res, error.message)
    return serverError(res, '头像上传失败')
  }
})

/**
 * 上传附件（通用）
 * POST /api/upload/attachment
 */
router.post('/attachment', authenticate, attachmentUpload.array('files', 9), async (req, res) => {
  try {
    const files = req.files
    if (!files || files.length === 0) return badRequest(res, '请选择要上传的文件')
    const userId = req.userId
    const relatedType = req.body.relatedType || 'general'
    const relatedId = req.body.relatedId || null
    const folderMap = { 'log': 'supervision-logs', 'project': 'projects', 'work': 'works', 'chat': 'ai-chat', 'general': 'attachments' }
    const folder = folderMap[relatedType] || 'attachments'
    const uploadedFiles = []
    for (const file of files) {
      const fileInfo = await processUpload(file, folder, req)
      const result = await query(
        `INSERT INTO attachments (related_type, related_id, file_name, file_type, file_url, file_size, upload_user_id, cos_key, storage_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [relatedType, relatedId, fileInfo.fileName, fileInfo.mimeType, fileInfo.fileUrl, fileInfo.fileSize, userId, fileInfo.cosKey || '', fileInfo.storageType]
      )
      uploadedFiles.push({ id: result.insertId, fileName: fileInfo.fileName, fileUrl: fileInfo.fileUrl, fileSize: fileInfo.fileSize, mimeType: fileInfo.mimeType })
    }
    return success(res, { files: uploadedFiles, count: uploadedFiles.length }, '上传成功')
  } catch (error) {
    console.error('附件上传错误:', error)
    if (error.code === 'LIMIT_FILE_SIZE') return badRequest(res, '文件大小超出限制（最大20MB）')
    if (error.code === 'LIMIT_FILE_COUNT') return badRequest(res, '文件数量超出限制（最多9个）')
    return serverError(res, '附件上传失败')
  }
})

/**
 * 上传监理日志附件
 * POST /api/upload/log-attachment
 */
router.post('/log-attachment', authenticate, attachmentUpload.array('files', 9), async (req, res) => {
  try {
    const files = req.files
    if (!files || files.length === 0) return badRequest(res, '请选择要上传的文件')
    const userId = req.userId
    const logId = req.body.logId
    if (!logId) return badRequest(res, '请指定监理日志ID')
    const logs = await query('SELECT id FROM supervision_logs WHERE id = ? AND user_id = ?', [logId, userId])
    if (logs.length === 0) return badRequest(res, '监理日志不存在或无权操作')
    const uploadedFiles = []
    for (const file of files) {
      const fileInfo = await processUpload(file, 'supervision-logs', req)
      const result = await query(
        `INSERT INTO attachments (related_type, related_id, file_name, file_type, file_url, file_size, upload_user_id, cos_key, storage_type, created_at) VALUES ('log', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [logId, fileInfo.fileName, fileInfo.mimeType, fileInfo.fileUrl, fileInfo.fileSize, userId, fileInfo.cosKey || '', fileInfo.storageType]
      )
      uploadedFiles.push({ id: result.insertId, fileName: fileInfo.fileName, fileUrl: fileInfo.fileUrl, fileSize: fileInfo.fileSize, mimeType: fileInfo.mimeType })
    }
    return success(res, { files: uploadedFiles, count: uploadedFiles.length }, '上传成功')
  } catch (error) {
    console.error('监理日志附件上传错误:', error)
    return serverError(res, '上传失败')
  }
})

/**
 * 上传图片（通用）
 * POST /api/upload/image
 */
router.post('/image', authenticate, avatarUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return badRequest(res, '请选择要上传的图片')
    const folder = req.body.folder || 'images'
    const fileInfo = await processUpload(req.file, folder, req)
    return success(res, { url: fileInfo.fileUrl, fileName: fileInfo.fileName, fileSize: fileInfo.fileSize }, '上传成功')
  } catch (error) {
    console.error('图片上传错误:', error)
    return serverError(res, '上传失败')
  }
})

/**
 * 删除已上传的文件
 * DELETE /api/upload/:attachmentId
 */
router.delete('/:attachmentId', authenticate, async (req, res) => {
  try {
    const { attachmentId } = req.params
    const userId = req.userId
    const attachments = await query('SELECT * FROM attachments WHERE id = ? AND upload_user_id = ?', [attachmentId, userId])
    if (attachments.length === 0) return badRequest(res, '附件不存在或无权删除')
    const attachment = attachments[0]
    if (attachment.storage_type === 'cos' && attachment.cos_key) {
      try { await deleteFromCOS(attachment.cos_key) } catch (err) { console.error('删除COS文件失败:', err.message) }
    }
    await query('DELETE FROM attachments WHERE id = ?', [attachmentId])
    return success(res, {}, '删除成功')
  } catch (error) {
    console.error('删除文件错误:', error)
    return serverError(res, '删除失败')
  }
})

module.exports = router
