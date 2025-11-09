# WebSocket 连接问题解决方案

## 问题描述

```
WebSocket connection to 'wss://api.yimengpl.com/api/realtime-voice/stream' failed
WebSocket错误: {errMsg: "未完成的操作"}
```

## 原因分析

### 1. 微信小程序 WebSocket 域名未配置（最常见）

微信小程序要求所有网络请求都必须在合法域名白名单中，包括：
- request 合法域名（用于 `wx.request`）
- **socket 合法域名**（用于 `wx.connectSocket`）
- uploadFile 合法域名
- downloadFile 合法域名

### 2. 云托管环境 WebSocket 支持问题

腾讯云 CloudBase 云托管默认可能不支持 WebSocket 持久连接。

### 3. SSL 证书问题

小程序要求使用 `wss://`（加密 WebSocket），需要有效的 SSL 证书。

## 解决方案

### 方案1：配置微信小程序 WebSocket 合法域名（推荐）

#### 步骤1：登录小程序后台

1. 打开 [https://mp.weixin.qq.com/](https://mp.weixin.qq.com/)
2. 使用管理员微信扫码登录
3. 进入你的小程序管理后台

#### 步骤2：配置 socket 合法域名

1. 导航到：**开发 → 开发管理 → 开发设置**
2. 找到 **服务器域名** 部分
3. 在 **socket合法域名** 中点击 **修改**
4. 添加你的 WebSocket 域名：
   ```
   wss://api.yimengpl.com
   ```

#### 步骤3：同时配置 request 合法域名

如果还没配置，也要添加 HTTP 接口域名：
```
https://api.yimengpl.com
```

#### 步骤4：保存并等待生效

- 点击 **保存并提交**
- 等待微信审核（通常立即生效）
- 重启微信开发者工具

#### 步骤5：在开发者工具中验证

1. 打开微信开发者工具
2. 进入 **详情 → 本地设置**
3. 确保 **不校验合法域名** 选项：
   - **开发时**：可以勾选，方便测试
   - **正式发布前**：必须取消勾选，验证域名配置

### 方案2：使用本地开发环境测试

如果云端环境有问题，可以先在本地测试：

#### 步骤1：启动本地服务

```bash
# 在项目根目录
npm start
```

#### 步骤2：修改小程序 API 地址

在小程序的 `app.js` 中：

```javascript
App({
  globalData: {
    // 开发环境使用本地地址
    apiUrl: 'http://localhost',
    // apiUrl: 'https://api.yimengpl.com', // 生产环境
  }
})
```

#### 步骤3：开发者工具中启用调试

1. 打开微信开发者工具
2. 进入 **详情 → 本地设置**
3. **勾选** 以下选项：
   - ✅ 不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书
4. 这样就可以连接本地的 `ws://localhost/api/realtime-voice/stream`

### 方案3：检查云托管 WebSocket 支持

#### 云托管是否支持 WebSocket？

腾讯云 CloudBase 云托管**支持 WebSocket**，但需要注意：

1. **长连接超时设置**
   - 默认超时可能较短（如 60 秒）
   - 需要在云托管控制台配置更长的超时时间

2. **反向代理配置**
   - 确保 Nginx/负载均衡器支持 WebSocket
   - 需要正确配置 `Upgrade` 和 `Connection` 头

#### 检查方法

**方法1：使用 wscat 测试**

```bash
# 安装 wscat
npm install -g wscat

# 测试 WebSocket 连接
wscat -c wss://api.yimengpl.com/api/realtime-voice/stream
```

**方法2：使用浏览器控制台测试**

```javascript
// 在浏览器控制台执行
const ws = new WebSocket('wss://api.yimengpl.com/api/realtime-voice/stream')

ws.onopen = () => {
  console.log('✅ WebSocket 已连接')
  ws.send(JSON.stringify({
    type: 'start',
    userId: 1,
    token: 'test_token'
  }))
}

ws.onerror = (err) => {
  console.error('❌ WebSocket 错误:', err)
}

ws.onmessage = (event) => {
  console.log('📩 收到消息:', event.data)
}
```

**方法3：检查云托管日志**

1. 登录腾讯云控制台
2. 进入 CloudBase 控制台
3. 查看云托管服务日志
4. 搜索 "WebSocket" 相关错误

### 方案4：云托管环境配置优化

如果云托管环境不支持 WebSocket，需要添加配置：

#### 1. 检查 Dockerfile

确保你的 `Dockerfile` 暴露了正确的端口：

```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 80
CMD ["node", "bin/www"]
```

#### 2. 配置云托管服务

在云托管控制台：
- 设置**监听端口**：80
- 设置**协议**：HTTP/1.1（支持 WebSocket 升级）
- 设置**超时时间**：300 秒或更长

#### 3. 环境变量配置

确保 `.env` 中的配置正确：

```env
NODE_ENV=production
PORT=80

# 腾讯云语音识别配置
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_APP_ID=your_app_id

# 数据库配置
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

## 验证配置

### 1. 验证域名配置

在微信开发者工具控制台执行：

```javascript
// 测试 WebSocket 连接
const testWebSocket = () => {
  const ws = wx.connectSocket({
    url: 'wss://api.yimengpl.com/api/realtime-voice/stream',
    success: () => console.log('✅ 连接成功'),
    fail: (err) => console.error('❌ 连接失败:', err)
  })
  
  ws.onOpen(() => {
    console.log('✅ WebSocket 已打开')
  })
  
  ws.onError((err) => {
    console.error('❌ WebSocket 错误:', err)
  })
}

testWebSocket()
```

### 2. 验证服务端日志

查看后端日志，确认是否收到 WebSocket 连接请求：

```bash
# 本地测试
npm start

# 查看日志，应该看到类似输出：
# WebSocket客户端已连接
# 收到客户端消息: start
```

### 3. 验证网络连接

使用 `curl` 测试 HTTP 接口：

```bash
# 测试健康检查
curl https://api.yimengpl.com/health

# 测试一句话识别（不需要 WebSocket）
curl -X POST https://api.yimengpl.com/api/realtime-voice/recognize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@test.wav"
```

## 常见错误和解决方法

### 错误1：errMsg: "未完成的操作"

**原因**：WebSocket 连接被拒绝或域名未配置

**解决**：
1. 检查小程序后台的 socket 合法域名配置
2. 确保使用 `wss://` 而不是 `ws://`
3. 检查服务器是否正在运行

### 错误2：errMsg: "连接服务器超时"

**原因**：服务器响应慢或网络问题

**解决**：
1. 检查云托管服务是否正常运行
2. 增加超时时间配置
3. 检查服务器负载

### 错误3：SSL/TLS 证书错误

**原因**：证书无效或过期

**解决**：
1. 确保域名有有效的 SSL 证书
2. 检查证书是否包含 WebSocket 支持
3. 使用 Let's Encrypt 等免费证书服务

### 错误4：404 Not Found

**原因**：路由配置问题

**解决**：
1. 检查 `app.js` 中是否正确注册路由：
   ```javascript
   app.use('/api/realtime-voice', realtimeVoiceRouter)
   ```
2. 确认路由文件 `routes/realtime-voice.js` 存在
3. 检查 WebSocket 路由定义：
   ```javascript
   router.ws('/stream', (ws, req) => { ... })
   ```

## 开发环境快速测试

### 方案A：完全本地测试（最简单）

1. **启动本地服务**
   ```bash
   npm start
   ```

2. **修改小程序配置**
   ```javascript
   // app.js
   globalData: {
     apiUrl: 'http://localhost'
   }
   ```

3. **开发者工具设置**
   - ✅ 不校验合法域名

4. **测试连接**
   - WebSocket 地址自动变为：`ws://localhost/api/realtime-voice/stream`

### 方案B：使用内网穿透（推荐开发时使用）

如果需要在真机测试，可以使用内网穿透：

```bash
# 使用 ngrok
ngrok http 80

# 或使用 cloudflared
cloudflared tunnel --url http://localhost:80
```

然后在小程序中使用穿透后的 HTTPS 地址。

## 生产环境配置清单

### ✅ 微信小程序后台

- [ ] 配置 `https://api.yimengpl.com` 为 request 合法域名
- [ ] 配置 `wss://api.yimengpl.com` 为 socket 合法域名
- [ ] 上传服务器域名备案号（如需要）

### ✅ 云托管环境

- [ ] 服务正常运行
- [ ] 端口配置正确（80 或 443）
- [ ] 支持 WebSocket 协议
- [ ] 超时时间设置合理（建议 300 秒）
- [ ] 环境变量配置完整

### ✅ SSL 证书

- [ ] 域名绑定了有效的 SSL 证书
- [ ] 证书未过期
- [ ] 支持 WebSocket (wss://)

### ✅ 代码配置

- [ ] `app.js` 正确配置 WebSocket 支持
- [ ] `routes/realtime-voice.js` 路由正确
- [ ] 小程序 `app.js` 的 `apiUrl` 指向生产域名

## 测试工具

### 在线测试工具

- **WebSocket 测试工具**: https://www.websocket.org/echo.html
- **Postman**: 支持 WebSocket 测试
- **wscat**: 命令行 WebSocket 客户端

### 小程序测试代码

创建一个测试页面 `test-websocket.js`：

```javascript
Page({
  onLoad() {
    this.testWebSocket()
  },
  
  testWebSocket() {
    const ws = wx.connectSocket({
      url: 'wss://api.yimengpl.com/api/realtime-voice/stream'
    })
    
    wx.onSocketOpen(() => {
      console.log('✅ WebSocket 连接成功')
      wx.showToast({
        title: '连接成功',
        icon: 'success'
      })
      
      // 发送测试消息
      wx.sendSocketMessage({
        data: JSON.stringify({
          type: 'start',
          userId: 1,
          token: 'test'
        })
      })
    })
    
    wx.onSocketError((err) => {
      console.error('❌ WebSocket 错误:', err)
      wx.showToast({
        title: '连接失败: ' + JSON.stringify(err),
        icon: 'none'
      })
    })
    
    wx.onSocketMessage((res) => {
      console.log('📩 收到消息:', res.data)
    })
  }
})
```

## 相关文档

- [微信小程序 WebSocket API](https://developers.weixin.qq.com/miniprogram/dev/api/network/websocket/wx.connectSocket.html)
- [腾讯云 CloudBase 云托管](https://cloud.tencent.com/document/product/1243)
- [Express WebSocket 文档](https://github.com/HenningM/express-ws)

## 需要帮助？

如果问题仍未解决，请提供以下信息：

1. 微信开发者工具控制台的完整错误信息
2. 后端服务日志
3. 云托管环境配置截图
4. 小程序后台域名配置截图

---

**更新时间**: 2025-11-08
**相关文件**: 
- `routes/realtime-voice.js`
- `miniapp-example/pages/realtime-voice/realtime-voice.js`
- `docs/c-api/实时语音识别API文档.md`











