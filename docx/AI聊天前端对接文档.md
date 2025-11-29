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
      "content": "你好",
      "attachments": [
        {
          "id": 1,
          "fileName": "文档.docx",
          "fileType": "document",
          "fileUrl": "http://xxx/uploads/xxx.docx"
        }
      ],
      "timestamp": "2024-11-29T10:30:00.000Z"
    },
    "aiMessage": {
      "id": 102,
      "type": "ai",
      "content": "你好！有什么可以帮助您的吗？",
      "timestamp": "2024-11-29T10:30:05.000Z"
    }
  }
}
```

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
        "content": "你好",
        "attachments": [],
        "timestamp": "2024-11-29 10:00:00"
      },
      {
        "id": 102,
        "type": "ai",
        "content": "你好！有什么可以帮助您的吗？",
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
GET /api/ai/chat/attachments?sessionId=xxx
```

**响应**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
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

---

## 七、云托管域名

- **生产环境**：`https://api.yimengpl.com`
- **本地开发**：`http://localhost:3000`

---

## 八、更新日志

### v2.0 (2024-11-29)
- 新增会话管理功能
- 新增文件上传支持
- 新增文档解析（docx/pdf/txt）
- 新增图片识别功能
- 优化消息存储结构
