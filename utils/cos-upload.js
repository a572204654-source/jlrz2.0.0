/**
 * 腾讯云COS上传工具模块
 */

const COS = require('cos-nodejs-sdk-v5')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const config = require('../config')

// 初始化COS实例（延迟初始化，避免配置未就绪时报错）
let cosInstance = null

const getCosInstance = () => {
  if (!cosInstance && config.cos.secretId && config.cos.secretKey) {
    cosInstance = new COS({
      SecretId: config.cos.secretId,
      SecretKey: config.cos.secretKey
    })
  }
  return cosInstance
}

/**
 * 检查COS是否可用
 */
const isCosAvailable = () => {
  return config.cos.enabled && 
         config.cos.bucket && 
         config.cos.secretId && 
         config.cos.secretKey
}

/**
 * 生成COS文件Key
 * @param {string} originalName - 原始文件名
 * @param {string} folder - 存储文件夹
 * @returns {string} 文件Key
 */
const generateCosKey = (originalName, folder = 'uploads') => {
  const ext = path.extname(originalName)
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString('hex')
  // 格式: folder/2024/12/03/timestamp_random.ext
  const date = new Date()
  const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  return `${folder}/${datePath}/${timestamp}_${random}${ext}`
}

/**
 * 上传文件到COS
 * @param {Buffer|string} fileInput - 文件Buffer或本地文件路径
 * @param {string} originalName - 原始文件名
 * @param {string} folder - 存储文件夹，默认'uploads'
 * @returns {Promise<Object>} { key, url, etag }
 */
const uploadToCOS = (fileInput, originalName, folder = 'uploads') => {
  return new Promise((resolve, reject) => {
    const cos = getCosInstance()
    if (!cos) {
      return reject(new Error('COS未配置或配置不完整'))
    }

    const key = generateCosKey(originalName, folder)
    const bucket = config.cos.bucket
    const region = config.cos.region

    // 如果是文件路径，读取文件内容
    let body = fileInput
    if (typeof fileInput === 'string') {
      try {
        body = fs.readFileSync(fileInput)
      } catch (err) {
        return reject(new Error(`读取文件失败: ${err.message}`))
      }
    }

    cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: key,
      Body: body
    }, (err, data) => {
      if (err) {
        console.error('COS上传失败:', err)
        reject(err)
      } else {
        // 构建访问URL
        const url = config.cos.domain 
          ? `${config.cos.domain}/${key}`
          : `https://${bucket}.cos.${region}.myqcloud.com/${key}`
        
        resolve({
          key: key,
          url: url,
          etag: data.ETag
        })
      }
    })
  })
}

/**
 * 从COS删除文件
 * @param {string} key - 文件Key
 * @returns {Promise<Object>}
 */
const deleteFromCOS = (key) => {
  return new Promise((resolve, reject) => {
    const cos = getCosInstance()
    if (!cos) {
      return reject(new Error('COS未配置'))
    }

    cos.deleteObject({
      Bucket: config.cos.bucket,
      Region: config.cos.region,
      Key: key
    }, (err, data) => {
      if (err) {
        console.error('COS删除失败:', err)
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

/**
 * 批量删除COS文件
 * @param {string[]} keys - 文件Key数组
 * @returns {Promise<Object>}
 */
const batchDeleteFromCOS = (keys) => {
  return new Promise((resolve, reject) => {
    const cos = getCosInstance()
    if (!cos) {
      return reject(new Error('COS未配置'))
    }

    if (!keys || keys.length === 0) {
      return resolve({ Deleted: [], Error: [] })
    }

    cos.deleteMultipleObject({
      Bucket: config.cos.bucket,
      Region: config.cos.region,
      Objects: keys.map(key => ({ Key: key }))
    }, (err, data) => {
      if (err) {
        console.error('COS批量删除失败:', err)
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

/**
 * 获取预签名上传URL（用于前端直传）
 * @param {string} key - 文件Key
 * @param {number} expires - 有效期（秒），默认300秒
 * @returns {Promise<string>} 预签名URL
 */
const getPresignedUploadUrl = (key, expires = 300) => {
  return new Promise((resolve, reject) => {
    const cos = getCosInstance()
    if (!cos) {
      return reject(new Error('COS未配置'))
    }

    cos.getObjectUrl({
      Bucket: config.cos.bucket,
      Region: config.cos.region,
      Key: key,
      Sign: true,
      Expires: expires,
      Method: 'PUT'
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data.Url)
      }
    })
  })
}

/**
 * 获取预签名下载URL（用于私有读取）
 * @param {string} key - 文件Key
 * @param {number} expires - 有效期（秒），默认3600秒
 * @returns {Promise<string>} 预签名URL
 */
const getPresignedDownloadUrl = (key, expires = 3600) => {
  return new Promise((resolve, reject) => {
    const cos = getCosInstance()
    if (!cos) {
      return reject(new Error('COS未配置'))
    }

    cos.getObjectUrl({
      Bucket: config.cos.bucket,
      Region: config.cos.region,
      Key: key,
      Sign: true,
      Expires: expires,
      Method: 'GET'
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data.Url)
      }
    })
  })
}

/**
 * 从URL中提取COS Key
 * @param {string} url - COS文件URL
 * @returns {string|null} 文件Key
 */
const getKeyFromUrl = (url) => {
  try {
    const urlObj = new URL(url)
    // 移除开头的斜杠
    return urlObj.pathname.substring(1)
  } catch (e) {
    return null
  }
}

module.exports = {
  getCosInstance,
  isCosAvailable,
  generateCosKey,
  uploadToCOS,
  deleteFromCOS,
  batchDeleteFromCOS,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  getKeyFromUrl
}
