# AI聊天 v2 API 文档

## 概述

AI聊天v2版本在原有功能基础上进行了完整重写，新增以下功能：

1. **完整的会话管理** - 创建、列表、重命名、删除会话
2. **聊天记录保存** - 所有消息自动保存到数据库
3. **文件上传支持** - 支持图片和文档上传
4. **多模态对话** - AI可以识别和理解图片内容

## 基础路径

```
/api/ai-chat-v2
```

## 认证

所有接口需要在请求头中携带 JWT Token：

```
Authorization: Bearer <token>
```

---

## 会话管理 API

### 1. 创建新会话

**接口地址：** `POST /api/ai-chat-v2/sessions`

**请求体：**
```json
{
  "title": "新对话"  // 可选，默认"新对话"
}
```

**响应示例：**
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

---

### 2. 获取会话列表

**接口地址：** `GET /api/ai-chat-v2/sessions`

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20，最大100 |
| keyword | string | 否 | 搜索关键词（标题或消息内容） |

**响应示例：**
```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": 1,
        "sessionId": "chat_1732867200000_abc123",
        "title": "关于监理日志的问题",
        "lastMessage": "好的，我来帮您解答...",
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

### 3. 获取会话详情

**接口地址：** `GET /api/ai-chat-v2/sessions/:sessionId`

**响应示例：**
```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "id": 1,
    "sessionId": "chat_1732867200000_abc123",
    "title": "关于监理日志的问题",
    "lastMessage": "好的，我来帮您解答...",
    "messageCount": 10,
    "isArchived": 0,
    "createdAt": "2024-11-29 10:00:00",
    "updatedAt": "2024-11-29 11:30:00"
  }
}
```

---

### 4. 更新会话（重命名）

**接口地址：** `PUT /api/ai-chat-v2/sessions/:sessionId`

**请求体：**
```json
{
  "title": "新的会话标题"
}
```

**响应示例：**
```json
{
  "code": 0,
  "message": "更新成功",
  "data": {
    "sessionId": "chat_1732867200000_abc123",
    "title": "新的会话标题"
  }
}
```

---

### 5. 删除会话

**接口地址：** `DELETE /api/ai-chat-v2/sessions/:sessionId`

**响应示例：**
```json
{
  "code": 0,
  "message": "删除成功",
  "data": {}
}
```

---

### 6. 清空所有会话

**接口地址：** `DELETE /api/ai-chat-v2/sessions`

**响应示例：**
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

## 消息 API

### 1. 发送消息

**接口地址：** `POST /api/ai-chat-v2/messages`

**请求体：**
```json
{
  "sessionId": "chat_1732867200000_abc123",  // 必填，会话ID
  "content": "请帮我分析这张图片",              // 消息内容
  "attachmentIds": [1, 2]                     // 可选，附件ID数组
}
```

**说明：**
- 如果会话不存在，会自动创建新会话
- 如果有图片附件，会使用多模态AI进行图片识别
- `content` 和 `attachmentIds` 至少需要一个

**响应示例：**
```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "userMessage": {
      "id": 101,
      "type": "user",
      "content": "请帮我分析这张图片",
      "attachments": [
        {
          "id": 1,
          "fileName": "工地照片.jpg",
          "fileType": "image",
          "fileUrl": "http://xxx/uploads/ai-chat/image/xxx.jpg"
        }
      ],
      "timestamp": "2024-11-29T10:30:00.000Z"
    },
    "aiMessage": {
      "id": 102,
      "type": "ai",
      "content": "这是一张工地施工现场的照片...",
      "timestamp": "2024-11-29T10:30:05.000Z"
    }
  }
}
```

---

### 2. 获取消息历史

**接口地址：** `GET /api/ai-chat-v2/messages`

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认50，最大100 |

**响应示例：**
```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "sessionId": "chat_1732867200000_abc123",
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

### 3. 删除单条消息

**接口地址：** `DELETE /api/ai-chat-v2/messages/:messageId`

