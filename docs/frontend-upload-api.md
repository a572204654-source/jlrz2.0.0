# 前端文件上传对接文档

## 接口概览

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/upload/avatar` | POST | 上传用户头像 |
| `/api/upload/attachment` | POST | 上传通用附件 |
| `/api/upload/log-attachment` | POST | 上传监理日志附件 |
| `/api/upload/image` | POST | 上传图片（通用） |
| `/api/upload/cos-signature` | POST | 获取COS直传签名 |
| `/api/upload/:id` | DELETE | 删除已上传文件 |

---

## 1. 上传用户头像

### 请求

```
POST /api/upload/avatar
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 图片文件（JPG/PNG/GIF/WebP，最大5MB） |

### 响应

```json
{
  "code": 200,
  "message": "头像上传成功",
  "data": {
    "avatar": "https://xxx.cos.ap-guangzhou.myqcloud.com/avatars/2025/12/03/xxx.jpg",
    "fileName": "头像.jpg",
    "fileSize": 102400
  }
}
```

### 微信小程序示例

```javascript
// 选择并上传头像
async function uploadAvatar() {
  const res = await wx.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sizeType: ['compressed']
  })
  
  const tempFilePath = res.tempFiles[0].tempFilePath
  
  wx.showLoading({ title: '上传中...' })
  
  try {
    const uploadRes = await new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${BASE_URL}/api/upload/avatar`,
        filePath: tempFilePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${getToken()}`
        },
        success: (res) => resolve(JSON.parse(res.data)),
        fail: reject
      })
    })
    
    if (uploadRes.code === 200) {
      // 更新本地头像显示
      this.setData({ avatar: uploadRes.data.avatar })
      wx.showToast({ title: '上传成功' })
    } else {
      wx.showToast({ title: uploadRes.message, icon: 'none' })
    }
  } catch (error) {
    wx.showToast({ title: '上传失败', icon: 'none' })
  } finally {
    wx.hideLoading()
  }
}
```

---

## 2. 上传通用附件

### 请求

```
POST /api/upload/attachment
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| files | File[] | 是 | 文件数组（最多9个，单个最大20MB） |
| relatedType | string | 否 | 关联类型：log/project/work/chat/general |
| relatedId | number | 否 | 关联ID |

### 响应

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "files": [
      {
        "id": 1,
        "fileName": "文档.pdf",
        "fileUrl": "https://xxx.cos.ap-guangzhou.myqcloud.com/attachments/xxx.pdf",
        "fileSize": 204800,
        "mimeType": "application/pdf"
      }
    ],
    "count": 1
  }
}
```

### 微信小程序示例

```javascript
// 选择并上传多个附件
async function uploadAttachments(relatedType = 'general', relatedId = null) {
  const res = await wx.chooseMessageFile({
    count: 9,
    type: 'file'
  })
  
  const tempFiles = res.tempFiles
  
  wx.showLoading({ title: '上传中...' })
  
  const uploadedFiles = []
  
  for (const file of tempFiles) {
    try {
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${BASE_URL}/api/upload/attachment`,
          filePath: file.path,
          name: 'files',
          formData: {
            relatedType,
            relatedId: relatedId || ''
          },
          header: {
            'Authorization': `Bearer ${getToken()}`
          },
          success: (res) => resolve(JSON.parse(res.data)),
          fail: reject
        })
      })
      
      if (uploadRes.code === 200) {
        uploadedFiles.push(...uploadRes.data.files)
      }
    } catch (error) {
      console.error('上传失败:', file.name, error)
    }
  }
  
  wx.hideLoading()
  
  if (uploadedFiles.length > 0) {
    wx.showToast({ title: `成功上传 ${uploadedFiles.length} 个文件` })
  }
  
  return uploadedFiles
}
```

---

## 3. 上传监理日志附件

### 请求

```
POST /api/upload/log-attachment
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| files | File[] | 是 | 文件数组 |
| logId | number | 是 | 监理日志ID |

### 微信小程序示例

