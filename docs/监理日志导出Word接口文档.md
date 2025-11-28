# 监理日志导出Word接口文档

## 接口概述

该接口用于导出监理日志为Word文档（.docx格式），文档按照标准监理日志模板1:1还原，包含封面页和内容页。

---

## 接口信息

| 项目 | 说明 |
|------|------|
| **请求地址** | `/api/supervision-logs/:id/export` |
| **请求方法** | `GET` |
| **需要认证** | 是（Bearer Token） |
| **Content-Type** | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |

---

## 请求参数

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | Number | 是 | 监理日志ID |

### 请求头

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `Authorization` | String | 是 | Bearer Token，格式：`Bearer <token>` |

---

## 响应说明

### 成功响应

- **状态码**: `200 OK`
- **响应类型**: 文件流（Word文档）
- **响应头**:
  - `Content-Type`: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `Content-Disposition`: `attachment; filename="<文件名>.docx"`
  - `Content-Length`: 文件大小（字节）

### 错误响应

| 状态码 | 说明 |
|--------|------|
| `401` | 未授权，Token无效或过期 |
| `404` | 监理日志不存在 |
| `500` | 服务器错误，导出失败 |

**错误响应格式**:
```json
{
  "code": 404,
  "message": "监理日志不存在"
}
```

---

## 前端调用示例

### 方式一：直接下载（推荐）

```javascript
// 使用 window.open 直接下载
function exportSupervisionLog(logId, token) {
  const url = `/api/supervision-logs/${logId}/export`
  
  // 创建隐藏的 a 标签进行下载
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', '')
  
  // 如果需要带 token，使用 fetch 方式
  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('导出失败')
    }
    return response.blob()
  })
  .then(blob => {
    // 从响应头获取文件名
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `监理日志.docx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  })
  .catch(error => {
    console.error('导出错误:', error)
    alert('导出失败，请重试')
  })
}
```

### 方式二：Axios 下载

```javascript
import axios from 'axios'

async function exportSupervisionLog(logId) {
  try {
    const response = await axios({
      method: 'GET',
      url: `/api/supervision-logs/${logId}/export`,
      responseType: 'blob',  // 重要：指定响应类型为 blob
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    // 从 Content-Disposition 获取文件名
    const contentDisposition = response.headers['content-disposition']
    let fileName = '监理日志.docx'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (match) {
        fileName = decodeURIComponent(match[1].replace(/['"]/g, ''))
      }
    }
    
    // 创建下载链接
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    
    // 清理
    window.URL.revokeObjectURL(url)
    link.remove()
    
    return { success: true }
  } catch (error) {
    console.error('导出失败:', error)
    return { success: false, message: error.message }
  }
}
```

### 方式三：uni-app / 小程序

```javascript
// uni-app 下载文件
function exportSupervisionLog(logId) {
  const token = uni.getStorageSync('token')
  
  uni.showLoading({ title: '正在导出...' })
  
  uni.downloadFile({
    url: `${baseUrl}/api/supervision-logs/${logId}/export`,
    header: {
      'Authorization': `Bearer ${token}`
    },
    success: (res) => {
      uni.hideLoading()
      
      if (res.statusCode === 200) {
        // 保存文件到本地
        uni.saveFile({
          tempFilePath: res.tempFilePath,
          success: (saveRes) => {
            uni.showToast({ title: '导出成功', icon: 'success' })
            
            // 打开文件
            uni.openDocument({
              filePath: saveRes.savedFilePath,
              fileType: 'docx',
              success: () => console.log('打开文档成功'),
              fail: (err) => console.error('打开文档失败', err)
            })
          },
          fail: (err) => {
            console.error('保存文件失败', err)
            uni.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      } else {
        uni.showToast({ title: '导出失败', icon: 'none' })
      }
    },
    fail: (err) => {
      uni.hideLoading()
      console.error('下载失败', err)
      uni.showToast({ title: '网络错误', icon: 'none' })
    }
  })
}
```

### 方式四：React Native

```javascript
import RNFetchBlob from 'rn-fetch-blob'

async function exportSupervisionLog(logId) {
  const token = await AsyncStorage.getItem('token')
  const { dirs } = RNFetchBlob.fs
  
  try {
    const response = await RNFetchBlob.config({
      fileCache: true,
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: '监理日志.docx',
        path: `${dirs.DownloadDir}/监理日志_${logId}.docx`,
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    }).fetch('GET', `${baseUrl}/api/supervision-logs/${logId}/export`, {
      'Authorization': `Bearer ${token}`
    })
    
    console.log('文件下载成功:', response.path())
    return { success: true, path: response.path() }
  } catch (error) {
    console.error('下载失败:', error)
    return { success: false, message: error.message }
  }
}
```

---

## 导出文档结构

生成的Word文档包含两页：

### 第一页：封面页

| 字段 | 说明 |
|------|------|
| 附录11-5表 | 固定标题 |
| 项目名称 | 项目名称 |
| 项目编号 | 项目编号 |
| 单项工程名称/编号 | 单项工程信息 |
| 单位工程名称/编号 | 单位工程信息 |
| **监理日志** | 大标题 |
| 项目监理机构 | 监理机构名称 |
| 总监理工程师 | 总监理工程师姓名 |
| 专业监理工程师 | 专业监理工程师姓名 |
| 监理日志起止时间 | 项目起止日期 |

### 第二页：内容页

| 字段 | 说明 |
|------|------|
| 单位工程名称/编号 | 单位工程信息 |
| 日期 | 日志日期 |
| 气象 | 天气情况 |
| 工程动态 | 工程动态内容 |
| 监理工作情况 | 监理工作内容 |
| 安全监理工作情况 | 安全监理内容 |
| 记录人 | 记录人姓名 + 日期 |
| 审核人 | 审核人姓名 + 日期 |

---

## 注意事项

1. **文件格式**: 导出文件为 `.docx` 格式，兼容 Microsoft Word 2007 及以上版本
2. **文件命名**: 文件名格式为 `{单位工程名称}_{日期}.docx`
3. **跨平台一致性**: 模板使用固定A4尺寸（210mm × 297mm），确保在所有设备上显示一致
4. **网络超时**: 建议设置合理的请求超时时间（如30秒）
5. **错误处理**: 请做好网络异常和服务器错误的处理

---

## 更新日志

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2025-11-28 | 初版发布，支持监理日志Word导出 |
