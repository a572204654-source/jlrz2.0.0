# AI对话附件显示功能 - 前端实现指南

## 概述

本指南帮助前端开发者快速集成和实现AI对话的附件显示功能。

## 核心功能

1. **文件上传**：支持图片、文档等多种文件类型
2. **消息附件显示**：在对话历史中显示已发送的附件
3. **未发送附件管理**：显示已上传但未发送的附件
4. **附件下载**：支持点击下载附件

## API端点总览

| 功能 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 上传文件 | POST | /api/ai/chat/upload | 上传一个或多个文件 |
| 发送消息 | POST | /api/ai/chat/messages | 发送消息，可附带附件 |
| 获取消息 | GET | /api/ai/chat/messages | 获取消息历史，包含附件 |
| 获取附件 | GET | /api/ai/chat/attachments | 获取会话的所有附件 |
| 删除附件 | DELETE | /api/ai/chat/attachments/:id | 删除指定附件 |

## 前端实现步骤

### 第1步：初始化会话

```javascript
// 创建新会话或使用现有会话
const sessionId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12)

// 或者从服务器获取会话列表
async function getOrCreateSession() {
  const res = await fetch('/api/ai/chat/sessions', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  const data = await res.json()
  return data.data.list[0]?.sessionId || createNewSession()
}
```

### 第2步：实现文件上传

```javascript
// HTML
<input type="file" id="fileInput" multiple accept=".jpg,.png,.docx,.pdf,.txt">
<button onclick="handleFileUpload()">上传文件</button>
<div id="uploadedFiles"></div>

// JavaScript
async function handleFileUpload() {
  const fileInput = document.getElementById('fileInput')
  const files = fileInput.files
  
  if (files.length === 0) return
  
  const formData = new FormData()
  Array.from(files).forEach(file => {
    formData.append('files', file)
  })
  
  try {
    const res = await fetch('/api/ai/chat/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      body: formData
    })
    
    const data = await res.json()
    if (data.code === 0) {
      displayUploadedFiles(data.data.files)
      fileInput.value = '' // 清空输入
    } else {
      alert('上传失败：' + data.message)
    }
  } catch (error) {
    console.error('上传错误:', error)
    alert('上传失败，请重试')
  }
}

function displayUploadedFiles(files) {
  let html = '<div class="uploaded-files"><strong>已上传文件：</strong>'
  files.forEach(file => {
    html += `
      <div class="file-item">
        <span>${file.fileName}</span>
        <span class="size">${formatFileSize(file.fileSize)}</span>
      </div>
    `
  })
  html += '</div>'
  document.getElementById('uploadedFiles').innerHTML = html
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}
```

### 第3步：实现消息发送

```javascript
// HTML
<div id="messageContainer"></div>
<input type="text" id="messageInput" placeholder="输入消息...">
<button onclick="sendMessage()">发送</button>

// JavaScript
async function sendMessage() {
  const content = document.getElementById('messageInput').value
  if (!content.trim()) return
  
  try {
    // 1. 获取待发送的附件
    const attachmentsRes = await fetch(
      `/api/ai/chat/attachments?sessionId=${sessionId}`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    )
    const attachmentsData = await attachmentsRes.json()
    const attachmentIds = attachmentsData.data.list
      .filter(att => !att.messageId)
      .map(att => att.id)
    
    // 2. 发送消息
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
    
    const data = await res.json()
    if (data.code === 0) {
      // 3. 显示用户消息
      displayMessage(data.data.userMessage)
      
      // 4. 显示AI回复
      displayMessage(data.data.aiMessage)
      
      // 5. 清空输入框和附件列表
      document.getElementById('messageInput').value = ''
      document.getElementById('uploadedFiles').innerHTML = ''
    } else {
      alert('发送失败：' + data.message)
    }
  } catch (error) {
    console.error('发送错误:', error)
    alert('发送失败，请重试')
  }
}

function displayMessage(message) {
  const container = document.getElementById('messageContainer')
  let html = `
    <div class="message message-${message.type}">
      <div class="content">${escapeHtml(message.content)}</div>
  `
  
  // 显示附件
  if (message.attachments && message.attachments.length > 0) {
    html += '<div class="attachments">'
    message.attachments.forEach(att => {
      html += `
        <div class="attachment">
          <a href="${att.fileUrl}" download="${att.fileName}">
            <span class="icon">${getFileIcon(att.fileType)}</span>
            <span class="name">${att.fileName}</span>
            <span class="size">${formatFileSize(att.fileSize)}</span>
          </a>
        </div>
      `
    })
    html += '</div>'
  }
  
  html += '</div>'
  container.innerHTML += html
  container.scrollTop = container.scrollHeight // 滚动到底部
}

function getFileIcon(fileType) {
  const icons = {
    'document': '📄',
    'image': '🖼️',
    'audio': '🎵',
    'video': '🎬'
  }
  return icons[fileType] || '📎'
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
```

