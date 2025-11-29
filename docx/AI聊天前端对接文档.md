# AI聊天功能 - 前端对接文档

> 更新时间：2024-11-29  
> 版本：v2.0  
> 基础路径：`/api/ai/chat`

---

## 功能概述

| 功能 | 说明 |
|------|------|
| 会话管理 | 创建、列表、重命名、删除会话 |
| 聊天记录 | 自动保存，支持历史查看 |
| 文件上传 | 支持图片、文档上传 |
| 文档解析 | AI可读取docx/pdf/txt文件内容 |
| 图片识别 | AI可识别分析图片内容 |

---

## 认证方式

所有接口需要在请求头携带Token：

```javascript
headers: {
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
```

---

## 一、会话管理

### 1.1 创建会话

**请求**
```
POST /api/ai/chat/sessions
```

**参数**
```json
{
  "title": "新对话"  // 可选，默认"新对话"
}
```

**响应**
```json
{
  "code": 0,
  "message": "会话创建成功",
  "data": {
    "id": 1,
    "sessionId": "chat_1732867200000_abc123def456",
    "title": "新对话",
    "messageCount": 0,
    "createdAt": "2024-11-29 10:00:00"
  }
}
```

**前端示例**
```javascript
async function createSession(title = '新对话') {
  const res = await request.post('/api/ai/chat/sessions', { title })
  return res.data.sessionId
}
```

---

### 1.2 获取会话列表

**请求**
```
GET /api/ai/chat/sessions?page=1&pageSize=20&keyword=
```

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20，最大100 |
| keyword | string | 否 | 搜索关键词 |

**响应**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "sessionId": "chat_xxx",
        "title": "关于监理日志的问题",
        "lastMessage": "好的，我来帮您...",
        "messageCount": 10,
        "createdAt": "2024-11-29 10:00:00",
        "updatedAt": "2024-11-29 11:30:00"
      }
    ],
    "total": 15,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

### 1.3 重命名会话

**请求**
```
PUT /api/ai/chat/sessions/:sessionId
```

**参数**
```json
{
  "title": "新标题"
}
```

**响应**
```json
{
  "code": 0,
  "message": "更新成功",
  "data": {
    "sessionId": "chat_xxx",
    "title": "新标题"
  }
}
```

---

### 1.4 删除会话

**请求**
```
DELETE /api/ai/chat/sessions/:sessionId
```

**响应**
```json
{
  "code": 0,
  "message": "删除成功"
}
```

---

### 1.5 清空所有会话

**请求**
```
DELETE /api/ai/chat/sessions
```

**响应**
```json
{
  "code": 0,
  "message": "清空成功",
  "data": {
    "deletedCount": 15
  }
}
```

---

## 二、消息管理

### 2.1 发送消息（核心接口）

**请求**
```
POST /api/ai/chat/messages
```

**参数**
```json
{
  "sessionId": "chat_xxx",        // 必填，会话ID
  "content": "你好",               // 消息内容
  "attachmentIds": [1, 2]         // 可选，附件ID数组
}
```

**说明**
- 如果`sessionId`不存在，会自动创建会话
- 上传的图片会被AI识别分析
- 上传的文档(docx/pdf/txt)内容会被提取并发送给AI

**响应**
```json
{
  "code": 0,
  "data": {
    "userMessage": {
      "id": 101,
      "type": "user",
      "content": "请分析这份文档",
      "attachments": [
        {
          "id": 1,
          "fileName": "监理日志.docx",
          "fileType": "document",
          "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "fileUrl": "http://xxx/uploads/ai-chat/document/xxx.docx",
          "fileSize": 9796
        }
      ],
      "timestamp": "2024-11-29T10:30:00.000Z"
    },
    "aiMessage": {
      "id": 102,
      "type": "ai",
      "content": "好的，我已经分析了您上传的监理日志...",
      "attachments": [],
      "timestamp": "2024-11-29T10:30:05.000Z"
    }
  }
}
```

**说明**
- 返回的 `userMessage` 包含完整的附件信息（id、fileName、fileType、mimeType、fileUrl、fileSize）
- 返回的 `aiMessage` 的 `attachments` 通常为空数组

**前端示例**
```javascript
async function sendMessage(sessionId, content, attachmentIds = []) {
  const res = await request.post('/api/ai/chat/messages', {
    sessionId,
    content,
    attachmentIds
  })
  return res.data
}
```

---

### 2.2 获取消息历史

**请求**
```
GET /api/ai/chat/messages?sessionId=xxx&page=1&pageSize=50
```

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认50 |

