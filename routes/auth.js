const express = require('express')
const router = express.Router()
const { success, badRequest, serverError } = require('../utils/response')
const { code2Session } = require('../utils/wechat')
const { generateToken } = require('../utils/jwt')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

/**
 * 微信登录处理函数
 */
async function handleWechatLogin(req, res) {
  try {
    const { code } = req.body

    if (!code) {
      return badRequest(res, '缺少登录code')
    }

    let openid, sessionKey, unionid

    // 🧪 测试模式：支持测试code（开发环境或明确启用测试模式）
    const enableTestMode = process.env.NODE_ENV === 'development' || process.env.ENABLE_TEST_LOGIN === 'true'
    if (enableTestMode && code.startsWith('test_wechat_code_')) {
      console.log('🧪 [测试模式] 使用测试登录code:', code)
      // 从code中提取openid（如果包含），否则使用默认测试openid
      // 支持格式: test_wechat_code_openid=xxx_xxx 或 test_wechat_code_realtime_voice_xxx
      let testOpenid = 'test_openid_888888'
      const openidMatch = code.match(/openid=([^_]+)/)
      if (openidMatch) {
        // 如果code中包含openid=xxx，使用 test_openid_realtime_voice_xxx
        testOpenid = `test_openid_realtime_voice_${openidMatch[1]}`
      } else if (code.includes('realtime_voice_')) {
        // 如果code中包含realtime_voice_，提取完整openid
        const realtimeMatch = code.match(/realtime_voice_(\d+)/)
        if (realtimeMatch) {
          testOpenid = `test_openid_realtime_voice_${realtimeMatch[1]}`
        }
      }
      openid = testOpenid
      sessionKey = 'test_session_key'
      unionid = ''
    } else {
      // 生产环境：调用真实微信API
      const result = await code2Session(code)
      openid = result.openid
      sessionKey = result.sessionKey
      unionid = result.unionid
    }

    // 查询用户是否存在
    let users = await query(
      'SELECT * FROM users WHERE openid = ?',
      [openid]
    )

    let user
    let isNewUser = false

    if (users.length === 0) {
      // 新用户，创建用户记录
      const result = await query(
        'INSERT INTO users (openid, unionid, nickname) VALUES (?, ?, ?)',
        [openid, unionid || '', `用户${Date.now().toString().slice(-6)}`]
      )

      user = {
        id: result.insertId,
        openid,
        unionid: unionid || '',
        nickname: `用户${Date.now().toString().slice(-6)}`,
        avatar: '',
        organization: ''
      }

      isNewUser = true
    } else {
      user = users[0]
    }

    // 生成JWT token
    const token = generateToken({
      userId: user.id,
      openid: user.openid
    })

    // 返回登录信息（字段使用驼峰命名）
    const message = (process.env.NODE_ENV === 'development' && req.body.code.startsWith('test_wechat_code_')) 
      ? '登录成功（测试模式）' 
      : '登录成功'

    return success(res, {
      token,
      isNewUser,
      userInfo: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
        organization: user.organization
      }
    }, message)

  } catch (error) {
    console.error('登录错误:', error)
    return serverError(res, error.message || '登录失败')
  }
}

/**
 * 微信登录
 * POST /api/auth/wechat-login
 * POST /api/auth/login（别名）
 * 
 * 请求参数:
 * - code: 微信登录code
 * 
 * 返回数据:
 * - token: JWT token
 * - isNewUser: 是否新用户
 * - userInfo: 用户信息
 */
router.post('/wechat-login', handleWechatLogin)
router.post('/login', handleWechatLogin)  // 添加别名，兼容常规命名

/**
 * 退出登录
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // 这里可以添加token黑名单逻辑
    // 目前只返回成功，前端清除token即可
    return success(res, {}, '退出成功')
  } catch (error) {
    console.error('退出登录错误:', error)
    return serverError(res, '退出登录失败')
  }
})

/**
 * 测试登录（仅用于开发测试）
 * POST /api/auth/test-login
 * 
 * 请求参数:
 * - openid: 测试用户的openid
 * 
 * 返回数据:
 * - token: JWT token
 * - userInfo: 用户信息
 */
router.post('/test-login', async (req, res) => {
  try {
    const { openid } = req.body

    if (!openid) {
      return badRequest(res, '缺少openid')
    }

    // 查询用户
    const users = await query(
      'SELECT * FROM users WHERE openid = ?',
      [openid]
    )

    if (users.length === 0) {
      return badRequest(res, '用户不存在')
    }

    const user = users[0]

    // 生成JWT token
    const token = generateToken({
      userId: user.id,
      openid: user.openid
    })

    // 返回登录信息（字段使用驼峰命名）
    return success(res, {
      token,
      isNewUser: false,
      userInfo: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
        organization: user.organization
      }
    }, '测试登录成功')

  } catch (error) {
    console.error('测试登录错误:', error)
    return serverError(res, error.message || '测试登录失败')
  }
})

module.exports = router

