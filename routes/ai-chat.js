/**
 * AI聊天功能 v2 - 完整重写版本
 * 
 * 功能：
 * 1. 会话管理（创建、列表、删除、重命名）
 * 2. 聊天记录保存与加载
 * 3. 支持文件上传（图片、文档）
 * 4. 多模态对话（图片识别）
 */

const express = require('express')
const router = express.Router()
const { success, badRequest, serverError, notFound } = require('../utils/response')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { randomString } = require('../utils/crypto')
// AI调用已禁用，改为返回人工客服提示
// const { chatWithContext, chatWithImages, readImageAsBase64, parseDocumentContent } = require('../utils/doubao')
const { 
  aiChatUpload, 
  processUploadedFile, 
  deleteFile, 
  getFilePathFromUrl,
  isImageForAI 
} = require('../utils/file-upload')

// ============================================================================
// 会话管理 API
// ============================================================================

/**
 * 创建新会话
 * POST /api/ai-chat-v2/sessions
 * 
 * 请求体：
 * - title: 会话标题（可选，默认"新对话"）
 */
router.post('/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const { title = '新对话' } = req.body

    // 生成唯一会话ID
    const sessionId = 'chat_' + Date.now() + '_' + randomString(12)

    // 创建会话记录
    const result = await query(
      `INSERT INTO ai_chat_sessions 
        (session_id, user_id, title, message_count, created_at, updated_at) 
       VALUES (?, ?, ?, 0, NOW(), NOW())`,
      [sessionId, userId, title]
    )

    return success(res, {
      id: result.insertId,
      sessionId,
      title,
      messageCount: 0,
      createdAt: new Date().toISOString()
    }, '会话创建成功')

  } catch (error) {
    console.error('创建会话错误:', error)
    return serverError(res, '创建会话失败')
  }
})

/**
 * 获取会话列表
 * GET /api/ai-chat-v2/sessions
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认20）
 * - keyword: 搜索关键词（可选）
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const page = parseInt(req.query.page) || 1
    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100)
    const keyword = req.query.keyword || ''
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE user_id = ? AND is_archived = 0'
    const params = [userId]

    // 关键词搜索
    if (keyword) {
      whereClause += ' AND (title LIKE ? OR last_message LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    // 查询会话列表
    const sessions = await query(
      `SELECT 
        id,
        session_id as sessionId,
        title,
        last_message as lastMessage,
        message_count as messageCount,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt
       FROM ai_chat_sessions
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      params
    )

    // 查询总数
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM ai_chat_sessions ${whereClause}`,
      params
    )

    return success(res, {
      list: sessions,
      total: countResult.total,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.total / pageSize)
    })

  } catch (error) {
    console.error('获取会话列表错误:', error)
    return serverError(res, '获取会话列表失败')
  }
})

/**
 * 获取会话详情
 * GET /api/ai-chat-v2/sessions/:sessionId
 */
router.get('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const { sessionId } = req.params

    const sessions = await query(
      `SELECT 
        id,
        session_id as sessionId,
        title,
        last_message as lastMessage,
        message_count as messageCount,
        is_archived as isArchived,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt
       FROM ai_chat_sessions
       WHERE session_id = ? AND user_id = ?`,
      [sessionId, userId]
    )

    if (sessions.length === 0) {
      return notFound(res, '会话不存在')
    }

    return success(res, sessions[0])

  } catch (error) {
    console.error('获取会话详情错误:', error)
    return serverError(res, '获取会话详情失败')
  }
})

/**
 * 更新会话（重命名）
 * PUT /api/ai-chat-v2/sessions/:sessionId
 * 
 * 请求体：
 * - title: 新标题
 */
