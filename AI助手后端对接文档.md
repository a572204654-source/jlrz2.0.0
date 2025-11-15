# AI助手后端对接文档

## 接口概述

AI助手模块提供智能对话功能，支持会话管理、消息发送与接收、历史记录查询等功能。用于为用户提供项目监理相关的智能问答服务。

**基础URL**: `https://api.yimengpl.com`

**认证方式**: JWT Token（在请求头中携带 `Authorization: Bearer {token}`）

---

## 接口列表

### 1. 创建新会话

**接口说明**: 创建一个新的AI对话会话

**请求地址**: `POST /api/ai/chat/session`

**是否需要认证**: 是

#### 请求参数

无需传递参数（会话ID由后端生成）

#### 请求示例

```javascript
import { createAIChatSession } from '@/api/ai-chat.js'

// 创建新会话
async function initSession() {
  try {
    const data = await createAIChatSession()
    const sessionId = data.sessionId
    console.log('会话创建成功:', sessionId)
    return sessionId
  } catch (error) {
    console.error('创建会话失败:', error)
    // 失败时使用本地会话ID
    return `local_${Date.now()}`
  }
}
```

#### 响应数据

**成功响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "sessionId": "sess_1234567890abcdef",
    "createTime": "2024-01-15T10:30:00+08:00"
  },
  "timestamp": 1699200000000
}
```

**错误响应**:

```json
{
  "code": 401,
  "message": "未授权，请先登录",
  "data": null,
  "timestamp": 1699200000000
}
```

#### 响应字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| code | Number | 响应码，200表示成功 | 200 |
| message | String | 响应消息 | "操作成功" |
| data | Object | 响应数据 | - |
| data.sessionId | String | 会话ID（必需） | "sess_1234567890abcdef" |
| data.createTime | String | 会话创建时间（可选） | "2024-01-15T10:30:00+08:00" |
| timestamp | Number | 响应时间戳 | 1699200000000 |

---

### 2. 发送消息

**接口说明**: 向AI助手发送用户消息，并接收AI回复

**请求地址**: `POST /api/ai/chat/send`

**是否需要认证**: 是

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| sessionId | String | 是 | 会话ID | "sess_1234567890abcdef" |
| content | String | 是 | 用户消息内容 | "请帮我生成一份监理日志" |

#### 请求示例

```javascript
import { sendAIChatMessage } from '@/api/ai-chat.js'

// 发送消息
async function sendMessage(sessionId, userMessage) {
  try {
    const data = await sendAIChatMessage({
      sessionId: sessionId,
      content: userMessage
    })
    const aiReply = data.aiReply
    console.log('AI回复:', aiReply)
    return aiReply
  } catch (error) {
    console.error('发送消息失败:', error)
    throw error
  }
}

// 使用示例
const reply = await sendMessage('sess_123', '你好，请介绍一下监理工作的要点')
```

#### 请求体示例

```json
{
  "sessionId": "sess_1234567890abcdef",
  "content": "请帮我生成一份监理日志"
}
```

#### 响应数据

**成功响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "aiReply": "好的，我来帮您生成一份监理日志。请问您需要填写哪个日期的监理日志？需要包含哪些具体内容？",
    "messageId": "msg_1234567890",
    "timestamp": "2024-01-15T10:31:00+08:00"
  },
  "timestamp": 1699200000000
}
```

**错误响应**:

```json
{
  "code": 400,
  "message": "会话ID不能为空",
  "data": null,
  "timestamp": 1699200000000
}
```

#### 响应字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| code | Number | 响应码，200表示成功 | 200 |
| message | String | 响应消息 | "操作成功" |
| data | Object | 响应数据 | - |
| data.aiReply | String | **AI助手的回复内容（必需）** | "好的，我来帮您..." |
| data.messageId | String | 消息ID（可选） | "msg_1234567890" |
| data.timestamp | String | 回复时间（可选） | "2024-01-15T10:31:00+08:00" |
| timestamp | Number | 响应时间戳 | 1699200000000 |

---

### 3. 获取对话历史

**接口说明**: 获取指定会话的历史消息记录

