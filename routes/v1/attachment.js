const express = require('express')
const router = express.Router()
const { success, badRequest, serverError, notFound, forbidden } = require('../../utils/response')
const { query } = require('../../config/database')
const { authenticate } = require('../../middleware/auth')

/**
 * 获取附件列表
 * GET /api/v1/attachments
 */
router.get('/attachments', authenticate, async (req, res) => {
  try {
    const relatedType = req.query.relatedType
    const relatedId = req.query.relatedId

    // 参数验证
    if (!relatedType) {
      return badRequest(res, '关联类型不能为空')
    }
    if (!relatedId) {
      return badRequest(res, '关联ID不能为空')
    }

    // 查询附件列表
    const attachments = await query(
      `SELECT 
        a.id,
        a.file_name as fileName,
        a.file_type as fileType,
        a.file_url as fileUrl,
        a.file_size as fileSize,
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        u.nickname as uploaderName
       FROM attachments a
       LEFT JOIN users u ON a.upload_user_id = u.id
       WHERE a.related_type = ? AND a.related_id = ?
       ORDER BY a.created_at ASC`,
      [relatedType, relatedId]
    )

    return success(res, {
      list: attachments
    })

  } catch (error) {
    console.error('获取附件列表错误:', error)
    return serverError(res, '获取附件列表失败')
  }
})

/**
 * 获取附件详情
 * GET /api/v1/attachments/:id
 */
router.get('/attachments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    // 查询附件详情
    const attachments = await query(
      `SELECT 
        a.id,
        a.related_type as relatedType,
        a.related_id as relatedId,
        a.file_name as fileName,
        a.file_type as fileType,
        a.file_url as fileUrl,
        a.file_size as fileSize,
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        u.nickname as uploaderName
       FROM attachments a
       LEFT JOIN users u ON a.upload_user_id = u.id
       WHERE a.id = ?`,
      [id]
    )

    if (attachments.length === 0) {
      return notFound(res, '附件不存在')
    }

    return success(res, attachments[0])

  } catch (error) {
    console.error('获取附件详情错误:', error)
    return serverError(res, '获取附件详情失败')
  }
})

/**
 * 删除附件
 * DELETE /api/v1/attachments/:id
 */
router.delete('/attachments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    // 查询附件
    const attachments = await query(
      'SELECT * FROM attachments WHERE id = ?',
      [id]
    )

    if (attachments.length === 0) {
      return notFound(res, '附件不存在')
    }

    // TODO: 这里应该删除云存储上的文件
    // 1. 从fileUrl中解析出文件路径
    // 2. 调用云存储API删除文件
    // 目前仅删除数据库记录

    // 删除附件记录
    await query('DELETE FROM attachments WHERE id = ?', [id])

    return success(res, {}, '删除成功')

  } catch (error) {
    console.error('删除附件错误:', error)
    return serverError(res, '删除失败')
  }
})

/**
 * 批量删除附件
 * POST /api/v1/attachments/batch-delete
 */
router.post('/attachments/batch-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body

    // 参数验证
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, '附件ID列表不能为空')
    }

    // 查询附件
    const placeholders = ids.map(() => '?').join(',')
    const attachments = await query(
      `SELECT * FROM attachments WHERE id IN (${placeholders})`,
      ids
    )

    if (attachments.length === 0) {
      return notFound(res, '附件不存在')
    }

    // TODO: 批量删除云存储上的文件

    // 批量删除附件记录
    await query(
      `DELETE FROM attachments WHERE id IN (${placeholders})`,
      ids
    )

    return success(res, {
      deletedCount: ids.length
    }, '批量删除成功')

  } catch (error) {
    console.error('批量删除附件错误:', error)
    return serverError(res, '批量删除失败')
  }
})

module.exports = router

