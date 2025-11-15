/**
 * 附件模块测试
 * 测试接口：
 * - GET /api/v1/attachments - 获取附件列表
 * - GET /api/v1/attachments/:id - 获取附件详情
 * - DELETE /api/v1/attachments/:id - 删除附件
 * - POST /api/v1/attachments/batch-delete - 批量删除附件
 */

const http = require('../utils/http')
const logger = require('../utils/logger')
const assert = require('../utils/assert')
require('dotenv').config()

// 测试数据存储
const testData = {
  attachmentId: null,
  attachmentIds: []
}

/**
 * 测试1: 获取附件列表
 */
async function testGetAttachments() {
  logger.module('测试1: 获取附件列表')
  
  try {
    const params = {
      relatedType: 'log',
      relatedId: 1
    }
    
    logger.info('请求参数', params)
    
    const response = await http.get('/api/v1/attachments', params)
    
    logger.info('响应数据', response)
    
    // 验证响应
    assert.assertSuccess(response, '获取附件列表成功')
    assert.assertExists(response.data, '返回数据存在')
    assert.assertHasField(response.data, 'list', '包含list字段')
    
    if (response.data.list && response.data.list.length > 0) {
      logger.success(`获取到 ${response.data.list.length} 个附件`)
    } else {
      logger.warn('暂无附件数据')
    }
    
    logger.divider()
    return true
  } catch (error) {
    logger.error('获取附件列表测试失败', error)
    logger.divider()
    return false
  }
}

/**
 * 测试2: 获取附件详情
 */
async function testGetAttachmentDetail() {
  logger.module('测试2: 获取附件详情')
  
  if (!testData.attachmentId) {
    logger.warn('跳过测试: 没有可用的附件ID')
    logger.divider()
    return true
  }
  
  try {
    logger.info('附件ID', { id: testData.attachmentId })
    
    const response = await http.get(`/api/v1/attachments/${testData.attachmentId}`)
    
    logger.info('响应数据', response)
    
    // 验证响应
    assert.assertSuccess(response, '获取附件详情成功')
    assert.assertExists(response.data, '返回数据存在')
    assert.assertHasField(response.data, 'id', '包含id字段')
    assert.assertHasField(response.data, 'fileName', '包含fileName字段')
    assert.assertHasField(response.data, 'fileUrl', '包含fileUrl字段')
    
    logger.divider()
    return true
  } catch (error) {
    logger.error('获取附件详情测试失败', error)
    logger.divider()
    return false
  }
}

/**
 * 测试3: 批量删除附件
 */
async function testBatchDeleteAttachments() {
  logger.module('测试3: 批量删除附件')
  
  if (testData.attachmentIds.length === 0) {
    logger.warn('跳过测试: 没有可用的附件ID')
    logger.divider()
    return true
  }
  
  try {
    const deleteData = {
      ids: testData.attachmentIds
    }
    
    logger.info('请求参数', deleteData)
    
    const response = await http.post('/api/v1/attachments/batch-delete', deleteData)
    
    logger.info('响应数据', response)
    
    // 验证响应
    assert.assertSuccess(response, '批量删除附件成功')
    
    // 清空已删除的ID
    testData.attachmentIds = []
    testData.attachmentId = null
    
    logger.divider()
    return true
  } catch (error) {
    logger.error('批量删除附件测试失败', error)
    logger.divider()
    return false
  }
}

/**
 * 测试4: 删除单个附件
 */
async function testDeleteAttachment() {
  logger.module('测试4: 删除单个附件')
  
  // 注意：此测试需要先手动创建测试附件，或跳过
  if (!testData.attachmentId) {
    logger.warn('跳过测试: 没有可用的附件ID')
    logger.divider()
    return true
  }
  
  try {
    const deleteId = testData.attachmentId
    logger.info('附件ID', { id: deleteId })
    
    const response = await http.del(`/api/v1/attachments/${deleteId}`)
    
    logger.info('响应数据', response)
    
    // 验证响应
    assert.assertSuccess(response, '删除附件成功')
    
    logger.divider()
    return true
  } catch (error) {
    logger.error('删除附件测试失败', error)
    logger.divider()
    return false
  }
}

/**
 * 运行所有附件模块测试
 */
async function runAllTests() {
  logger.title('附件模块测试')
  
  const results = []
  
  // 获取附件列表
  results.push(await testGetAttachments())
  
  // 获取附件详情
  results.push(await testGetAttachmentDetail())
  
  // 批量删除附件
  results.push(await testBatchDeleteAttachments())
  
  // 删除单个附件
  results.push(await testDeleteAttachment())
  
  // 统计结果
  const passed = results.filter(r => r).length
  const failed = results.filter(r => !r).length
  
  console.log('\n')
  logger.info('测试完成', {
    总计: results.length,
    通过: passed,
    失败: failed
  })
  
  return {
    module: '附件模块',
    total: results.length,
    passed,
    failed,
    testData
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests().then(result => {
    if (result.failed > 0) {
      process.exit(1)
    }
  }).catch(error => {
    logger.error('测试运行异常', error)
    process.exit(1)
  })
}

module.exports = {
  runAllTests,
  testData
}