**响应**
```json
{
  "code": 0,
  "data": {
    "sessionId": "chat_xxx",
    "list": [
      {
        "id": 101,
        "type": "user",
        "content": "请分析这份文档",
        "attachments": [
          {
            "id": 1,
            "fileName": "监理日志.docx",
            "fileType": "document",
            "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "fileUrl": "http://xxx/uploads/ai-chat/document/xxx.docx",
            "fileSize": 9796
          }
        ],
        "timestamp": "2024-11-29 10:00:00"
      },
      {
        "id": 102,
        "type": "ai",
        "content": "好的，我已经分析了您上传的监理日志...",
        "attachments": [],
        "timestamp": "2024-11-29 10:00:05"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1
  }
}
```

**说明**
- 每条消息都包含 `attachments` 数组
- 用户消息可能有附件（上传的文件），AI消息通常为空
- 附件信息包括：id、fileName、fileType、mimeType、fileUrl、fileSize
- 前端可以根据 `fileType` 和 `mimeType` 判断文件类型并显示相应的图标或预览

---

### 2.3 删除消息

**请求**
```
DELETE /api/ai/chat/messages/:messageId
```

**响应**
```json
{
  "code": 0,
  "message": "删除成功"
}
```

---

## 三、文件上传

### 3.1 上传文件

**请求**
```
POST /api/ai/chat/upload
Content-Type: multipart/form-data
```

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| files | File[] | 是 | 文件数组，最多9个 |
| sessionId | string | 否 | 会话ID |

**支持的文件类型**

| 类型 | 格式 | 最大大小 | AI处理方式 |
|------|------|----------|-----------|
| 图片 | jpg, png, gif, webp | 10MB | 图片识别 |
| Word | docx | 20MB | 提取文本 |
| PDF | pdf | 20MB | 提取文本 |
| 文本 | txt, md, csv | 20MB | 直接读取 |

**响应**
```json
{
  "code": 0,
  "message": "上传成功",
  "data": {
    "files": [
      {
        "id": 1,
        "fileName": "监理日志.docx",
        "fileType": "document",
        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "fileUrl": "http://xxx/uploads/ai-chat/document/xxx.docx",
        "fileSize": 9796
      }
    ],
    "count": 1
  }
}
```

**前端示例（微信小程序）**
```javascript
async function uploadFile(filePath) {
  const res = await wx.uploadFile({
    url: baseUrl + '/api/ai/chat/upload',
    filePath: filePath,
    name: 'files',
    header: {
      'Authorization': 'Bearer ' + token
    }
  })
  return JSON.parse(res.data)
}
```

**前端示例（Web）**
```javascript
async function uploadFiles(files) {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  
  const res = await fetch('/api/ai/chat/upload', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    body: formData
  })
  return await res.json()
}
```

---

### 3.2 获取附件列表

**请求**
```
GET /api/ai/chat/attachments?sessionId=xxx&messageId=101
```

**参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |
| messageId | number | 否 | 消息ID，用于获取特定消息的附件 |

**说明**
- 如果不指定 `messageId`，返回会话中所有附件（包括未关联消息的附件）
- 如果指定 `messageId`，只返回该消息关联的附件

**响应**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "messageId": 101,
        "fileName": "文档.docx",
        "fileType": "document",
        "mimeType": "application/...",
        "fileUrl": "http://xxx/xxx.docx",
        "fileSize": 9796,
        "createdAt": "2024-11-29 10:00:00"
      }
    ]
  }
}
```

---

### 3.3 删除附件

**请求**
```
DELETE /api/ai/chat/attachments/:attachmentId
```

**响应**
```json
{
  "code": 0,
  "message": "删除成功"
}
```

---

## 四、完整使用流程

### 流程1：普通对话

```javascript
// 1. 创建会话
const sessionId = await createSession('新对话')

// 2. 发送消息
const result = await sendMessage(sessionId, '你好')

// 3. 显示AI回复
console.log(result.aiMessage.content)
```

### 流程2：上传文档并询问

```javascript
// 1. 上传文档
const uploadRes = await uploadFile('监理日志.docx')
const attachmentId = uploadRes.data.files[0].id

// 2. 发送消息并附带文档
const result = await sendMessage(
  sessionId, 
  '请分析这份监理日志的主要内容',
  [attachmentId]
)

// 3. AI会读取文档内容并回复分析结果
console.log(result.aiMessage.content)
```

### 流程3：上传图片并识别

```javascript
// 1. 上传图片
const uploadRes = await uploadFile('工地照片.jpg')
const attachmentId = uploadRes.data.files[0].id

// 2. 发送消息并附带图片
const result = await sendMessage(
  sessionId, 
  '请描述这张图片的内容',
  [attachmentId]
)