**请求地址**: `GET /api/ai/chat/history`

**是否需要认证**: 是

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| sessionId | String | 是 | 会话ID | "sess_1234567890abcdef" |
| page | Number | 否 | 页码，默认1 | 1 |
| pageSize | Number | 否 | 每页数量，默认50 | 50 |

#### 请求示例

```javascript
import { getAIChatHistory } from '@/api/ai-chat.js'

// 获取对话历史
async function loadHistory(sessionId) {
  try {
    const data = await getAIChatHistory({
      sessionId: sessionId,
      page: 1,
      pageSize: 50
    })
    const messages = data.messages || data.list || []
    console.log('历史消息:', messages)
    return messages
  } catch (error) {
    console.error('获取历史失败:', error)
    return []
  }
}
```

#### 响应数据

**成功响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "messages": [
      {
        "type": "user",
        "content": "你好",
        "timestamp": "2024-01-15T10:30:00+08:00"
      },
      {
        "type": "ai",
        "content": "您好，我是项目监理助手，有什么可以帮助您的？",
        "timestamp": "2024-01-15T10:30:05+08:00"
      }
    ],
    "total": 2,
    "page": 1,
    "pageSize": 50
  },
  "timestamp": 1699200000000
}
```

#### 响应字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| code | Number | 响应码，200表示成功 | 200 |
| message | String | 响应消息 | "操作成功" |
| data | Object | 响应数据 | - |
| data.messages | Array | **消息列表（必需）** | - |
| data.messages[].type | String | 消息类型："user"或"ai" | "user" |
| data.messages[].content | String | 消息内容 | "你好" |
| data.messages[].timestamp | String | 消息时间（可选） | "2024-01-15T10:30:00+08:00" |
| data.total | Number | 总消息数（可选） | 2 |
| data.page | Number | 当前页码（可选） | 1 |
| data.pageSize | Number | 每页数量（可选） | 50 |

---

### 4. 获取会话列表

**接口说明**: 获取用户的所有会话列表

**请求地址**: `GET /api/ai/chat/sessions`

**是否需要认证**: 是

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| page | Number | 否 | 页码，默认1 | 1 |
| pageSize | Number | 否 | 每页数量，默认20 | 20 |

#### 请求示例

```javascript
import { getAIChatSessions } from '@/api/ai-chat.js'

// 获取会话列表
async function loadSessions() {
  try {
    const data = await getAIChatSessions({
      page: 1,
      pageSize: 20
    })
    const sessions = data.sessions || data.list || []
    console.log('会话列表:', sessions)
    return sessions
  } catch (error) {
    console.error('获取会话列表失败:', error)
    return []
  }
}
```

#### 响应数据

**成功响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "sessions": [
      {
        "sessionId": "sess_1234567890abcdef",
        "title": "监理日志咨询",
        "lastMessage": "好的，我来帮您生成...",
        "updateTime": "2024-01-15T10:31:00+08:00",
        "createTime": "2024-01-15T10:30:00+08:00"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  },
  "timestamp": 1699200000000
}
```

#### 响应字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| code | Number | 响应码，200表示成功 | 200 |
| message | String | 响应消息 | "操作成功" |
| data | Object | 响应数据 | - |
| data.sessions | Array | **会话列表（必需）** | - |
| data.sessions[].sessionId | String | 会话ID | "sess_1234567890abcdef" |
| data.sessions[].title | String | 会话标题（可选） | "监理日志咨询" |
| data.sessions[].lastMessage | String | 最后一条消息（可选） | "好的，我来帮您生成..." |
| data.sessions[].updateTime | String | 更新时间（可选） | "2024-01-15T10:31:00+08:00" |
| data.sessions[].createTime | String | 创建时间（可选） | "2024-01-15T10:30:00+08:00" |
| data.total | Number | 总会话数（可选） | 1 |
| data.page | Number | 当前页码（可选） | 1 |
| data.pageSize | Number | 每页数量（可选） | 20 |

---

### 5. 删除会话

**接口说明**: 删除指定的会话及其所有历史消息