router.put('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const { sessionId } = req.params
    const { title } = req.body

    if (!title || title.trim().length === 0) {
      return badRequest(res, '会话标题不能为空')
    }

    const result = await query(
      `UPDATE ai_chat_sessions 
       SET title = ?, updated_at = NOW() 
       WHERE session_id = ? AND user_id = ?`,
      [title.trim(), sessionId, userId]
    )

    if (result.affectedRows === 0) {
      return notFound(res, '会话不存在')
    }

    return success(res, { sessionId, title: title.trim() }, '更新成功')

  } catch (error) {
    console.error('更新会话错误:', error)
    return serverError(res, '更新会话失败')
  }
})

/**
 * 删除会话
 * DELETE /api/ai-chat-v2/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const { sessionId } = req.params

    // 先删除会话的所有消息
    await query(
      'DELETE FROM ai_chat_logs WHERE session_id = ? AND user_id = ?',
      [sessionId, userId]
    )

    // 删除会话相关附件记录
    await query(
      'DELETE FROM ai_chat_attachments WHERE session_id = ? AND user_id = ?',
      [sessionId, userId]
    )

    // 删除会话
    const result = await query(
      'DELETE FROM ai_chat_sessions WHERE session_id = ? AND user_id = ?',
      [sessionId, userId]
    )

    if (result.affectedRows === 0) {
      return notFound(res, '会话不存在')
    }

    return success(res, {}, '删除成功')

  } catch (error) {
    console.error('删除会话错误:', error)
    return serverError(res, '删除会话失败')
  }
})

/**
 * 清空所有会话
 * DELETE /api/ai-chat-v2/sessions
 */
router.delete('/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.userId

    // 删除所有消息
    await query('DELETE FROM ai_chat_logs WHERE user_id = ?', [userId])

    // 删除所有附件记录
    await query('DELETE FROM ai_chat_attachments WHERE user_id = ?', [userId])

    // 删除所有会话
    const result = await query(
      'DELETE FROM ai_chat_sessions WHERE user_id = ?',
      [userId]
    )

    return success(res, { deletedCount: result.affectedRows }, '清空成功')

  } catch (error) {
    console.error('清空会话错误:', error)
    return serverError(res, '清空会话失败')
  }
})

// ============================================================================
// 消息 API
// ============================================================================

/**
 * 发送消息（支持附件）
 * POST /api/ai-chat-v2/messages
 * 
 * 请求体：
 * - sessionId: 会话ID（必填）
 * - content: 消息内容（必填）
 * - attachmentIds: 附件ID数组（可选）
 */
