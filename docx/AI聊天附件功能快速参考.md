# AI聊天附件功能快速参考

## 快速开始

### 1. 上传文件
```javascript
async function uploadFiles(sessionId, files) {
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
  // 返回: { code: 0, data: { files: [...], count: 1 } }
}
```

### 2. 发送消息（带附件）
```javascript
async function sendMessage(sessionId, content, attachmentIds = []) {
  const res = await fetch('/api/ai/chat/messages', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId,
      content,
      attachmentIds
    })
  })
  
  return await res.json()
  // 返回: { code: 0, data: { userMessage: {...}, aiMessage: {...} } }
}
```

### 3. 获取消息历史（包含附件）
```javascript
async function getMessages(sessionId, page = 1) {
  const res = await fetch(
    `/api/ai/chat/messages?sessionId=${sessionId}&page=${page}`,
    {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    }
  )
  
  return await res.json()
  // 返回: { code: 0, data: { list: [...], total: 10, ... } }
}
```

### 4. 获取会话的所有附件
```javascript
async function getAttachments(sessionId) {
  const res = await fetch(
    `/api/ai/chat/attachments?sessionId=${sessionId}`,
    {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    }
  )
  
  return await res.json()
  // 返回: { code: 0, data: { list: [...] } }
}
```

## 常用场景

### 场景1：显示消息中的附件
```javascript
function renderMessage(message) {
  let html = `<div class="message message-${message.type}">
    <p>${message.content}</p>`
  
  if (message.attachments && message.attachments.length > 0) {
    html += '<div class="attachments">'
    message.attachments.forEach(att => {
      html += `
        <div class="attachment">
          <a href="${att.fileUrl}" download="${att.fileName}">
            📎 ${att.fileName} (${formatSize(att.fileSize)})
          </a>
        </div>
      `
    })
    html += '</div>'
  }
  
  html += '</div>'
  return html
}

function formatSize(bytes) {
  const sizes = ['B', 'KB', 'MB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i]
}
```

### 场景2：显示未发送的附件
```javascript
async function showUnsentAttachments(sessionId) {
  const res = await getAttachments(sessionId)
  const unsentAttachments = res.data.list.filter(att => !att.messageId)
  
  if (unsentAttachments.length === 0) return
  
  let html = '<div class="unsent-attachments"><strong>待发送文件：</strong>'
  unsentAttachments.forEach(att => {
    html += `
      <div class="attachment-item">
        <span>${att.fileName}</span>
        <button onclick="removeAttachment(${att.id})">删除</button>
      </div>
    `
  })
  html += '</div>'
  
  document.getElementById('attachmentContainer').innerHTML = html
}
```

### 场景3：完整的消息发送流程
```javascript
async function handleSendMessage(sessionId, content) {
  try {
    // 1. 获取待发送的附件
    const attachmentsRes = await getAttachments(sessionId)
    const attachmentIds = attachmentsRes.data.list
      .filter(att => !att.messageId)
      .map(att => att.id)
    
    // 2. 发送消息
    const result = await sendMessage(sessionId, content, attachmentIds)
    
    if (result.code !== 0) {
      alert('发送失败：' + result.message)
      return
    }
    
    // 3. 显示用户消息
    displayMessage(result.data.userMessage)
    
    // 4. 显示AI回复
    displayMessage(result.data.aiMessage)
    
    // 5. 清空输入框和附件列表
    document.getElementById('messageInput').value = ''
    document.getElementById('attachmentContainer').innerHTML = ''
    
  } catch (error) {
    console.error('发送消息失败:', error)
    alert('发送失败，请重试')
  }
}
```