// 3. AI会识别图片并回复
console.log(result.aiMessage.content)
```

---

## 五、错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权，Token无效或过期 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 六、注意事项

1. **会话自动创建**：发送消息时如果sessionId不存在会自动创建会话
2. **文档大小限制**：单个文件最大20MB，图片最大10MB
3. **文件数量限制**：单次上传最多9个文件
4. **AI响应时间**：复杂问题或大文档可能需要10-30秒响应
5. **文档内容截断**：过长的文档内容可能会被截断以适应AI模型限制
6. **附件显示**：
   - 获取消息历史时，每条消息都会返回完整的附件信息
   - 如果消息中没有attachments字段，系统会自动从ai_chat_attachments表查询
   - 前端应该始终检查 `attachments` 数组，即使为空也应该显示为空数组
7. **未发送的附件**：
   - 用户上传文件后如果没有发送消息，附件会保存在数据库中
   - 可以通过 `GET /api/ai/chat/attachments?sessionId=xxx` 获取会话中的所有附件
   - 前端可以在消息输入框下方显示这些未关联的附件

---

## 七、前端实现建议

### 7.1 显示消息中的附件

```javascript
// 在渲染消息时，检查并显示附件
function renderMessage(message) {
  let html = `<div class="message message-${message.type}">
    <div class="content">${message.content}</div>`
  
  // 显示附件
  if (message.attachments && message.attachments.length > 0) {
    html += '<div class="attachments">'
    message.attachments.forEach(att => {
      html += `<div class="attachment">
        <a href="${att.fileUrl}" download="${att.fileName}">
          <span class="icon">${getFileIcon(att.fileType)}</span>
          <span class="name">${att.fileName}</span>
          <span class="size">${formatFileSize(att.fileSize)}</span>
        </a>
      </div>`
    })
    html += '</div>'
  }
  
  html += '</div>'
  return html
}

// 获取文件类型图标
function getFileIcon(fileType) {
  const icons = {
    'document': '📄',
    'image': '🖼️',
    'audio': '🎵',
    'video': '🎬'
  }
  return icons[fileType] || '📎'
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
```

### 7.2 显示未发送的附件

```javascript
// 获取会话中的所有附件（包括未关联消息的）
async function loadSessionAttachments(sessionId) {
  const res = await request.get('/api/ai/chat/attachments', {
    params: { sessionId }
  })
  
  // 过滤出未关联消息的附件（messageId为0或null）
  const unsentAttachments = res.data.list.filter(att => !att.messageId)
  
  // 在输入框下方显示这些附件
  renderUnsentAttachments(unsentAttachments)
}

// 渲染未发送的附件
function renderUnsentAttachments(attachments) {
  if (attachments.length === 0) return
  
  let html = '<div class="unsent-attachments"><strong>待发送的文件：</strong>'
  attachments.forEach(att => {
    html += `<div class="attachment-item">
      <span>${att.fileName}</span>
      <button onclick="removeAttachment(${att.id})">删除</button>
    </div>`
  })
  html += '</div>'
  
  document.getElementById('attachmentContainer').innerHTML = html
}
```

### 7.3 完整的消息发送流程

```javascript
async function sendMessageWithAttachments(sessionId, content) {
  // 1. 获取已上传的附件ID
  const attachmentsRes = await request.get('/api/ai/chat/attachments', {
    params: { sessionId }
  })
  
  const attachmentIds = attachmentsRes.data.list
    .filter(att => !att.messageId) // 只选择未关联的附件
    .map(att => att.id)
  
  // 2. 发送消息
  const result = await request.post('/api/ai/chat/messages', {
    sessionId,
    content,
    attachmentIds
  })
  
  // 3. 显示用户消息和附件
  displayMessage(result.data.userMessage)
  
  // 4. 显示AI回复
  displayMessage(result.data.aiMessage)
  
  // 5. 清空未发送附件列表
  document.getElementById('attachmentContainer').innerHTML = ''
}
```

---

## 八、云托管域名

- **生产环境**：`https://api.yimengpl.com`
- **本地开发**：`http://localhost:3000`

---

## 九、更新日志

### v2.1 (2024-11-29) - 附件显示修复
- **修复**：获取消息历史时现在能正确显示附件信息
- **改进**：消息返回格式统一，包含完整的附件元数据（mimeType、fileSize）
- **新增**：获取附件列表API支持按messageId过滤
- **新增**：前端实现建议，包括附件显示和未发送附件处理
- **新增**：详细的故障排查和注意事项说明

### v2.0 (2024-11-29)
- 新增会话管理功能
- 新增文件上传支持
- 新增文档解析（docx/pdf/txt）
- 新增图片识别功能
- 优化消息存储结构
