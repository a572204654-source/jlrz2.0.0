const express = require('express')
const router = express.Router()
const { success, badRequest, serverError } = require('../utils/response')
const { authenticate } = require('../middleware/auth')

/**
 * 获取AI提供商密钥
 * GET /api/ai/provider-key
 * 
 * 请求参数:
 * - provider: 提供商标识（必填）
 */
router.get('/provider-key', authenticate, async (req, res) => {
  try {
    const { provider } = req.query

    // 参数验证
    if (!provider) {
      return badRequest(res, '提供商标识不能为空')
    }

    // 验证提供商是否支持
    const supportedProviders = ['doubao']
    if (!supportedProviders.includes(provider)) {
      return badRequest(res, '不支持的提供商')
    }

    // 从环境变量获取API密钥
    let apiKey = null
    let expiresAt = null

    if (provider === 'doubao') {
      // 豆包API密钥
      apiKey = process.env.DOUBAO_API_KEY || null
      // 设置过期时间为当天23:59:59
      const expires = new Date()
      expires.setHours(23, 59, 59, 999)
      expiresAt = expires.toISOString()
    }

    // 如果没有配置密钥
    if (!apiKey) {
      return serverError(res, '服务配置错误，请联系管理员')
    }

    return success(res, {
      apiKey,
      provider,
      expiresAt
    })

  } catch (error) {
    console.error('获取AI提供商密钥错误:', error)
    return serverError(res, '获取密钥失败')
  }
})

module.exports = router