**请求地址**: `DELETE /api/ai/chat/session/{sessionId}`

**是否需要认证**: 是

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| sessionId | String | 是 | 会话ID（URL路径参数） | "sess_1234567890abcdef" |

#### 请求示例

```javascript
import { deleteAIChatSession } from '@/api/ai-chat.js'

// 删除会话
async function removeSession(sessionId) {
  try {
    await deleteAIChatSession(sessionId)
    console.log('会话删除成功')
    return true
  } catch (error) {
    console.error('删除会话失败:', error)
    return false
  }
}

// 使用示例
const success = await removeSession('sess_1234567890abcdef')
```

#### 响应数据

**成功响应**:

```json
{
  "code": 200,
  "message": "删除成功",
  "data": null,
  "timestamp": 1699200000000
}
```

**错误响应**:

```json
{
  "code": 404,
  "message": "会话不存在",
  "data": null,
  "timestamp": 1699200000000
}
```

---

### 6. 获取AI提供商密钥

**接口说明**: 获取指定AI提供商的访问密钥（由后端安全下发，前端用于直接调用AI服务）

**请求地址**: `GET /api/ai/provider-key`

**是否需要认证**: 是

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| provider | String | 是 | 提供商标识 | "doubao" |

#### 请求示例

```javascript
import { getAIProviderKey } from '@/api/ai-chat.js'

// 获取提供商密钥
async function getProviderKey(provider) {
  try {
    const data = await getAIProviderKey(provider)
    const apiKey = data.apiKey
    console.log('获取密钥成功')
    return apiKey
  } catch (error) {
    console.error('获取密钥失败:', error)
    return null
  }
}

// 使用示例
const apiKey = await getProviderKey('doubao')
```

#### 响应数据

**成功响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "apiKey": "your-api-key-here",
    "provider": "doubao",
    "expiresAt": "2024-01-15T23:59:59+08:00"
  },
  "timestamp": 1699200000000
}
```

#### 响应字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| code | Number | 响应码，200表示成功 | 200 |
| message | String | 响应消息 | "操作成功" |
| data | Object | 响应数据 | - |
| data.apiKey | String | **API密钥（必需）** | "your-api-key-here" |
| data.provider | String | 提供商标识（可选） | "doubao" |
| data.expiresAt | String | 密钥过期时间（可选） | "2024-01-15T23:59:59+08:00" |

---

## 数据结构说明

### 消息对象结构

前端使用的消息对象结构：

```javascript
{
  type: 'user' | 'ai',  // 消息类型
  content: String,       // 消息内容
  timestamp: String      // 时间戳（可选）
}
```

### 会话生命周期

1. **创建会话**: 用户进入AI助手页面时自动调用 `createAIChatSession`
2. **发送消息**: 用户输入消息后调用 `sendAIChatMessage`
3. **显示回复**: 接收到 `aiReply` 后添加到聊天列表
4. **加载历史**: 需要时调用 `getAIChatHistory`（可选）
5. **删除会话**: 用户主动删除时调用 `deleteAIChatSession`（可选）

---

## 前端实现示例

### 完整的AI聊天页面实现

```javascript
// pages/ai/ai.vue 关键代码片段
import { createAIChatSession, sendAIChatMessage, getAIChatHistory } from '@/common/api.js'