**响应示例：**
```json
{
  "code": 0,
  "message": "删除成功",
  "data": {}
}
```

---

## 文件上传 API

### 1. 上传文件

**接口地址：** `POST /api/ai-chat-v2/upload`

**请求方式：** `multipart/form-data`

**请求参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| files | File[] | 是 | 文件数组，最多9个 |
| sessionId | string | 否 | 会话ID |

**支持的文件类型：**
- **图片：** jpg, jpeg, png, gif, webp, bmp（最大10MB）
- **文档：** pdf, doc, docx, xls, xlsx, txt, csv, md（最大20MB）
- **音频：** mp3, wav, ogg（最大50MB）

**响应示例：**
```json
{
  "code": 0,
  "message": "上传成功",
  "data": {
    "files": [
      {
        "id": 1,
        "fileName": "工地照片.jpg",
        "fileType": "image",
        "mimeType": "image/jpeg",
        "fileUrl": "http://xxx/uploads/ai-chat/image/xxx.jpg",
        "fileSize": 1024000
      }
    ],
    "count": 1
  }
}
```

---

### 2. 获取会话附件列表

**接口地址：** `GET /api/ai-chat-v2/attachments`

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |

**响应示例：**
```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": 1,
        "fileName": "工地照片.jpg",
        "fileType": "image",
        "mimeType": "image/jpeg",
        "fileUrl": "http://xxx/uploads/ai-chat/image/xxx.jpg",
        "fileSize": 1024000,
        "createdAt": "2024-11-29 10:00:00"
      }
    ]
  }
}
```

---

### 3. 删除附件

**接口地址：** `DELETE /api/ai-chat-v2/attachments/:attachmentId`

**响应示例：**
```json
{
  "code": 0,
  "message": "删除成功",
  "data": {}
}
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权，请先登录 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 数据库表结构

### ai_chat_sessions（会话表）

```sql
CREATE TABLE ai_chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  title VARCHAR(200) DEFAULT '新对话',
  last_message TEXT,
  message_count INT DEFAULT 0,
  is_archived TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### ai_chat_attachments（附件表）

```sql
CREATE TABLE ai_chat_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100),
  message_id INT,
  user_id INT NOT NULL,
  file_name VARCHAR(500),
  file_type VARCHAR(50),
  mime_type VARCHAR(100),
  file_url VARCHAR(1000),
  file_size INT,
  thumbnail_url VARCHAR(1000),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 使用示例

### 完整对话流程

```javascript
// 1. 创建会话
const session = await fetch('/api/ai-chat-v2/sessions', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ title: '新对话' })
}).then(r => r.json())

const sessionId = session.data.sessionId

// 2. 上传图片
const formData = new FormData()
formData.append('files', imageFile)
formData.append('sessionId', sessionId)

const uploadResult = await fetch('/api/ai-chat-v2/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
}).then(r => r.json())

const attachmentIds = uploadResult.data.files.map(f => f.id)

// 3. 发送消息（带图片）
const messageResult = await fetch('/api/ai-chat-v2/messages', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    content: '请分析这张图片',
    attachmentIds
  })
}).then(r => r.json())

console.log('AI回复:', messageResult.data.aiMessage.content)

// 4. 获取历史消息
const history = await fetch(`/api/ai-chat-v2/messages?sessionId=${sessionId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json())

console.log('消息历史:', history.data.list)
```

---

## 配置说明

如需启用图片识别功能，请在 `.env` 文件中配置视觉模型：

```env
# 豆包AI视觉模型（可选，如不配置则使用普通模型）
DOUBAO_VISION_ENDPOINT_ID=your-vision-endpoint-id
```

---

## 更新日志

### v2.0.0 (2024-11-29)
- 完整重写AI聊天功能
- 新增会话管理（创建、列表、重命名、删除）
- 新增文件上传支持（图片、文档）
- 新增多模态对话（图片识别）
- 优化消息存储结构
