const express = require('express')
const router = express.Router()
const { success, badRequest, serverError } = require('../../utils/response')
const { query } = require('../../config/database')
const { authenticate } = require('../../middleware/auth')
const { randomString } = require('../../utils/crypto')
const { chatWithContext } = require('../../utils/doubao')

/**
 * 创建新会话
 * POST /api/v1/ai-chat/session
 */
router.post('/ai-chat/session', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    
    // 生成会话ID
    const sessionId = 'session_' + Date.now() + '_' + randomString(8)

    // 可以选择性地在数据库中记录会话创建
    // 目前仅返回会话ID
    
    return success(res, {
      sessionId
    })

  } catch (error) {
    console.error('创建会话错误:', error)
    return serverError(res, '创建会话失败')
  }
})

/**
 * 发送消息
 * POST /api/v1/ai-chat/send
 */
router.post('/ai-chat/send', authenticate, async (req, res) => {
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
    const conversationHistory = historyMessages
      .reverse()
      .filter(msg => msg.message_type === 'user' || msg.message_type === 'ai')
      .map(msg => ({
        role: msg.message_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

    // 调用豆包AI API获取回复
    let aiReply
    try {
      aiReply = await chatWithContext(conversationHistory, content)
    } catch (error) {
      console.error('豆包API调用失败:', error.message)
      // 如果API调用失败，返回友好的错误提示
      aiReply = `抱歉，AI服务暂时无法响应。错误信息：${error.message}`
    }

    // 保存AI回复
    const aiMessageResult = await query(
      `INSERT INTO ai_chat_logs 
        (user_id, session_id, message_type, content, api_provider) 
       VALUES (?, ?, 'ai', ?, 'doubao')`,
      [userId, sessionId, aiReply]
    )

    return success(res, {
      sessionId,
      messageId: aiMessageResult.insertId,
      aiReply
    })

  } catch (error) {
    console.error('发送消息错误:', error)
    return serverError(res, '发送消息失败')
  }
})

/**
 * 获取对话历史
 * GET /api/v1/ai-chat/history
 */
router.get('/ai-chat/history', authenticate, async (req, res) => {
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
        message_type as messageType,
        content,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as createdAt
       FROM ai_chat_logs
       WHERE user_id = ? AND session_id = ?
       ORDER BY created_at ASC
       LIMIT ? OFFSET ?`,
      [userId, sessionId, pageSize, offset]
    )

    // 查询总数
    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM ai_chat_logs WHERE user_id = ? AND session_id = ?',
      [userId, sessionId]
    )

    return success(res, {
      sessionId,
      total: countResult.total,
      list: messages
    })

  } catch (error) {
    console.error('获取对话历史错误:', error)
    return serverError(res, '获取对话历史失败')
  }
})

/**
 * 删除会话
 * DELETE /api/v1/ai-chat/session/:sessionId
 */
router.delete('/ai-chat/session/:sessionId', authenticate, async (req, res) => {
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
 * GET /api/v1/ai-chat/sessions
 */
router.get('/ai-chat/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const offset = (page - 1) * pageSize

    // 查询会话列表（按最后消息时间分组）
    const sessions = await query(
      `SELECT 
        session_id as sessionId,
        COUNT(*) as messageCount,
        MAX(created_at) as lastMessageTime,
        (SELECT content FROM ai_chat_logs 
         WHERE user_id = ? AND session_id = acl.session_id AND message_type = 'user'
         ORDER BY created_at DESC LIMIT 1) as lastUserMessage
       FROM ai_chat_logs acl
       WHERE user_id = ?
       GROUP BY session_id
       ORDER BY MAX(created_at) DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, pageSize, offset]
    )

    // 查询总数
    const [countResult] = await query(
      `SELECT COUNT(DISTINCT session_id) as total 
       FROM ai_chat_logs 
       WHERE user_id = ?`,
      [userId]
    )

    return success(res, {
      total: countResult.total,
      page,
      pageSize,
      list: sessions
    })

  } catch (error) {
    console.error('获取会话列表错误:', error)
    return serverError(res, '获取会话列表失败')
  }
})

module.exports = router