router.post('/messages', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const { sessionId, content, attachmentIds = [] } = req.body

    // 参数验证
    if (!sessionId) {
      return badRequest(res, '会话ID不能为空')
    }
    if (!content && attachmentIds.length === 0) {
      return badRequest(res, '消息内容不能为空')
    }

    // 验证会话存在性，如果不存在则自动创建
    let session = await query(
      'SELECT * FROM ai_chat_sessions WHERE session_id = ? AND user_id = ?',
      [sessionId, userId]
    )

    if (session.length === 0) {
      // 自动创建会话
      const title = content ? content.substring(0, 20) + (content.length > 20 ? '...' : '') : '新对话'
      await query(
        `INSERT INTO ai_chat_sessions 
          (session_id, user_id, title, message_count, created_at, updated_at) 
         VALUES (?, ?, ?, 0, NOW(), NOW())`,
        [sessionId, userId, title]
      )
    }

    // 处理附件
    let attachments = []
    let images = []
    let documentContents = [] // 文档内容列表
    
    if (attachmentIds.length > 0) {
      const placeholders = attachmentIds.map(() => '?').join(',')
      attachments = await query(
        `SELECT * FROM ai_chat_attachments 
         WHERE id IN (${placeholders}) AND user_id = ?`,
        [...attachmentIds, userId]
      )

      // AI调用已禁用，以下图片和文档解析代码暂时注释
      // for (const att of attachments) {
      //   const filePath = getFilePathFromUrl(att.file_url)
      //   
      //   if (isImageForAI(att.mime_type)) {
      //     // 图片：读取为base64用于多模态对话
      //     try {
      //       if (filePath) {
      //         const imageData = await readImageAsBase64(filePath)
      //         images.push(imageData)
      //       }
      //     } catch (e) {
      //       console.error('读取图片失败:', e)
      //     }
      //   } else if (att.file_type === 'document') {
      //     // 文档：解析内容
      //     try {
      //       if (filePath) {
      //         const docContent = await parseDocumentContent(filePath, att.mime_type)
      //         if (docContent) {
      //           documentContents.push({
      //             fileName: att.file_name,
      //             content: docContent
      //           })
      //         }
      //       }
      //     } catch (e) {
      //       console.error('解析文档失败:', e)
      //     }
      //   }
      // }
    }

    // 保存用户消息
    const attachmentsJson = attachments.length > 0 
      ? JSON.stringify(attachments.map(a => ({
          id: a.id,
          fileName: a.file_name,
          fileType: a.file_type,
          mimeType: a.mime_type,
          fileUrl: a.file_url,
          fileSize: a.file_size
        })))
      : null

    const userMsgResult = await query(
      `INSERT INTO ai_chat_logs 
        (user_id, session_id, message_type, content, attachments, api_provider, created_at) 
       VALUES (?, ?, 'user', ?, ?, 'doubao', NOW())`,
      [userId, sessionId, content || '', attachmentsJson]
    )

    // 更新附件的message_id
    if (attachmentIds.length > 0) {
      const placeholders = attachmentIds.map(() => '?').join(',')
      await query(
        `UPDATE ai_chat_attachments SET message_id = ? WHERE id IN (${placeholders})`,
        [userMsgResult.insertId, ...attachmentIds]
      )
    }

    // 获取对话历史（最近10轮对话）
    const historyMessages = await query(
      `SELECT message_type, content 
       FROM ai_chat_logs
       WHERE user_id = ? AND session_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, sessionId]
    )

    // 构建对话上下文
    const conversationHistory = historyMessages
      .reverse()
      .filter(msg => msg.message_type === 'user' || msg.message_type === 'ai')
      .slice(0, -1) // 排除刚刚插入的用户消息
      .map(msg => ({
        role: msg.message_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

    // 构建发送给AI的消息内容
    let messageToAI = content || ''
    
    // 如果有文档内容，将其添加到消息中
    if (documentContents.length > 0) {
      const docTexts = documentContents.map(doc => 
        `【文档：${doc.fileName}】\n${doc.content}`
      ).join('\n\n')
      
      if (messageToAI) {
        messageToAI = `${messageToAI}\n\n---以下是上传的文档内容---\n\n${docTexts}`
      } else {
        messageToAI = `请分析以下文档内容：\n\n${docTexts}`
      }
    }

    // AI调用已禁用，改为返回人工客服提示
    // const aiOptions = { timeout: 180000 } // 3分钟超时
    let aiReply = '人工客服暂未上线'
    // try {
    //   if (images.length > 0) {
    //     // 有图片，使用多模态对话
    //     aiReply = await chatWithImages(conversationHistory, messageToAI || '请描述这张图片', images, aiOptions)
    //   } else {
    //     // 纯文本对话（可能包含文档内容）
    //     aiReply = await chatWithContext(conversationHistory, messageToAI, aiOptions)
    //   }
    // } catch (aiError) {
    //   console.error('AI调用错误:', aiError.message)
    //   aiReply = '抱歉，AI响应超时，请稍后重试或发送更简短的内容。'
    // }

    // 保存AI回复
    const aiMsgResult = await query(
      `INSERT INTO ai_chat_logs 
        (user_id, session_id, message_type, content, api_provider, created_at) 
       VALUES (?, ?, 'ai', ?, 'doubao', NOW())`,
      [userId, sessionId, aiReply]
    )

    // 更新会话信息
    const previewMessage = aiReply.substring(0, 100)
    await query(
      `UPDATE ai_chat_sessions 
       SET last_message = ?, 
           message_count = message_count + 2,
           updated_at = NOW()
       WHERE session_id = ? AND user_id = ?`,
      [previewMessage, sessionId, userId]
    )

    // 如果是首条消息，用用户消息更新会话标题
    if (!session.length || session[0].message_count === 0) {
      const newTitle = content ? content.substring(0, 30) + (content.length > 30 ? '...' : '') : '新对话'
      await query(
        `UPDATE ai_chat_sessions SET title = ? WHERE session_id = ? AND user_id = ? AND title = '新对话'`,
        [newTitle, sessionId, userId]
      )
    }

    return success(res, {
      userMessage: {
        id: userMsgResult.insertId,
        type: 'user',
        content: content || '',
        attachments: attachments.map(a => ({
          id: a.id,
          fileName: a.file_name,
          fileType: a.file_type,
          mimeType: a.mime_type,
          fileUrl: a.file_url,
          fileSize: a.file_size
        })),
        timestamp: new Date().toISOString()
      },
      aiMessage: {
        id: aiMsgResult.insertId,
        type: 'ai',
        content: aiReply,
        attachments: [],
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('发送消息错误:', error)
    return serverError(res, '发送消息失败')
  }
})

/**
 * 获取消息历史
 * GET /api/ai-chat-v2/messages
 * 
 * 查询参数：
 * - sessionId: 会话ID（必填）
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认50）
 */
router.get('/messages', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const sessionId = req.query.sessionId
    const page = parseInt(req.query.page) || 1
    const pageSize = Math.min(parseInt(req.query.pageSize) || 50, 100)
    const offset = (page - 1) * pageSize

    if (!sessionId) {
      return badRequest(res, '会话ID不能为空')
    }

    // 查询消息列表
    const messages = await query(
      `SELECT 
        id,
        message_type as type,
        content,
        attachments,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as timestamp
       FROM ai_chat_logs
       WHERE user_id = ? AND session_id = ?
       ORDER BY created_at ASC
       LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      [userId, sessionId]
    )

    // 处理附件信息：从消息的attachments字段和ai_chat_attachments表中获取
    const formattedMessages = await Promise.all(messages.map(async (msg) => {
      let attachments = []
      
      // 首先尝试解析消息中存储的attachments JSON
      if (msg.attachments) {
        try {
          attachments = JSON.parse(msg.attachments)
        } catch (e) {
          console.error('解析附件JSON失败:', msg.id, e.message)
        }
      }
      
      // 如果消息中没有attachments，从ai_chat_attachments表查询该消息的附件
      if (attachments.length === 0 && msg.id) {
        try {
          const dbAttachments = await query(
            `SELECT 
              id,
              file_name as fileName,
              file_type as fileType,
              mime_type as mimeType,
              file_url as fileUrl,
              file_size as fileSize
             FROM ai_chat_attachments
             WHERE message_id = ? AND user_id = ?
             ORDER BY created_at ASC`,
            [msg.id, userId]
          )
          attachments = dbAttachments
        } catch (e) {
          console.error('查询消息附件失败:', msg.id, e.message)
        }
      }
      
      return {
        ...msg,
        attachments
      }
    }))

    // 查询总数
    const countResults = await query(
      'SELECT COUNT(*) as total FROM ai_chat_logs WHERE user_id = ? AND session_id = ?',
      [userId, sessionId]
    )
    const total = countResults[0]?.total || 0

    return success(res, {
      sessionId,
      list: formattedMessages,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })

  } catch (error) {
    console.error('获取消息历史错误:', error)
    return serverError(res, '获取消息历史失败')
  }
})

