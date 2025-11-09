# WebSocket 连接失败 - 快速解决指南

## ⚠️ 你遇到的错误

```
WebSocket connection to 'wss://api.yimengpl.com/api/realtime-voice/stream' failed
WebSocket错误: {errMsg: "未完成的操作"}
```

## 🚀 快速解决（3步）

### 步骤1：配置微信小程序后台（必须）

1. **登录微信小程序后台**
   - 网址：https://mp.weixin.qq.com/
   - 扫码登录（需要管理员权限）

2. **配置 socket 合法域名**
   ```
   导航: 开发 → 开发管理 → 开发设置 → 服务器域名
   
   在 "socket合法域名" 中添加:
   wss://api.yimengpl.com
   
   同时确保 "request合法域名" 包含:
   https://api.yimengpl.com
   ```

3. **保存配置**
   - 点击"保存并提交"
   - 重启微信开发者工具

### 步骤2：运行诊断工具

```bash
# 运行自动诊断
node test-websocket-connection.js
```

这个工具会自动检查：
- ✅ 本地服务是否运行
- ✅ 本地 WebSocket 是否正常
- ✅ 云端服务是否可访问
- ✅ 云端 WebSocket 是否可连接
- ✅ 依赖包是否完整

### 步骤3：根据结果选择环境

#### 选项A：使用本地开发（推荐测试时使用）

1. **启动本地服务**
   ```bash
   npm start
   ```

2. **修改小程序配置**
   ```javascript
   // 小程序 app.js
   App({
     globalData: {
       apiUrl: 'http://localhost'  // 使用本地地址
     }
   })
   ```

3. **开发者工具设置**
   - 打开：详情 → 本地设置
   - ☑️ 勾选"不校验合法域名..."

#### 选项B：使用云端环境（生产环境）

1. **确认云端服务正常**
   ```bash
   curl https://api.yimengpl.com/health
   ```

2. **确认 WebSocket 支持**
   - 必须完成步骤1的配置
   - 等待微信审核通过（通常立即生效）

3. **小程序使用云端地址**
   ```javascript
   // 小程序 app.js
   App({
     globalData: {
       apiUrl: 'https://api.yimengpl.com'  // 使用云端地址
     }
   })
   ```

## 🔍 问题排查

### 问题1：诊断工具显示"本地服务未运行"

**解决**：
```bash
# 确保在项目根目录
cd c:\Users\admin\Desktop\cloudrun-express - 副本 (2) - 副本

# 启动服务
npm start
```

### 问题2：诊断工具显示"云端 WebSocket 连接失败"

**可能原因**：
1. 云托管环境不支持 WebSocket
2. 负载均衡器配置问题
3. SSL 证书问题

**解决方法**：

**方法1：检查云托管配置**
1. 登录腾讯云控制台
2. 进入 CloudBase → 云托管
3. 查看服务配置：
   - 协议：HTTP/1.1（支持 WebSocket 升级）
   - 超时时间：至少 300 秒
   - 端口：80 或 443

**方法2：联系云服务商**
- 确认云托管是否支持 WebSocket
- 请求开启 WebSocket 支持

**方法3：临时使用 HTTP 接口**
- 使用 `/api/realtime-voice/recognize` 接口（不需要 WebSocket）
- 适用于短语音（60秒以内）

### 问题3：小程序仍然报错"未完成的操作"

**检查清单**：
- [ ] 微信小程序后台已配置 socket 合法域名
- [ ] 域名格式正确：`wss://api.yimengpl.com`（注意是 wss 不是 ws）
- [ ] 已保存配置并重启开发者工具
- [ ] 开发者工具中取消勾选"不校验合法域名"（测试正式配置）

### 问题4：开发者工具可以连接，真机无法连接

**原因**：开发者工具勾选了"不校验合法域名"

**解决**：
1. 必须在微信小程序后台配置合法域名
2. 取消勾选"不校验合法域名"测试
3. 确保真机网络正常

## 📱 小程序完整配置示例

### app.js

```javascript
App({
  globalData: {
    // 根据环境选择
    apiUrl: 'http://localhost',  // 开发环境
    // apiUrl: 'https://api.yimengpl.com',  // 生产环境
  },

  onLaunch() {
    console.log('API地址:', this.globalData.apiUrl)
  }
})
```

### 页面中使用

```javascript
// pages/realtime-voice/realtime-voice.js
const app = getApp()

Page({
  connectWebSocket() {
    const apiUrl = app.globalData.apiUrl
    const wsUrl = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://') + 
                  '/api/realtime-voice/stream'
    
    console.log('连接 WebSocket:', wsUrl)
    
    const socketTask = wx.connectSocket({
      url: wsUrl,
      success: () => {
        console.log('✅ WebSocket 连接成功')
      },
      fail: (err) => {
        console.error('❌ WebSocket 连接失败:', err)
        wx.showModal({
          title: '连接失败',
          content: '请检查网络连接和域名配置\n\n错误: ' + JSON.stringify(err),
          showCancel: false
        })
      }
    })
    
    return socketTask
  }
})
```

## 💡 开发建议

### 开发阶段

1. **使用本地环境**
   - 快速调试
   - 不受域名限制
   - 勾选"不校验合法域名"

2. **使用测试接口**
   - 先用 HTTP 接口 `/api/realtime-voice/recognize` 测试功能
   - 确认基础功能正常后再测试 WebSocket

### 测试阶段

1. **配置合法域名**
   - 提前配置好生产环境域名
   - 测试真实的域名验证

2. **真机测试**
   - 在真机上测试
   - 确保网络环境正常

### 生产阶段

1. **确认云端支持**
   - WebSocket 必须在云端正常工作
   - 监控连接稳定性

2. **降级方案**
   - 提供 HTTP 接口作为备用
   - 处理 WebSocket 连接失败的情况

## 📚 相关文档

- [WebSocket连接问题解决方案（完整版）](docs/WebSocket连接问题解决方案.md)
- [实时语音识别API文档](docs/c-api/实时语音识别API文档.md)
- [微信小程序 WebSocket API](https://developers.weixin.qq.com/miniprogram/dev/api/network/websocket/wx.connectSocket.html)

## 🆘 仍然无法解决？

### 方案1：使用 HTTP 接口替代

如果 WebSocket 实在无法连接，可以暂时使用一句话识别接口：

```javascript
// 使用 HTTP 接口上传音频
wx.uploadFile({
  url: apiUrl + '/api/realtime-voice/recognize',
  filePath: tempFilePath,
  name: 'audio',
  header: {
    'Authorization': 'Bearer ' + token
  },
  success: (res) => {
    const data = JSON.parse(res.data)
    console.log('识别结果:', data.data.text)
  }
})
```

**限制**：只适合 60 秒以内的短语音，无法实时识别

### 方案2：提供详细信息寻求帮助

请提供以下信息：

1. **诊断工具输出**
   ```bash
   node test-websocket-connection.js > diagnosis.txt
   ```

2. **小程序控制台错误**
   - 完整的错误信息截图
   - 网络请求详情

3. **配置信息**
   - 微信小程序后台域名配置截图
   - 云托管环境配置

4. **服务端日志**
   ```bash
   # 本地环境
   npm start
   # 查看是否有 "WebSocket客户端已连接" 的日志
   ```

---

**创建时间**: 2025-11-08  
**适用版本**: v1.0.0  
**测试环境**: Windows + 微信开发者工具












