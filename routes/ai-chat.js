const express = require('express')
const router = express.Router()
const { success, badRequest, serverError } = require('../utils/response')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')
const { randomString } = require('../utils/crypto')
const { chatWithContext } = require('../utils/doubao')

/**
 * 创建新会话
 * POST /api/ai-chat/session
 */
router.post('/session', authenticate, async (req, res) => {
  try {
    // 生成会话ID
    const sessionId = 'sess_' + Date.now() + '_' + randomString(8)
    const createTime = new Date().toISOString()

    // 可以选择性地在数据库中记录会话创建
    // 目前仅返回会话ID和创建时间
    
    return success(res, { 
      sessionId,
      createTime
    })

  } catch (error) {
    console.error('创建会话错误:', error)
    return serverError(res, '创建会话失败')
  }
})

/**
 * 发送消息
 * POST /api/ai-chat/send
 * 
 * 请求参数:
 * - sessionId: 会话ID（必填）
 * - content: 消息内容（必填）
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const { sessionId, content } = req.body

    // 参数验证
    if (!sessionId) {
      return badRequest(res, '会话ID不能为空')
    }
    if (!content) {
      return badRequest(res, '消息内容不能为空')
    }

    // 保存用户消息
    const userMessageResult = await query(
      `INSERT INTO ai_chat_logs 
        (user_id, session_id, message_type, content, api_provider) 
       VALUES (?, ?, 'user', ?, 'doubao')`,
      [userId, sessionId, content]
    )

    // 获取对话历史（最近10条消息作为上下文）
    const historyMessages = await query(
      `SELECT message_type, content 
       FROM ai_chat_logs
       WHERE user_id = ? AND session_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId, sessionId]
    )

    // 构建对话上下文（时间倒序，需要翻转）
    // const conversationHistory = historyMessages
    //   .reverse()
    //   .filter(msg => msg.message_type === 'user' || msg.message_type === 'ai')
    //   .map(msg => ({
    //     role: msg.message_type === 'user' ? 'user' : 'assistant',
    //     content: msg.content
    //   }))

    // 调用豆包AI API获取回复（如果失败会自动返回模拟数据）
    // const aiReply = await chatWithContext(conversationHistory, content)

    // 暂时停用AI功能，返回固定消息
    const aiReply = '人工客服暂未上线'

    // 保存AI回复
    const aiMessageResult = await query(
      `INSERT INTO ai_chat_logs 
        (user_id, session_id, message_type, content, api_provider) 
       VALUES (?, ?, 'ai', ?, 'doubao')`,
      [userId, sessionId, aiReply]
    )

    return success(res, {
      aiReply,
      messageId: aiMessageResult.insertId.toString(),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('发送消息错误:', error)
    return serverError(res, '发送消息失败')
  }
})

/**
 * 获取对话历史
 * GET /api/ai-chat/history
 * 
 * 请求参数:
 * - sessionId: 会话ID（必填）
 * - page: 页码，默认1
 * - pageSize: 每页数量，默认50
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const sessionId = req.query.sessionId
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 50
    const offset = (page - 1) * pageSize

    // 参数验证
    if (!sessionId) {
      return badRequest(res, '会话ID不能为空')
    }

    // 查询对话历史
    const messages = await query(
      `SELECT 
        id,
        message_type,
        content,
        created_at
       FROM ai_chat_logs
       WHERE user_id = ? AND session_id = ?
       ORDER BY created_at ASC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [userId, sessionId]
    )

    // 转换为文档要求的格式
    const formattedMessages = messages.map(msg => ({
      type: msg.message_type,
      content: msg.content,
      timestamp: msg.created_at
    }))

    // 查询总数
    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM ai_chat_logs WHERE user_id = ? AND session_id = ?',
      [userId, sessionId]
    )

    return success(res, {
      messages: formattedMessages,
      total: countResult.total,
      page,
      pageSize
    })

  } catch (error) {
    console.error('获取对话历史错误:', error)
    return serverError(res, '获取对话历史失败')
  }
})

/**
 * 删除会话
 * DELETE /api/ai-chat/session/:sessionId
 */
router.delete('/session/:sessionId', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const { sessionId } = req.params

    // 删除会话的所有消息
    await query(
      'DELETE FROM ai_chat_logs WHERE user_id = ? AND session_id = ?',
      [userId, sessionId]
    )

    return success(res, {}, '删除成功')

  } catch (error) {
    console.error('删除会话错误:', error)
    return serverError(res, '删除会话失败')
  }
})

/**
 * 获取用户的会话列表
 * GET /api/ai-chat/sessions
 * 
 * 请求参数:
 * - page: 页码，默认1
 * - pageSize: 每页数量，默认20
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const offset = (page - 1) * pageSize

    // 查询会话列表（按最后消息时间分组）
    const sessions = await query(
      `SELECT 
        session_id,
        MIN(created_at) as create_time,
        MAX(created_at) as update_time,
        (SELECT content FROM ai_chat_logs 
         WHERE user_id = ? AND session_id = acl.session_id
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT content FROM ai_chat_logs 
         WHERE user_id = ? AND session_id = acl.session_id AND message_type = 'user'
         ORDER BY created_at ASC LIMIT 1) as first_user_message
       FROM ai_chat_logs acl
       WHERE user_id = ?
       GROUP BY session_id
       ORDER BY MAX(created_at) DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [userId, userId, userId]
    )

    // 转换为文档要求的格式
    const formattedSessions = sessions.map(s => ({
      sessionId: s.session_id,
      title: s.first_user_message ? s.first_user_message.substring(0, 20) + (s.first_user_message.length > 20 ? '...' : '') : '新会话',
      lastMessage: s.last_message,
      updateTime: s.update_time,
      createTime: s.create_time
    }))

    // 查询总数
    const [countResult] = await query(
      `SELECT COUNT(DISTINCT session_id) as total 
       FROM ai_chat_logs 
       WHERE user_id = ?`,
      [userId]
    )

    return success(res, {
      sessions: formattedSessions,
      total: countResult.total,
      page,
      pageSize
    })

  } catch (error) {
    console.error('获取会话列表错误:', error)
    return serverError(res, '获取会话列表失败')
  }
})

module.exports = router

