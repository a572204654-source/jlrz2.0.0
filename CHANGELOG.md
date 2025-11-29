# 变更日志 - AI对话附件显示功能

## [2.1] - 2024-11-29

### 修复
- **修复了消息历史中不显示附件的问题**
  - 改进了 `GET /api/ai/chat/messages` 端点
  - 添加了双重查询机制：先查询消息的attachments JSON字段，如果为空则从ai_chat_attachments表查询
  - 确保返回完整的附件信息

- **修复了附件信息格式不统一的问题**
  - 统一了所有API返回的附件格式
  - 添加了缺失的元数据字段（mimeType、fileSize）

### 改进
- **改进了消息发送API**
  - 保存消息时现在包含完整的附件元数据
  - 返回响应时包含完整的附件信息
  - AI消息的attachments字段现在返回空数组而不是null

- **改进了附件列表API**
  - 添加了 `messageId` 查询参数支持
  - 返回结果中现在包含 `messageId` 字段
  - 前端可以通过messageId区分已发送和未发送的附件

### 新增
- **新增了详细的修复说明文档**
  - `docx/AI聊天附件显示修复说明.md`
  - 包含问题描述、根本原因、修复内容等

- **新增了前端快速参考指南**
  - `docx/AI聊天附件功能快速参考.md`
  - 包含快速开始、常用场景、数据结构等

- **新增了前端实现指南**
  - `IMPLEMENTATION_GUIDE.md`
  - 包含完整的实现步骤和代码示例

- **新增了修复总结文档**
  - `BUGFIX_SUMMARY.md`
  - 包含修复内容、关键改进、测试清单等

### 文档
- 更新了 `docx/AI聊天前端对接文档.md`
  - 更新了消息响应格式示例
  - 添加了附件字段的详细说明
  - 添加了前端实现建议
  - 添加了故障排查说明
  - 更新了版本日志

### 技术细节

#### 后端修改
```javascript
// routes/ai-chat.js - GET /messages 端点
// 改进前：只能解析消息中的attachments JSON
// 改进后：支持从ai_chat_attachments表查询

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

#### 附件格式统一
```javascript
// 改进前
{
  id: 1,
  fileName: "文档.docx",
  fileType: "document",
  fileUrl: "http://xxx/xxx.docx"
}

// 改进后
{
  id: 1,
  fileName: "文档.docx",
  fileType: "document",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  fileUrl: "http://xxx/xxx.docx",
  fileSize: 9796
}
```

### 兼容性
- ✅ 向后兼容
- ✅ 无需数据库迁移
- ✅ 无需前端代码修改（可选优化）

### 已知问题
- 无

### 后续计划
- [ ] 添加附件预览功能
- [ ] 支持批量删除附件
- [ ] 添加上传进度条
- [ ] 支持拖拽上传

---

## [2.0] - 2024-11-29

### 新增
- 新增会话管理功能
- 新增文件上传支持
- 新增文档解析（docx/pdf/txt）
- 新增图片识别功能
- 优化消息存储结构

### 文档
- 新增 `docx/AI聊天前端对接文档.md`
- 新增 `docx/AI聊天v2-API文档.md`

---

## 修改文件清单

### 修改的文件
- `routes/ai-chat.js` - 改进消息查询、统一附件格式、增强API

### 新增的文件
- `docx/AI聊天附件显示修复说明.md` - 详细修复说明
- `docx/AI聊天附件功能快速参考.md` - 快速参考指南
- `BUGFIX_SUMMARY.md` - 修复总结
- `IMPLEMENTATION_GUIDE.md` - 前端实现指南
- `CHECKLIST.md` - 检查清单
- `README_BUGFIX.md` - 修复完整总结
- `CHANGELOG.md` - 本文件

### 更新的文件
- `docx/AI聊天前端对接文档.md` - 更新API文档和实现建议

---

## 升级指南

### 对于后端开发者
1. 更新 `routes/ai-chat.js` 文件
2. 无需数据库迁移
3. 无需重启服务（可选）

### 对于前端开发者
1. 参考 `IMPLEMENTATION_GUIDE.md` 实现附件显示
2. 或参考 `docx/AI聊天附件功能快速参考.md` 快速集成
3. 建议添加未发送附件的显示

---

## 相关资源

- [修复完整总结](README_BUGFIX.md)
- [修复说明](docx/AI聊天附件显示修复说明.md)
- [快速参考](docx/AI聊天附件功能快速参考.md)
- [前端实现指南](IMPLEMENTATION_GUIDE.md)
- [API文档](docx/AI聊天前端对接文档.md)

---

**最后更新**：2024-11-29  
**维护者**：开发团队


