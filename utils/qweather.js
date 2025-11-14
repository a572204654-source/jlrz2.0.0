/**
 * 和风天气 API 工具
 * 
 * 使用 JWT 认证方式调用和风天气 API
 * 文档: https://dev.qweather.com/docs/api/
 */

const axios = require('axios')
const { getQWeatherToken } = require('./qweather-jwt')
const config = require('../config')

// API 基础地址
// JWT认证必须使用专属域名（API Host）
const API_BASE_URL = config.qweather.apiHost

/**
 * 创建带认证的 axios 实例
 */
function createAuthenticatedClient() {
  const token = getQWeatherToken()
  
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8'
    },
    // 确保响应数据使用UTF-8编码
    responseType: 'json',
    responseEncoding: 'utf8'
  })
}

/**
 * 获取实时天气
 * 
 * @param {string} location - 位置参数（经纬度 "116.41,39.92" 或 城市ID）
 * @returns {Object} 天气数据
 */
async function getWeatherNow(location) {
  try {
    const client = createAuthenticatedClient()
    const response = await client.get('/v7/weather/now', {
      params: { location }
    })
    
    if (response.data.code === '200') {
      return {
        success: true,
        data: response.data.now,
        updateTime: response.data.updateTime,
        fxLink: response.data.fxLink
      }
    } else {
      return {
        success: false,
        error: `和风天气API错误: ${response.data.code}`
      }
    }
  } catch (error) {
    console.error('获取实时天气失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取逐天天气预报
 * 
 * @param {string} location - 位置参数
 * @param {number} days - 预报天数 (3/7/10/15/30)
 * @returns {Object} 天气预报数据
 */
async function getWeatherDaily(location, days = 7) {
  try {
    const client = createAuthenticatedClient()
    const response = await client.get(`/v7/weather/${days}d`, {
      params: { location }
    })
    
    if (response.data.code === '200') {
      return {
        success: true,
        data: response.data.daily,
        updateTime: response.data.updateTime,
        fxLink: response.data.fxLink
      }
    } else {
      return {
        success: false,
        error: `和风天气API错误: ${response.data.code}`
      }
    }
  } catch (error) {
    console.error('获取天气预报失败:', error)
    // 提取更详细的错误信息
    let errorMessage = error.message
    if (error.response) {
      // HTTP 错误响应
      errorMessage = `HTTP ${error.response.status}: ${error.message}`
      if (error.response.data && error.response.data.code) {
        errorMessage += ` (API错误码: ${error.response.data.code})`
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      errorMessage = `请求超时或网络错误: ${error.message}`
    }
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * 获取逐小时天气预报
 * 
 * @param {string} location - 位置参数
 * @param {number} hours - 预报小时数 (24/72/168)
 * @returns {Object} 逐小时天气数据
 */
async function getWeatherHourly(location, hours = 24) {
  try {
    const client = createAuthenticatedClient()
    const response = await client.get(`/v7/weather/${hours}h`, {
      params: { location }
    })
    
    if (response.data.code === '200') {
      return {
        success: true,
        data: response.data.hourly,
        updateTime: response.data.updateTime,
        fxLink: response.data.fxLink
      }
    } else {
      return {
        success: false,
        error: `和风天气API错误: ${response.data.code}`
      }
    }
  } catch (error) {
    console.error('获取逐小时天气失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取天气生活指数
 * 
 * @param {string} location - 位置参数
 * @param {string} type - 指数类型 (1-16，0表示全部)
 * @returns {Object} 生活指数数据
 */
async function getWeatherIndices(location, type = '0') {
  try {
    const client = createAuthenticatedClient()
    const response = await client.get('/v7/indices/1d', {
      params: { 
        location,
        type
      }
    })
    
    if (response.data.code === '200') {
      return {
        success: true,
        data: response.data.daily,
        updateTime: response.data.updateTime
      }
    } else {
      return {
        success: false,
        error: `和风天气API错误: ${response.data.code}`
      }
    }
  } catch (error) {
    console.error('获取生活指数失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取空气质量
 * 
 * @param {string} location - 位置参数
 * @returns {Object} 空气质量数据
 */
async function getAirQuality(location) {
  try {
    const client = createAuthenticatedClient()
    const response = await client.get('/v7/air/now', {
      params: { location }
    })
    
    if (response.data.code === '200') {
      return {
        success: true,
        data: response.data.now,
        updateTime: response.data.updateTime
      }
    } else {
      return {
        success: false,
        error: `和风天气API错误: ${response.data.code}`
      }
    }
  } catch (error) {
    console.error('获取空气质量失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 城市搜索/地理位置查询
 * 
 * @param {string} location - 城市名称或关键词
 * @returns {Object} 城市信息
 */
async function searchCity(location) {
  try {
    const client = createAuthenticatedClient()
    const response = await client.get('/v2/city/lookup', {
      params: { location }
    })
    
    if (response.data.code === '200') {
      return {
        success: true,
        data: response.data.location
      }
    } else {
      return {
        success: false,
        error: `和风天气API错误: ${response.data.code}`
      }
    }
  } catch (error) {
    console.error('城市搜索失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取天气预警
 * 
 * @param {string} location - 位置参数（城市ID）
 * @returns {Object} 预警数据
 */
async function getWeatherWarning(location) {
  try {
    const client = createAuthenticatedClient()
    const response = await client.get('/v7/warning/now', {
      params: { location }
    })
    
    if (response.data.code === '200') {
      return {
        success: true,
        data: response.data.warning || [],
        updateTime: response.data.updateTime
      }
    } else {
      return {
        success: false,
        error: `和风天气API错误: ${response.data.code}`
      }
    }
  } catch (error) {
    console.error('获取天气预警失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取天气时光机（历史天气）
 * 
 * @param {string} location - 位置参数（仅支持LocationID，如 "101010100"）
 * @param {string} date - 日期，格式 yyyyMMdd（如 "20200725"），最多可选择最近10天（不包含今天）
 * @returns {Object} 历史天气数据
 */
async function getWeatherHistorical(location, date) {
  try {
    const client = createAuthenticatedClient()
    const response = await client.get('/v7/historical/weather', {
      params: { 
        location,
        date
      }
    })
    
    if (response.data.code === '200') {
      return {
        success: true,
        data: {
          daily: response.data.weatherDaily,
          hourly: response.data.weatherHourly || []
        },
        updateTime: response.data.updateTime,
        fxLink: response.data.fxLink
      }
    } else {
      return {
        success: false,
        error: `和风天气API错误: ${response.data.code}`
      }
    }
  } catch (error) {
    console.error('获取历史天气失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取指定日期的天气预报
 * 
 * @param {string} location - 位置参数
 * @param {string} targetDate - 目标日期，格式 yyyy-MM-dd（如 "2024-10-25"）
 * @param {number} days - 预报天数，默认10天（最大30天）
 * @returns {Object} 指定日期的天气数据
 */
async function getWeatherByDate(location, targetDate, days = 10) {
  try {
    // 获取多天预报
    const result = await getWeatherDaily(location, days)
    
    if (!result.success) {
      return result
    }
    
    // 查找目标日期
    const targetDateStr = targetDate.replace(/-/g, '') // 转换为 yyyyMMdd
    const targetDay = result.data.find(day => {
      // daily数据中的fxDate格式为 yyyy-MM-dd
      const dayDateStr = day.fxDate.replace(/-/g, '')
      return dayDateStr === targetDateStr
    })
    
    if (!targetDay) {
      return {
        success: false,
        error: `未找到日期 ${targetDate} 的天气预报数据`
      }
    }
    
    return {
      success: true,
      data: targetDay,
      updateTime: result.updateTime,
      fxLink: result.fxLink
    }
  } catch (error) {
    console.error('获取指定日期天气失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取综合天气信息（实时+预报+空气质量）
 * 
 * @param {string} location - 位置参数
 * @returns {Object} 综合天气数据
 */
async function getWeatherComprehensive(location) {
  try {
    // 并发请求多个接口
    const [now, daily, hourly, air, warning] = await Promise.all([
      getWeatherNow(location),
      getWeatherDaily(location, 7),
      getWeatherHourly(location, 24),
      getAirQuality(location),
      getWeatherWarning(location)
    ])
    
    return {
      success: true,
      data: {
        now: now.success ? now.data : null,
        daily: daily.success ? daily.data : null,
        hourly: hourly.success ? hourly.data : null,
        air: air.success ? air.data : null,
        warning: warning.success ? warning.data : null
      }
    }
  } catch (error) {
    console.error('获取综合天气信息失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

module.exports = {
  getWeatherNow,
  getWeatherDaily,
  getWeatherHourly,
  getWeatherIndices,
  getAirQuality,
  searchCity,
  getWeatherWarning,
  getWeatherComprehensive,
  getWeatherHistorical,
  getWeatherByDate
}