export default {
  data() {
    return {
      sessionId: '',           // 会话ID
      inputText: '',          // 输入框内容
      chatList: [             // 聊天消息列表
        {
          type: 'ai',
          content: '您好，我是项目监理助手，可以协助生成监理日志、优化表述、总结要点等。'
        }
      ],
      loading: false          // 加载状态
    }
  },

  onLoad() {
    // 页面加载时初始化会话
    this.initSession()
  },

  methods: {
    /**
     * 初始化会话
     */
    async initSession() {
      try {
        const data = await createAIChatSession()
        this.sessionId = data.sessionId
        console.log('会话创建成功:', this.sessionId)
      } catch (error) {
        console.error('创建会话失败:', error)
        // 失败时使用本地会话ID
        this.sessionId = `local_${Date.now()}`
      }
    },

    /**
     * 发送消息
     */
    async sendMessage() {
      const userMessage = this.inputText.trim()
      if (!userMessage) {
        return
      }

      // 添加用户消息到列表
      this.chatList.push({
        type: 'user',
        content: userMessage
      })

      this.inputText = ''
      this.loading = true

      try {
        // 调用后端接口
        const data = await sendAIChatMessage({
          sessionId: this.sessionId,
          content: userMessage
        })

        // 添加AI回复到列表
        this.chatList.push({
          type: 'ai',
          content: data.aiReply || '（无内容）'
        })
      } catch (error) {
        // 错误处理
        this.chatList.push({
          type: 'ai',
          content: `错误：${error.message || '抱歉，助手服务暂时不可用，请稍后再试。'}`
        })
      } finally {
        this.loading = false
      }
    }
  }
}
```

---

## 错误码说明

### 通用错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 200 | 成功 | - |
| 400 | 参数错误 | 检查请求参数是否正确 |
| 401 | 未授权/Token无效 | 检查Token是否有效，引导用户重新登录 |
| 404 | 资源不存在 | 检查sessionId或其他ID是否正确 |
| 500 | 服务器错误 | 联系后端开发人员，或稍后重试 |

### 业务错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 会话ID不能为空 | 确保传递了sessionId参数 |
| 400 | 消息内容不能为空 | 确保传递了content参数 |
| 404 | 会话不存在 | 会话可能已过期或已删除，需要创建新会话 |
| 429 | 请求过于频繁 | 降低请求频率，添加防抖处理 |
| 500 | AI服务暂时不可用 | 稍后重试，或显示错误提示 |

---

## 请求与响应格式

### 统一请求头

所有请求都需要包含以下请求头：

```javascript
{
  'Content-Type': 'application/json; charset=utf-8',
  'Accept': 'application/json; charset=utf-8',
  'Accept-Charset': 'utf-8',
  'Authorization': 'Bearer {token}'  // JWT Token
}
```

### 统一响应格式

所有接口返回的响应格式统一为：

```javascript
{
  code: Number,      // 响应码，200表示成功
  message: String,   // 响应消息
  data: Object|null, // 响应数据
  timestamp: Number  // 响应时间戳（可选）
}
```

---

## 注意事项

### 1. 会话管理

- **会话创建**: 每次进入AI助手页面时创建新会话
- **会话持久化**: 建议后端保存会话历史，以便用户下次访问时可以查看
- **会话过期**: 建议设置会话过期时间（如7天），过期后自动删除

### 2. 消息处理

- **消息顺序**: 前端按时间顺序显示消息
- **消息类型**: 区分用户消息（type: 'user'）和AI消息（type: 'ai'）
- **空消息**: 前端过滤空消息，不发送给后端

### 3. 性能优化

- **加载提示**: 发送消息时关闭默认加载提示（`showLoading: false`），使用自定义打字动画
- **防抖处理**: 建议对发送消息按钮添加防抖，避免重复提交
- **历史加载**: 分页加载历史消息，避免一次性加载过多数据

### 4. 错误处理

- **网络错误**: 显示友好的错误提示
- **Token过期**: 自动跳转到登录页
- **服务异常**: 显示"AI服务暂时不可用"提示，允许用户重试

### 5. 安全性

- **Token验证**: 所有接口都需要验证JWT Token
- **内容过滤**: 后端应对用户输入进行内容审核
- **频率限制**: 建议对用户请求频率进行限制，防止滥用

### 6. AI提供商集成

- **支持的提供商**: 目前支持"doubao"（豆包）等
- **密钥安全**: API密钥由后端安全下发，不应硬编码在前端
- **降级策略**: 当AI服务不可用时，应有降级方案

---

## 使用场景

### 场景1: 用户首次进入AI助手页面

```javascript
// 1. 检查登录状态
const token = uni.getStorageSync('token')
if (!token) {
  uni.reLaunch({ url: '/pages/login/login' })
  return
}

// 2. 创建新会话
const data = await createAIChatSession()
this.sessionId = data.sessionId