### 场景4：处理文件上传
```javascript
async function handleFileUpload(sessionId, event) {
  const files = event.target.files
  if (files.length === 0) return
  
  try {
    // 1. 上传文件
    const uploadRes = await uploadFiles(sessionId, Array.from(files))
    
    if (uploadRes.code !== 0) {
      alert('上传失败：' + uploadRes.message)
      return
    }
    
    // 2. 显示已上传的文件
    const attachmentIds = uploadRes.data.files.map(f => f.id)
    showUploadedFiles(uploadRes.data.files)
    
    // 3. 清空文件输入框
    event.target.value = ''
    
  } catch (error) {
    console.error('上传失败:', error)
    alert('上传失败，请重试')
  }
}

function showUploadedFiles(files) {
  let html = '<div class="uploaded-files"><strong>已上传：</strong>'
  files.forEach(file => {
    html += `
      <div class="file-item">
        <span>${file.fileName}</span>
        <span class="size">${formatSize(file.fileSize)}</span>
      </div>
    `
  })
  html += '</div>'
  
  document.getElementById('uploadedContainer').innerHTML = html
}
```

## 数据结构

### 消息对象
```javascript
{
  id: 101,
  type: 'user',              // 'user' 或 'ai'
  content: '请分析这份文档',
  attachments: [             // 附件数组
    {
      id: 1,
      fileName: '监理日志.docx',
      fileType: 'document',  // 'document', 'image', 'audio', 'video'
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileUrl: 'http://xxx/uploads/xxx.docx',
      fileSize: 9796
    }
  ],
  timestamp: '2024-11-29 10:00:00'
}
```

### 附件对象
```javascript
{
  id: 1,
  messageId: 101,            // 0 或 null 表示未关联消息
  fileName: '监理日志.docx',
  fileType: 'document',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  fileUrl: 'http://xxx/uploads/ai-chat/document/xxx.docx',
  fileSize: 9796,
  createdAt: '2024-11-29 10:00:00'
}
```

## 错误处理

```javascript
async function sendMessageSafely(sessionId, content, attachmentIds) {
  try {
    const result = await sendMessage(sessionId, content, attachmentIds)
    
    if (result.code === 0) {
      return result.data
    }
    
    // 处理不同的错误码
    switch (result.code) {
      case 400:
        throw new Error('参数错误：' + result.message)
      case 401:
        throw new Error('未授权，请重新登录')
      case 404:
        throw new Error('资源不存在')
      case 500:
        throw new Error('服务器错误，请稍后重试')
      default:
        throw new Error(result.message || '未知错误')
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    throw error
  }
}
```

## 最佳实践

1. **始终检查attachments数组**
   ```javascript
   if (message.attachments && message.attachments.length > 0) {
     // 显示附件
   }
   ```

2. **处理大文件**
   - 单个文件最大20MB
   - 图片最大10MB
   - 单次上传最多9个文件

3. **显示加载状态**
   ```javascript
   // 上传时显示进度
   // 发送消息时显示加载中
   // AI回复时显示思考中
   ```

4. **错误恢复**
   - 上传失败时允许重试
   - 发送失败时保留消息内容
   - 显示清晰的错误提示

5. **性能优化**
   - 使用分页加载消息
   - 缓存已加载的消息
   - 延迟加载附件预览

## 支持的文件类型

| 类型 | 格式 | 最大大小 | 用途 |
|------|------|----------|------|
| 图片 | jpg, png, gif, webp | 10MB | 图片识别 |
| Word | docx | 20MB | 文档分析 |
| PDF | pdf | 20MB | 文档分析 |
| 文本 | txt, md, csv | 20MB | 内容分析 |

## 常见问题

**Q: 上传文件后看不到附件？**
A: 检查是否调用了 `getAttachments()` 获取附件列表，或者检查消息中的 `attachments` 数组。

**Q: 发送消息时附件没有被发送给AI？**
A: 确保在 `sendMessage()` 时传入了正确的 `attachmentIds`。

**Q: 如何显示未发送的附件？**
A: 调用 `getAttachments(sessionId)` 并过滤 `messageId` 为空的附件。

**Q: 附件能预览吗？**
A: 可以通过 `fileUrl` 下载，图片可以直接显示，文档可以使用第三方预览库。