```javascript
// 上传监理日志附件
async function uploadLogAttachment(logId) {
  const res = await wx.chooseMedia({
    count: 9,
    mediaType: ['image']
  })
  
  wx.showLoading({ title: '上传中...' })
  
  const uploadedFiles = []
  
  for (const file of res.tempFiles) {
    try {
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${BASE_URL}/api/upload/log-attachment`,
          filePath: file.tempFilePath,
          name: 'files',
          formData: { logId },
          header: {
            'Authorization': `Bearer ${getToken()}`
          },
          success: (res) => resolve(JSON.parse(res.data)),
          fail: reject
        })
      })
      
      if (uploadRes.code === 200) {
        uploadedFiles.push(...uploadRes.data.files)
      }
    } catch (error) {
      console.error('上传失败:', error)
    }
  }
  
  wx.hideLoading()
  return uploadedFiles
}
```

---

## 4. AI聊天文件上传

已有接口：`POST /api/ai/chat/upload`

### 微信小程序示例

```javascript
// AI聊天上传文件
async function uploadChatFiles(sessionId) {
  const res = await wx.chooseMessageFile({
    count: 9,
    type: 'all'
  })
  
  wx.showLoading({ title: '上传中...' })
  
  const uploadedFiles = []
  
  for (const file of res.tempFiles) {
    try {
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${BASE_URL}/api/ai/chat/upload`,
          filePath: file.path,
          name: 'files',
          formData: { sessionId },
          header: {
            'Authorization': `Bearer ${getToken()}`
          },
          success: (res) => resolve(JSON.parse(res.data)),
          fail: reject
        })
      })
      
      if (uploadRes.code === 200) {
        uploadedFiles.push(...uploadRes.data.files)
      }
    } catch (error) {
      console.error('上传失败:', error)
    }
  }
  
  wx.hideLoading()
  return uploadedFiles
}
```

---

## 5. 删除文件

### 请求

```
DELETE /api/upload/{attachmentId}
Authorization: Bearer {token}
```

### 响应

```json
{
  "code": 200,
  "message": "删除成功",
  "data": {}
}
```

### 微信小程序示例

```javascript
// 删除附件
async function deleteAttachment(attachmentId) {
  const res = await wx.showModal({
    title: '确认删除',
    content: '确定要删除这个文件吗？'
  })
  
  if (!res.confirm) return
  
  try {
    const response = await request({
      url: `/api/upload/${attachmentId}`,
      method: 'DELETE'
    })
    
    if (response.code === 200) {
      wx.showToast({ title: '删除成功' })
      return true
    }
  } catch (error) {
    wx.showToast({ title: '删除失败', icon: 'none' })
  }
  
  return false
}
```

---

## 6. 封装的上传工具类

```javascript
// utils/upload.js

const BASE_URL = 'https://your-api-domain.com'

/**
 * 获取Token
 */
function getToken() {
  return wx.getStorageSync('token') || ''
}

/**
 * 通用上传函数
 * @param {string} url - 上传接口路径
 * @param {string} filePath - 文件临时路径
 * @param {object} formData - 额外表单数据
 * @param {string} name - 文件字段名，默认 'files'
 */
function uploadFile(url, filePath, formData = {}, name = 'files') {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${BASE_URL}${url}`,
      filePath,
      name,
      formData,
      header: {
        'Authorization': `Bearer ${getToken()}`
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data.data)
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } catch (e) {
          reject(new Error('解析响应失败'))
        }
      },
      fail: (err) => reject(err)
    })
  })
}

/**
 * 上传头像
 */
async function uploadAvatar(filePath) {
  return uploadFile('/api/upload/avatar', filePath, {}, 'file')
}

/**
 * 上传附件
 */
async function uploadAttachment(filePath, relatedType = 'general', relatedId = null) {
  return uploadFile('/api/upload/attachment', filePath, { relatedType, relatedId })
}

/**
 * 上传监理日志附件
 */
async function uploadLogAttachment(filePath, logId) {
  return uploadFile('/api/upload/log-attachment', filePath, { logId })
}

/**
 * 上传AI聊天文件
 */
async function uploadChatFile(filePath, sessionId) {
  return uploadFile('/api/ai/chat/upload', filePath, { sessionId })
}

/**
 * 批量上传文件
 * @param {string} url - 上传接口
 * @param {Array} files - 文件列表 [{path, ...}]
 * @param {object} formData - 额外表单数据
 * @param {function} onProgress - 进度回调 (current, total)
 */
async function batchUpload(url, files, formData = {}, onProgress = null) {
  const results = []
  const total = files.length
  
  for (let i = 0; i < total; i++) {
    try {
      const result = await uploadFile(url, files[i].path, formData)
      results.push({ success: true, data: result })
    } catch (error) {
      results.push({ success: false, error: error.message })
    }
    
    if (onProgress) {
      onProgress(i + 1, total)
    }
  }
  
  return results
}

module.exports = {
  uploadFile,
  uploadAvatar,
  uploadAttachment,
  uploadLogAttachment,
  uploadChatFile,
  batchUpload
}
```

---

## 文件存储说明

所有文件上传后存储到腾讯云COS，按以下目录结构组织：

```
cos-bucket/
├── avatars/              # 用户头像
│   └── 2025/12/03/
├── ai-chat/              # AI聊天文件
│   ├── image/
│   ├── document/
│   └── audio/
├── supervision-logs/     # 监理日志附件
├── attachments/          # 通用附件
├── projects/             # 项目相关文件
└── works/                # 工程相关文件
```

**COS配置要求：**
- 存储桶权限：公有读私有写
- 跨域配置：允许小程序域名访问