/**
 * 删除单条消息
 * DELETE /api/ai-chat-v2/messages/:messageId
 */
router.delete('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const { messageId } = req.params

    const result = await query(
      'DELETE FROM ai_chat_logs WHERE id = ? AND user_id = ?',
      [messageId, userId]
    )

    if (result.affectedRows === 0) {
      return notFound(res, '消息不存在')
    }

    return success(res, {}, '删除成功')

  } catch (error) {
    console.error('删除消息错误:', error)
    return serverError(res, '删除消息失败')
  }
})

// ============================================================================
// 文件上传 API
// ============================================================================

/**
 * 上传文件（支持多文件）
 * POST /api/ai-chat-v2/upload
 * 
 * FormData:
 * - files: 文件数组（最多9个）
 * - sessionId: 会话ID（可选）
 */
router.post('/upload', authenticate, aiChatUpload.array('files', 9), async (req, res) => {
  try {
    const userId = req.userId
    const sessionId = req.body.sessionId || ''
    const files = req.files

    if (!files || files.length === 0) {
      return badRequest(res, '请选择要上传的文件')
    }

    const uploadedFiles = []

    for (const file of files) {
      const fileInfo = processUploadedFile(file, req)
      
      // 保存附件记录
      const result = await query(
        `INSERT INTO ai_chat_attachments 
          (session_id, user_id, file_name, file_type, mime_type, file_url, file_size, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [sessionId, userId, fileInfo.fileName, fileInfo.fileType, fileInfo.mimeType, fileInfo.fileUrl, fileInfo.fileSize]
      )

      uploadedFiles.push({
        id: result.insertId,
        fileName: fileInfo.fileName,
        fileType: fileInfo.fileType,
        mimeType: fileInfo.mimeType,
        fileUrl: fileInfo.fileUrl,
        fileSize: fileInfo.fileSize
      })
    }

    return success(res, {
      files: uploadedFiles,
      count: uploadedFiles.length
    }, '上传成功')

  } catch (error) {
    console.error('文件上传错误:', error)
    
    // 处理Multer错误
    if (error.code === 'LIMIT_FILE_SIZE') {
      return badRequest(res, '文件大小超出限制')
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return badRequest(res, '文件数量超出限制（最多9个）')
    }
    if (error.message && error.message.includes('不支持的文件类型')) {
      return badRequest(res, error.message)
    }
    
    return serverError(res, '文件上传失败')
  }
})

/**
 * 获取会话的附件列表
 * GET /api/ai-chat-v2/attachments
 * 
 * 查询参数：
 * - sessionId: 会话ID（必填）
 * - messageId: 消息ID（可选，用于获取特定消息的附件）
 */
router.get('/attachments', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const sessionId = req.query.sessionId
    const messageId = req.query.messageId

    if (!sessionId) {
      return badRequest(res, '会话ID不能为空')
    }

    let whereClause = 'WHERE session_id = ? AND user_id = ?'
    const params = [sessionId, userId]

    // 如果指定了messageId，只获取该消息的附件
    if (messageId) {
      whereClause += ' AND message_id = ?'
      params.push(messageId)
    }

    const attachments = await query(
      `SELECT 
        id,
        message_id as messageId,
        file_name as fileName,
        file_type as fileType,
        mime_type as mimeType,
        file_url as fileUrl,
        file_size as fileSize,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as createdAt
       FROM ai_chat_attachments
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    )

    return success(res, { list: attachments })

  } catch (error) {
    console.error('获取附件列表错误:', error)
    return serverError(res, '获取附件列表失败')
  }
})

/**
 * 删除附件
 * DELETE /api/ai-chat-v2/attachments/:attachmentId
 */
router.delete('/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const { attachmentId } = req.params

    // 查询附件信息
    const attachments = await query(
      'SELECT * FROM ai_chat_attachments WHERE id = ? AND user_id = ?',
      [attachmentId, userId]
    )

    if (attachments.length === 0) {
      return notFound(res, '附件不存在')
    }

    const attachment = attachments[0]

    // 删除物理文件
    const filePath = getFilePathFromUrl(attachment.file_url)
    if (filePath) {
      await deleteFile(filePath)
    }

    // 删除数据库记录
    await query(
      'DELETE FROM ai_chat_attachments WHERE id = ?',
      [attachmentId]
    )

    return success(res, {}, '删除成功')

  } catch (error) {
    console.error('删除附件错误:', error)
    return serverError(res, '删除附件失败')
  }
})

// ============================================================================
// 导出
// ============================================================================

module.exports = router
