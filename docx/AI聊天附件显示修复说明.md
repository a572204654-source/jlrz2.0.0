# AI聊天附件显示修复说明

## 问题描述

用户在AI对话界面上传文件后，对话历史中不显示文件信息。

## 根本原因

1. **获取消息历史时的问题**：
   - 消息中的 `attachments` 字段存储的是JSON格式
   - 当消息中没有 `attachments` 字段时，系统没有从 `ai_chat_attachments` 表查询附件信息
   - 导致前端无法显示已上传的文件

2. **返回格式不统一**：
   - 发送消息时返回的附件信息不完整（缺少 `mimeType` 和 `fileSize`）
   - 获取消息历史时返回的附件信息格式不一致

## 修复内容

### 1. 后端修复 (routes/ai-chat.js)

#### 1.1 修复获取消息历史API
```javascript
// 改进前：只解析消息中的attachments JSON
// 改进后：如果消息中没有attachments，从ai_chat_attachments表查询
const formattedMessages = await Promise.all(messages.map(async (msg) => {
  let attachments = []
  
  // 首先尝试解析消息中存储的attachments JSON
  if (msg.attachments) {
    try {
      attachments = JSON.parse(msg.attachments)
    } catch (e) {
      console.error('解析附件JSON失败:', msg.id, e.message)
    }
  }
  
  // 如果消息中没有attachments，从ai_chat_attachments表查询该消息的附件
  if (attachments.length === 0 && msg.id) {
    try {
      const dbAttachments = await query(
        `SELECT ... FROM ai_chat_attachments WHERE message_id = ? AND user_id = ?`,
        [msg.id, userId]
      )
      attachments = dbAttachments
    } catch (e) {
      console.error('查询消息附件失败:', msg.id, e.message)
    }
  }
  
  return { ...msg, attachments }
}))
```

#### 1.2 统一附件信息格式
- 保存消息时：添加 `mimeType` 和 `fileSize` 字段
- 返回消息时：确保所有附件都包含完整的元数据
- 获取附件列表时：返回 `messageId` 字段，便于前端区分已关联和未关联的附件

#### 1.3 改进获取附件列表API
```javascript
// 支持按messageId过滤
GET /api/ai/chat/attachments?sessionId=xxx&messageId=101
```

### 2. 文档更新 (docx/AI聊天前端对接文档.md)

#### 2.1 更新API文档
- 完善消息响应格式说明
- 添加附件字段的详细说明
- 更新获取附件列表API文档

#### 2.2 添加前端实现建议
- 如何正确显示消息中的附件
- 如何显示未发送的附件
- 完整的消息发送流程示例

#### 2.3 添加故障排查说明
- 附件显示的常见问题
- 未发送附件的处理方式
- 最佳实践建议

## 关键改进点

### 1. 双重查询机制
```
消息历史查询流程：
1. 查询ai_chat_logs表获取消息
2. 检查消息中的attachments JSON字段
3. 如果为空，从ai_chat_attachments表查询
4. 返回完整的附件信息
```

### 2. 完整的附件元数据
```json
{
  "id": 1,
  "fileName": "监理日志.docx",
  "fileType": "document",
  "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "fileUrl": "http://xxx/uploads/ai-chat/document/xxx.docx",
  "fileSize": 9796
}
```

### 3. 未发送附件的支持
- 用户上传文件但未发送消息时，附件会保存在数据库中
- `messageId` 为 0 或 null 表示未关联消息
- 前端可以通过 `GET /api/ai/chat/attachments?sessionId=xxx` 获取所有附件
- 前端可以在消息输入框下方显示这些未发送的附件

## 前端实现建议

### 1. 显示消息中的附件
```javascript
function renderMessage(message) {
  // 检查attachments数组
  if (message.attachments && message.attachments.length > 0) {
    // 显示每个附件的下载链接和文件信息
  }
}
```

### 2. 显示未发送的附件
```javascript
async function loadSessionAttachments(sessionId) {
  const res = await request.get('/api/ai/chat/attachments', {
    params: { sessionId }
  })
  
  // 过滤出未关联消息的附件
  const unsentAttachments = res.data.list.filter(att => !att.messageId)
}
```

### 3. 完整的消息发送流程
```javascript
async function sendMessageWithAttachments(sessionId, content) {
  // 1. 获取已上传的附件ID
  // 2. 发送消息
  // 3. 显示用户消息和附件
  // 4. 显示AI回复
  // 5. 清空未发送附件列表
}
```

## 测试清单

- [ ] 上传文件后，获取消息历史能显示附件信息
- [ ] 发送消息时，返回的附件包含完整的元数据
- [ ] 获取消息历史时，附件信息格式一致
- [ ] 上传文件但未发送消息时，能通过API获取这些附件
- [ ] 前端能正确解析和显示附件信息
- [ ] 前端能显示未发送的附件列表

## 版本信息

- **修复版本**：v2.1 (2024-11-29)
- **涉及文件**：
  - routes/ai-chat.js
  - docx/AI聊天前端对接文档.md

## 后续优化建议

1. **性能优化**：
   - 考虑添加缓存机制，减少数据库查询
   - 对于大量附件的会话，考虑分页加载

2. **功能扩展**：
   - 支持附件预览（图片缩略图、文档预览）
   - 支持批量删除附件
   - 支持附件搜索

3. **用户体验**：
   - 添加上传进度条
   - 支持拖拽上传
   - 显示上传失败的原因

## 相关API端点

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | /api/ai/chat/messages | 发送消息（支持附件） |
| GET | /api/ai/chat/messages | 获取消息历史（包含附件） |
| POST | /api/ai/chat/upload | 上传文件 |
| GET | /api/ai/chat/attachments | 获取附件列表 |
| DELETE | /api/ai/chat/attachments/:id | 删除附件 |