### 第4步：加载消息历史

```javascript
async function loadMessages(page = 1) {
  try {
    const res = await fetch(
      `/api/ai/chat/messages?sessionId=${sessionId}&page=${page}&pageSize=50`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    )
    
    const data = await res.json()
    if (data.code === 0) {
      data.data.list.forEach(message => {
        displayMessage(message)
      })
    }
  } catch (error) {
    console.error('加载消息失败:', error)
  }
}

// 页面加载时调用
window.addEventListener('load', () => {
  loadMessages()
})
```

## 完整的HTML示例

```html
<!DOCTYPE html>
<html>
<head>
  <title>AI对话</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    #messageContainer {
      border: 1px solid #ddd;
      height: 400px;
      overflow-y: auto;
      padding: 10px;
      margin-bottom: 20px;
      background: #f9f9f9;
    }
    
    .message {
      margin-bottom: 15px;
      padding: 10px;
      border-radius: 5px;
    }
    
    .message-user {
      background: #e3f2fd;
      text-align: right;
    }
    
    .message-ai {
      background: #f5f5f5;
      text-align: left;
    }
    
    .attachments {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
    }
    
    .attachment {
      margin: 5px 0;
      padding: 5px;
      background: white;
      border-radius: 3px;
    }
    
    .attachment a {
      text-decoration: none;
      color: #1976d2;
    }
    
    .attachment a:hover {
      text-decoration: underline;
    }
    
    #uploadedFiles {
      margin-bottom: 10px;
      padding: 10px;
      background: #fff3e0;
      border-radius: 5px;
    }
    
    .file-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }
    
    .input-area {
      display: flex;
      gap: 10px;
    }
    
    input[type="text"] {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    
    button {
      padding: 10px 20px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
    
    button:hover {
      background: #1565c0;
    }
  </style>
</head>
<body>
  <h1>AI对话</h1>
  
  <div id="messageContainer"></div>
  
  <div id="uploadedFiles"></div>
  
  <div class="input-area">
    <input type="file" id="fileInput" multiple accept=".jpg,.png,.docx,.pdf,.txt">
    <button onclick="handleFileUpload()">上传</button>
  </div>
  
  <div class="input-area">
    <input type="text" id="messageInput" placeholder="输入消息...">
    <button onclick="sendMessage()">发送</button>
  </div>
  
  <script>
    // 这里放入上面的JavaScript代码
  </script>
</body>
</html>
```

## 常见问题

### Q1: 如何处理上传失败？
```javascript
if (data.code !== 0) {
  const errorMessages = {
    400: '参数错误',
    401: '未授权，请重新登录',
    413: '文件过大',
    415: '不支持的文件类型'
  }
  alert(errorMessages[data.code] || data.message)
}
```

### Q2: 如何显示上传进度？
```javascript
const xhr = new XMLHttpRequest()
xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percentComplete = (e.loaded / e.total) * 100
    console.log(percentComplete + '%')
  }
})
```

### Q3: 如何支持拖拽上传？
```javascript
const dropZone = document.getElementById('messageContainer')
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropZone.style.background = '#f0f0f0'
})
dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  const files = e.dataTransfer.files
  // 处理文件
})
```

## 最佳实践

1. **错误处理**：始终检查响应的 `code` 字段
2. **用户反馈**：显示加载状态和错误提示
3. **性能优化**：使用分页加载消息
4. **安全性**：验证文件类型和大小
5. **用户体验**：支持键盘快捷键（Enter发送）

## 支持的文件类型

| 类型 | 格式 | 最大大小 |
|------|------|----------|
| 图片 | jpg, png, gif, webp | 10MB |
| Word | docx | 20MB |
| PDF | pdf | 20MB |
| 文本 | txt, md, csv | 20MB |

## 相关资源

- [API文档](docx/AI聊天前端对接文档.md)
- [快速参考](docx/AI聊天附件功能快速参考.md)
- [修复说明](docx/AI聊天附件显示修复说明.md)


