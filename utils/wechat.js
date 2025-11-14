const axios = require('axios')
const config = require('../config')

const WECHAT_ERROR_MAP = {
  '-1': '微信系统繁忙，请稍后重试',
  '40013': '微信AppID无效，请检查配置',
  '40029': '登录code无效，请重新获取',
  '40125': '微信AppSecret无效，请检查配置',
  '40163': '登录code已被使用，请重新获取新的code',
  '40226': '用户被限制登录，请联系微信客服处理'
}

function getWechatErrorMessage(errcode, errmsg) {
  if (!errcode) {
    return errmsg || '微信登录失败'
  }

  const friendly = WECHAT_ERROR_MAP[String(errcode)]
  if (friendly) {
    return friendly
  }

  return `微信接口返回错误（${errcode}）：${errmsg || '未知错误'}`
}

function ensureWechatConfig() {
  if (!config.wechat.appId || !config.wechat.appSecret) {
    console.error('微信登录配置缺失，请检查 WECHAT_APPID 与 WECHAT_APPSECRET 环境变量')
    throw new Error('微信登录配置缺失，请联系管理员配置微信凭据')
  }
}

/**
 * 微信小程序登录 - 通过code获取openid和session_key
 * @param {String} code - 小程序登录code
 * @returns {Object} 包含openid, session_key等信息
 */
async function code2Session(code) {
  ensureWechatConfig()

  try {
    const response = await axios.get(config.wechat.loginUrl, {
      params: {
        appid: config.wechat.appId,
        secret: config.wechat.appSecret,
        js_code: code,
        grant_type: 'authorization_code'
      },
      timeout: 8000
    })

    const data = response.data

    if (!data || !data.openid) {
      const message = getWechatErrorMessage(data && data.errcode, data && data.errmsg)
      console.error('微信登录失败，响应数据异常:', data)
      throw new Error(message)
    }

    return {
      openid: data.openid,
      sessionKey: data.session_key,
      unionid: data.unionid || ''
    }
  } catch (error) {
    const errcode = error.response && error.response.data && error.response.data.errcode
    const errmsg = error.response && error.response.data && error.response.data.errmsg
    const message = getWechatErrorMessage(errcode, errmsg || error.message)

    console.error('微信登录错误:', {
      message: error.message,
      errcode,
      errmsg,
      response: error.response && error.response.data
    })

    throw new Error(message)
  }
}

/**
 * 获取微信Access Token
 * @returns {String} access_token
 */
async function getAccessToken() {
  ensureWechatConfig()

  try {
    const response = await axios.get(config.wechat.tokenUrl, {
      params: {
        appid: config.wechat.appId,
        secret: config.wechat.appSecret,
        grant_type: 'client_credential'
      },
      timeout: 8000
    })

    const data = response.data

    if (data.errcode) {
      const message = getWechatErrorMessage(data.errcode, data.errmsg)
      throw new Error(message)
    }

    return data.access_token
  } catch (error) {
    const errcode = error.response && error.response.data && error.response.data.errcode
    const errmsg = error.response && error.response.data && error.response.data.errmsg
    const message = getWechatErrorMessage(errcode, errmsg || error.message)

    console.error('获取AccessToken错误:', {
      message: error.message,
      errcode,
      errmsg
    })

    throw new Error(message)
  }
}

module.exports = {
  code2Session,
  getAccessToken
}