// 3. 显示欢迎消息
this.chatList = [{
  type: 'ai',
  content: '您好，我是项目监理助手，可以协助生成监理日志、优化表述、总结要点等。'
}]
```

### 场景2: 用户发送消息

```javascript
// 1. 验证输入
if (!this.inputText.trim()) {
  return
}

// 2. 添加用户消息到界面
this.chatList.push({
  type: 'user',
  content: this.inputText
})

// 3. 发送到后端
this.loading = true
const data = await sendAIChatMessage({
  sessionId: this.sessionId,
  content: this.inputText
})

// 4. 显示AI回复
this.chatList.push({
  type: 'ai',
  content: data.aiReply
})
this.loading = false
```

### 场景3: 处理错误情况

```javascript
try {
  const data = await sendAIChatMessage({
    sessionId: this.sessionId,
    content: userMessage
  })
  // 成功处理
} catch (error) {
  if (error.message.includes('登录已过期')) {
    // Token过期，跳转登录
    uni.reLaunch({ url: '/pages/login/login' })
  } else {
    // 其他错误，显示错误消息
    this.chatList.push({
      type: 'ai',
      content: `错误：${error.message}`
    })
  }
}
```

---

## 常见问题

### Q1: 为什么创建会话失败？

**A**: 可能的原因：
1. Token未传递或已过期 - 检查登录状态
2. 后端AI服务未启动 - 联系后端团队
3. 网络连接问题 - 检查网络状态

**前端降级方案**: 使用本地会话ID（`local_${Date.now()}`），允许用户在本地进行对话，但无法保存到服务器。

### Q2: 为什么AI回复很慢？

**A**: AI生成回复需要一定时间（通常1-5秒），建议：
1. 显示加载动画（打字动画）
2. 设置合理的超时时间（30秒）
3. 如果超时，显示"AI服务繁忙"提示

### Q3: 如何处理长消息？

**A**: 
- **用户消息**: 前端可以限制输入长度（如2000字符）
- **AI回复**: 后端应控制回复长度，前端使用 `white-space: pre-wrap` 和 `word-break: break-word` 确保正确换行

### Q4: 会话历史可以保存多久？

**A**: 建议后端实现：
- 活跃会话：保存7-30天
- 非活跃会话：保存3-7天
- 用户可以手动删除会话

### Q5: 是否支持语音输入？

**A**: 前端已集成语音识别功能（仅限微信小程序），流程：
1. 用户点击语音按钮
2. 调用微信语音识别API
3. 将识别结果填入输入框
4. 用户确认后发送

---

## 更新日志

### v1.0.0 (2024-11-15)
- ✅ 初始版本
- ✅ 支持创建会话
- ✅ 支持发送消息和接收AI回复
- ✅ 支持获取对话历史
- ✅ 支持获取会话列表
- ✅ 支持删除会话
- ✅ 支持获取AI提供商密钥

---

## 技术支持

如有问题，请联系后端开发团队或查看项目文档。

**API文档版本**: v1.0.0  
**最后更新**: 2024-11-15  
**维护团队**: 后端开发组

---

## 附录

### 前端API文件位置

- **API定义**: `/api/ai-chat.js`
- **页面实现**: `/pages/ai/ai.vue`
- **API导出**: `/common/api.js`
- **请求工具**: `/utils/request.js`

### 相关技术栈

- **前端框架**: uni-app
- **请求库**: uni.request (封装)
- **UI组件**: uni-icons, pyh-nv
- **认证方式**: JWT Token

### 后端要求

1. **必须字段**: 
   - `createAIChatSession` 响应中的 `sessionId`
   - `sendAIChatMessage` 响应中的 `aiReply`
   - `getAIChatHistory` 响应中的 `messages` 数组

2. **可选字段**: 
   - 时间戳、消息ID等元数据可选
   - 分页信息（total, page, pageSize）建议实现

3. **性能要求**: 
   - 创建会话：< 1秒
   - 发送消息：< 5秒
   - 获取历史：< 2秒

4. **安全要求**: 
   - 所有接口必须验证JWT Token
   - 用户只能访问自己的会话
   - 对用户输入进行内容审核
