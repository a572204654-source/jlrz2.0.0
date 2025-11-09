# 🌤️ 天气功能 - 快速参考

> 本项目已集成和风天气 API，支持通过**用户定位**查询天气信息

---

## 🚀 快速开始

### 小程序端（3步搞定）

```javascript
// 1. 获取定位
wx.getLocation({
  type: 'wgs84',
  success: (res) => {
    const { longitude, latitude } = res
    
    // 2. 调用天气接口
    wx.request({
      url: 'https://your-domain.com/api/weather/now',
      data: {
        location: `${longitude},${latitude}`
      },
      success: (res) => {
        // 3. 显示天气
        const weather = res.data.data.data
        console.log('温度:', weather.temp + '°C')
        console.log('天气:', weather.text)
      }
    })
  }
})
```

### 配置权限（app.json）

```json
{
  "permission": {
    "scope.userLocation": {
      "desc": "您的位置信息将用于获取当地天气"
    }
  },
  "requiredPrivateInfos": ["getLocation"]
}
```

---

## 📍 可用接口

| 接口 | 路径 | 说明 |
|------|------|------|
| 实时天气 | `GET /api/weather/now` | 当前温度、天气状况 |
| 综合天气 | `GET /api/weather/comprehensive` | 实时+预报+空气（推荐）|
| 天气预报 | `GET /api/weather/daily` | 3/7/10/15/30天预报 |
| 逐小时预报 | `GET /api/weather/hourly` | 24/72/168小时预报 |
| 空气质量 | `GET /api/weather/air` | AQI、PM2.5等 |
| 生活指数 | `GET /api/weather/indices` | 穿衣、运动、紫外线等 |
| 天气预警 | `GET /api/weather/warning` | 天气预警信息 |

**参数**: 所有接口都使用 `location` 参数
- 经纬度格式: `location=116.41,39.92`
- 城市ID格式: `location=101010100`

---

## 💡 使用示例

### 实时天气

```javascript
wx.request({
  url: 'https://your-domain.com/api/weather/now',
  data: { location: '116.41,39.92' },
  success: (res) => {
    const { temp, text, humidity, windDir } = res.data.data.data
    console.log(`${temp}°C ${text} 湿度${humidity}% ${windDir}`)
  }
})
```

### 综合天气（推荐）

```javascript
wx.request({
  url: 'https://your-domain.com/api/weather/comprehensive',
  data: { location: '116.41,39.92' },
  success: (res) => {
    const data = res.data.data
    console.log('实时:', data.now)
    console.log('预报:', data.daily)
    console.log('空气:', data.air)
  }
})
```

---

## 📊 响应格式

```json
{
  "code": 0,
  "message": "获取实时天气成功",
  "data": {
    "success": true,
    "data": {
      "temp": "8",           // 温度（℃）
      "text": "雾",          // 天气状况
      "feelsLike": "7",      // 体感温度
      "humidity": "91",      // 湿度（%）
      "windDir": "南风",     // 风向
      "windScale": "1"       // 风力等级
    },
    "updateTime": "2025-11-08T20:51+08:00"
  }
}
```

---

## 🎯 常用城市坐标

| 城市 | 经纬度 | 城市ID |
|------|--------|--------|
| 北京 | 116.41,39.92 | 101010100 |
| 上海 | 121.47,31.23 | 101020100 |
| 广州 | 113.26,23.13 | 101280101 |
| 深圳 | 114.06,22.55 | 101280601 |
| 杭州 | 120.16,30.28 | 101210101 |
| 成都 | 104.07,30.67 | 101270101 |

---

## 🧪 快速测试

### 命令行测试

```bash
# 实时天气
curl "http://localhost/api/weather/now?location=116.41,39.92"

# 综合天气
curl "http://localhost/api/weather/comprehensive?location=116.41,39.92"
```

### Node.js 测试

```bash
node test-qweather-simple.js
```

---

## 📖 详细文档

| 文档 | 说明 |
|------|------|
| [天气API使用指南.md](docs/天气API使用指南.md) | 完整的 API 使用说明 |
| [天气功能完整流程.md](docs/天气功能完整流程.md) | 流程图和代码对照 |
| [天气API测试示例.md](docs/天气API测试示例.md) | 测试方法和示例 |
| [和风天气JWT配置完成.md](docs/和风天气JWT配置完成.md) | JWT 认证配置说明 |
| [weather-with-location.js](miniapp-example/weather-with-location.js) | 小程序完整示例代码 |

---

## ⚙️ 配置信息

### 环境变量（.env）

```env
QWEATHER_KEY_ID=TCWHA45GD4
QWEATHER_PROJECT_ID=288AH4E373
QWEATHER_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
QWEATHER_API_HOST=https://ma4bjadbw4.re.qweatherapi.com
```

### 配置文件

- `config/index.js` - 和风天气配置
- `utils/qweather.js` - 天气 API 工具
- `utils/qweather-jwt.js` - JWT Token 生成
- `routes/weather.js` - 天气路由

---

## ❓ 常见问题

### Q: 如何获取用户定位？

```javascript
wx.getLocation({
  type: 'wgs84',
  success: (res) => {
    console.log(res.longitude, res.latitude)
  }
})
```

### Q: 定位授权失败怎么办？

```javascript
wx.authorize({
  scope: 'scope.userLocation',
  fail: () => {
    wx.showModal({
      title: '需要定位权限',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting()
        }
      }
    })
  }
})
```

### Q: 如何使用城市 ID 而不是经纬度？

```javascript
// 直接传入城市 ID
location: '101010100'  // 北京
```

### Q: 如何一次获取所有天气信息？

```javascript
// 使用综合天气接口
GET /api/weather/comprehensive
```

---

## 🔧 调试工具

### 查看配置状态

```bash
curl http://localhost/api/weather/debug-config
```

### 查看健康状态

```bash
curl http://localhost/health
```

---

## ✅ 功能清单

- [x] JWT 认证配置完成
- [x] 实时天气查询
- [x] 天气预报（3/7/10/15/30天）
- [x] 逐小时预报（24/72/168小时）
- [x] 空气质量查询
- [x] 生活指数查询
- [x] 天气预警查询
- [x] 综合天气信息
- [x] 支持经纬度定位
- [x] 支持城市 ID 查询
- [x] 自动 JWT Token 缓存
- [x] 完善的错误处理
- [x] 统一响应格式

---

## 🎉 现在可以：

✅ **在小程序中获取用户定位**  
✅ **通过定位查询当地天气**  
✅ **显示实时天气信息**  
✅ **显示7天天气预报**  
✅ **显示空气质量指数**  
✅ **显示生活指数建议**

---

## 📞 技术支持

- 和风天气开发文档: https://dev.qweather.com/docs/
- JWT 认证说明: https://dev.qweather.com/docs/configuration/authentication/
- 项目 Issues: 提交问题到项目仓库

---

**最后更新**: 2025-11-08  
**版本**: v1.0.0  
**状态**: ✅ 已完成并测试通过

🎊 开始使用天气功能吧！












