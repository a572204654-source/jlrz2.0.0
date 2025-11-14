const express = require('express')
const router = express.Router()
const { authenticate } = require('../../middleware/auth')
const { success, badRequest, serverError } = require('../../utils/response')
const { getWeatherHistorical, getWeatherByDate, searchCity } = require('../../utils/qweather')

/**
 * 获取指定日期的气象信息
 * GET /api/v1/weather/current
 * 
 * 请求参数:
 * - latitude: 纬度（必填）
 * - longitude: 经度（必填）
 * - date: 日期，格式 YYYY-MM-DD（可选，默认当天）
 * 
 * 返回数据:
 * - weather: 气象信息字符串（格式：天气 雨 · 气温: 25-31 · 风向: 东 · 风力: 4）
 * - weatherText: 天气描述
 * - temperature: 当前温度
 * - temperatureMin: 最低温度
 * - temperatureMax: 最高温度
 * - humidity: 湿度
 * - windDirection: 风向
 * - windScale: 风力等级
 * - updateTime: 更新时间
 * 
 * 说明:
 * - 支持当前日期前后10天的查询
 * - 前10天（历史）使用时光机API
 * - 后10天（未来）使用每日预报API
 * - 每次请求都重新获取，不使用缓存
 */
router.get('/current', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, date } = req.query

    // 参数验证
    if (!latitude || !longitude) {
      return badRequest(res, '经纬度参数不能为空')
    }

    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)

    if (isNaN(lat) || isNaN(lng)) {
      return badRequest(res, '经纬度参数格式不正确')
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return badRequest(res, '经纬度参数超出有效范围')
    }

    // 日期处理
    let targetDate = date
    if (!targetDate) {
      // 如果没有提供日期，使用今天
      const today = new Date()
      targetDate = today.toISOString().split('T')[0] // YYYY-MM-DD
    }

    // 验证日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(targetDate)) {
      return badRequest(res, '日期格式不正确，应为 YYYY-MM-DD')
    }

    // 计算日期差（相对于今天）
    // 使用本地时区计算，避免时区问题
    const today = new Date()
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth()
    const todayDay = today.getDate()
    const todayLocal = new Date(todayYear, todayMonth, todayDay, 0, 0, 0, 0)
    
    // 解析目标日期
    const [year, month, day] = targetDate.split('-').map(Number)
    const targetLocal = new Date(year, month - 1, day, 0, 0, 0, 0)
    
    const diffDays = Math.floor((targetLocal - todayLocal) / (1000 * 60 * 60 * 24))

    const todayStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`
    console.log(`日期计算: 今天=${todayStr}, 目标=${targetDate}, 相差=${diffDays}天`)

    // 检查日期范围（前后10天）
    if (diffDays < -10 || diffDays > 10) {
      return badRequest(res, `日期超出范围，仅支持当前日期前后10天（当前日期: ${todayStr}, 目标日期: ${targetDate}, 相差: ${diffDays}天）`)
    }

    // 和风天气API需要的location格式：经度,纬度
    const location = `${lng},${lat}`
    let weatherData = null

    try {
      if (diffDays < 0) {
        // 历史日期（前10天），使用时光机API
        // 时光机API只支持LocationID，需要先通过经纬度获取LocationID
        console.log(`获取历史天气: ${targetDate} (${diffDays}天前)`)

        // 先通过经纬度获取LocationID
        const cityResult = await searchCity(location)
        if (!cityResult.success || !cityResult.data || cityResult.data.length === 0) {
          return serverError(res, '无法获取位置信息，请检查经纬度是否正确')
        }

        const locationId = cityResult.data[0].id
        console.log(`获取到LocationID: ${locationId}`)

        // 调用时光机API（日期格式：yyyyMMdd）
        const dateStr = targetDate.replace(/-/g, '')
        const historicalResult = await getWeatherHistorical(locationId, dateStr)

        if (!historicalResult.success) {
          return serverError(res, historicalResult.error || '获取历史天气失败')
        }

        const daily = historicalResult.data.daily
        const hourly = historicalResult.data.hourly || []

        // 使用当天的第一个小时数据作为当前温度和天气描述
        const firstHour = hourly.length > 0 ? hourly[0] : null
        const currentTemp = firstHour ? parseFloat(firstHour.temp) : parseFloat(daily.tempMin)
        // 时光机API的daily没有text字段，需要从hourly中获取
        const weatherText = firstHour ? firstHour.text : '未知'

        weatherData = {
          weather: `天气 ${weatherText} · 气温: ${daily.tempMin}-${daily.tempMax} · 风向: ${firstHour ? firstHour.windDir : '未知'} · 风力: ${firstHour ? firstHour.windScale : '未知'}`,
          weatherText: weatherText,
          temperature: currentTemp,
          temperatureMin: parseFloat(daily.tempMin),
          temperatureMax: parseFloat(daily.tempMax),
          humidity: firstHour ? parseFloat(firstHour.humidity) : parseFloat(daily.humidity || '0'),
          windDirection: firstHour ? firstHour.windDir : '未知',
          windScale: firstHour ? firstHour.windScale : '未知',
          updateTime: daily.date || targetDate
        }

      } else if (diffDays > 0) {
        // 未来日期（后10天），使用每日预报API
        console.log(`获取未来天气: ${targetDate} (${diffDays}天后)`)

        const forecastResult = await getWeatherByDate(location, targetDate, 10)

        if (!forecastResult.success) {
          return serverError(res, forecastResult.error || '获取天气预报失败')
        }

        const forecast = forecastResult.data

        weatherData = {
          weather: `天气 ${forecast.textDay || forecast.text || '未知'} · 气温: ${forecast.tempMin}-${forecast.tempMax} · 风向: ${forecast.windDirDay || '未知'} · 风力: ${forecast.windScaleDay || '未知'}`,
          weatherText: forecast.textDay || forecast.text || '未知',
          temperature: parseFloat(forecast.tempMax), // 未来日期使用最高温度
          temperatureMin: parseFloat(forecast.tempMin),
          temperatureMax: parseFloat(forecast.tempMax),
          humidity: parseFloat(forecast.humidity || '0'),
          windDirection: forecast.windDirDay || '未知',
          windScale: forecast.windScaleDay || '未知',
          updateTime: forecast.fxDate || targetDate
        }

      } else {
        // 今天，使用实时天气和今日预报
        console.log(`获取今天天气: ${targetDate} (diffDays: ${diffDays})`)

        const { getWeatherNow, getWeatherDaily } = require('../../utils/qweather')
        // 和风天气API不支持1天预报，使用3天预报然后取第一项
        const [nowResult, dailyResult] = await Promise.all([
          getWeatherNow(location),
          getWeatherDaily(location, 3)
        ])

        if (!nowResult.success || !dailyResult.success) {
          const errors = []
          if (!nowResult.success) {
            errors.push(`实时天气: ${nowResult.error || '未知错误'}`)
            console.error('获取实时天气失败:', nowResult.error)
          }
          if (!dailyResult.success) {
            errors.push(`每日预报: ${dailyResult.error || '未知错误'}`)
            console.error('获取每日预报失败:', dailyResult.error)
          }
          return serverError(res, `获取今天天气失败: ${errors.join('; ')}`)
        }

        const now = nowResult.data
        const today = dailyResult.data[0]

        if (!now || !today) {
          console.error('天气数据不完整:', { now, today })
          return serverError(res, '天气数据不完整')
        }

        weatherData = {
          weather: `天气 ${now.text} · 气温: ${today.tempMin}-${today.tempMax} · 风向: ${now.windDir} · 风力: ${now.windScale}`,
          weatherText: now.text,
          temperature: parseFloat(now.temp),
          temperatureMin: parseFloat(today.tempMin),
          temperatureMax: parseFloat(today.tempMax),
          humidity: parseFloat(now.humidity),
          windDirection: now.windDir,
          windScale: now.windScale,
          updateTime: now.obsTime
        }
      }

      return success(res, weatherData, '操作成功')

    } catch (error) {
      console.error('获取天气数据错误:', error)
      return serverError(res, error.message || '获取天气数据失败')
    }

  } catch (error) {
    console.error('气象服务错误:', error.message)
    return serverError(res, error.message || '气象服务异常')
  }
})


module.exports = router

