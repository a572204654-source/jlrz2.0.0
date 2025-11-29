const express = require('express')
const router = express.Router()
const { success, badRequest, serverError, notFound, forbidden } = require('../utils/response')
const { query, transaction } = require('../config/database')
const { authenticate } = require('../middleware/auth')

/**
 * 获取工程列表
 * GET /api/works
 * 
 * 请求参数:
 * - projectId: 项目ID（可选）
 * - page: 页码，默认1
 * - pageSize: 每页数量，默认20
 * - keyword: 搜索关键词（工程名称或编号）
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const projectId = req.query.projectId
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const offset = (page - 1) * pageSize
    const keyword = req.query.keyword || ''

    // 构建查询条件 - 只显示当前用户创建的工程
    let whereClause = 'w.creator_id = ?'
    const params = [userId]

    if (projectId) {
      whereClause += ' AND w.project_id = ?'
      params.push(projectId)
    }

    if (keyword) {
      whereClause += ' AND (w.work_name LIKE ? OR w.work_code LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    // 查询工程列表（置顶项优先），同时统计每个工程的日志数量
    const works = await query(
      `SELECT 
        w.id,
        w.project_id,
        w.work_name,
        w.project_work_code,
        w.work_code,
        w.unit_work,
        w.start_date,
        w.end_date,
        w.color,
        w.description,
        w.creator_id,
        w.is_pinned,
        w.created_at,
        w.updated_at,
        COALESCE(COUNT(sl.id), 0) as log_count
       FROM works w
       LEFT JOIN supervision_logs sl ON w.id = sl.work_id
       WHERE ${whereClause}
       GROUP BY w.id
       ORDER BY w.is_pinned DESC, w.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    )

    // 转换为驼峰命名
    const list = works.map(w => ({
      id: w.id,
      projectId: w.project_id,
      workName: w.work_name,
      projectWorkCode: w.project_work_code,
      workCode: w.work_code,
      unitWork: w.unit_work,
      startDate: w.start_date,
      endDate: w.end_date,
      color: w.color,
      description: w.description,
      creatorId: w.creator_id,
      isPinned: w.is_pinned === 1,
      logCount: parseInt(w.log_count) || 0,
      createdAt: w.created_at,
      updatedAt: w.updated_at
    }))

    // 查询总数
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM works w WHERE ${whereClause}`,
      params
    )

    return success(res, {
      total: countResult.total,
      page,
      pageSize,
      list
    })

  } catch (error) {
    console.error('获取工程列表错误:', error)
    return serverError(res, '获取工程列表失败')
  }
})

/**
 * 获取工程详情
 * GET /api/works/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询工程详情 - 只能查看自己创建的工程，同时统计日志数量
    const works = await query(
      `SELECT 
        w.id,
        w.project_id,
        p.project_name,
        p.project_code,
        w.work_name,
        w.project_work_code,
        w.work_code,
        w.unit_work,
        w.start_date,
        w.end_date,
        w.color,
        w.description,
        p.organization,
        p.chief_engineer,
        p.specialist_engineer,
        w.creator_id,
        w.is_pinned,
        w.created_at,
        w.updated_at,
        COALESCE(COUNT(sl.id), 0) as log_count
       FROM works w
       LEFT JOIN projects p ON w.project_id = p.id
       LEFT JOIN supervision_logs sl ON w.id = sl.work_id
       WHERE w.id = ? AND w.creator_id = ?
       GROUP BY w.id`,
      [id, userId]
    )

    if (works.length === 0) {
      return notFound(res, '工程不存在或无权访问')
    }

    const w = works[0]

    // 转换为驼峰命名
    return success(res, {
      id: w.id,
      projectId: w.project_id,
      projectName: w.project_name,
      projectCode: w.project_code,
      workName: w.work_name,
      projectWorkCode: w.project_work_code,
      workCode: w.work_code,
      unitWork: w.unit_work,
      startDate: w.start_date,
      endDate: w.end_date,
      color: w.color,
      description: w.description,
      organization: w.organization,
      chiefEngineer: w.chief_engineer,
      specialistEngineer: w.specialist_engineer,
      creatorId: w.creator_id,
      isPinned: w.is_pinned === 1,
      logCount: parseInt(w.log_count) || 0,
      createdAt: w.created_at,
      updatedAt: w.updated_at
    })

  } catch (error) {
    console.error('获取工程详情错误:', error)
    return serverError(res, '获取工程详情失败')
  }
})

/**
 * 新增工程
 * POST /api/works
 * 
 * 请求参数:
 * - projectId: 项目ID（必填）
 * - workName: 单项工程名称（必填）
 * - projectWorkCode: 单项工程编号
 * - workCode: 单位工程编号（必填）
 * - unitWork: 单位工程名称（必填）
 * - startDate: 监理日志开始时间
 * - endDate: 监理日志结束时间
 * - color: 工程标识颜色
 * - description: 工程描述
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const {
      projectId,
      workName,
      projectWorkCode,
      workCode,
      unitWork,
      startDate,
      endDate,
      color,
      description
    } = req.body

    // 参数验证
    if (!projectId) {
      return badRequest(res, '项目ID不能为空')
    }
    if (!workName) {
      return badRequest(res, '工程名称不能为空')
    }
    if (!workCode) {
      return badRequest(res, '工程编号不能为空')
    }
    if (!unitWork) {
      return badRequest(res, '单位工程不能为空')
    }

    // 检查项目是否存在
    const projects = await query(
      'SELECT id FROM projects WHERE id = ?',
      [projectId]
    )

    if (projects.length === 0) {
      return notFound(res, '项目不存在')
    }

    // 创建工程
    const result = await query(
      `INSERT INTO works 
        (project_id, work_name, project_work_code, work_code, unit_work, start_date, end_date, color, description, creator_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, workName, projectWorkCode || null, workCode, unitWork, startDate || null, endDate || null, color || '#0d9488', description || '', userId]
    )

    return success(res, { id: result.insertId }, '创建成功')

  } catch (error) {
    console.error('创建工程错误:', error)
    return serverError(res, '创建工程失败')
  }
})

/**
 * 编辑工程
 * PUT /api/works/:id
 * 
 * 请求参数:
 * - workName: 单项工程名称
 * - projectWorkCode: 单项工程编号
 * - workCode: 单位工程编号
 * - unitWork: 单位工程名称
 * - startDate: 监理日志开始时间
 * - endDate: 监理日志结束时间
 * - color: 工程标识颜色
 * - description: 工程描述
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId
    const {
      workName,
      projectWorkCode,
      workCode,
      unitWork,
      startDate,
      endDate,
      color,
      description
    } = req.body

    // 查询工程 - 验证权限
    const works = await query(
      'SELECT * FROM works WHERE id = ? AND creator_id = ?',
      [id, userId]
    )

    if (works.length === 0) {
      return notFound(res, '工程不存在或无权操作')
    }

    // 更新工程
    await query(
      `UPDATE works SET 
        work_name = COALESCE(?, work_name),
        project_work_code = COALESCE(?, project_work_code),
        work_code = COALESCE(?, work_code),
        unit_work = COALESCE(?, unit_work),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        color = COALESCE(?, color),
        description = COALESCE(?, description),
        updated_at = NOW()
      WHERE id = ?`,
      [workName ?? null, projectWorkCode ?? null, workCode ?? null, unitWork ?? null, startDate ?? null, 
       endDate ?? null, color ?? null, description ?? null, id]
    )

    return success(res, {}, '更新成功')

  } catch (error) {
    console.error('更新工程错误:', error)
    return serverError(res, '更新工程失败')
  }
})

/**
 * 删除工程
 * DELETE /api/works/:id
 * 
 * 功能变更：移除删除限制，允许删除有日志的工程
 * 删除时自动级联删除关联的监理日志和附件
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询工程 - 验证权限
    const works = await query(
      'SELECT * FROM works WHERE id = ? AND creator_id = ?',
      [id, userId]
    )

    if (works.length === 0) {
      return notFound(res, '工程不存在或无权操作')
    }

    // 使用事务确保数据一致性
    await transaction(async (connection) => {
      // 1. 查询该工程下的所有监理日志ID
      const [logs] = await connection.execute(
        'SELECT id FROM supervision_logs WHERE work_id = ?',
        [id]
      )

      const logIds = logs.map(log => log.id)

      // 2. 删除关联的附件（包括工程附件和日志附件）
      if (logIds.length > 0) {
        // 删除日志关联的附件 - 使用占位符构建 IN 查询
        const placeholders = logIds.map(() => '?').join(',')
        await connection.execute(
          `DELETE FROM attachments WHERE related_type = ? AND related_id IN (${placeholders})`,
          ['log', ...logIds]
        )
      }

      // 删除工程关联的附件
      await connection.execute(
        'DELETE FROM attachments WHERE related_type = ? AND related_id = ?',
        ['work', id]
      )

      // 3. 删除关联的监理日志
      if (logIds.length > 0) {
        await connection.execute(
          'DELETE FROM supervision_logs WHERE work_id = ?',
          [id]
        )
      }

      // 4. 删除工程
      await connection.execute('DELETE FROM works WHERE id = ?', [id])
    })

    return success(res, null, '删除成功')

  } catch (error) {
    console.error('删除工程错误:', error)
    return serverError(res, '删除工程失败')
  }
})

/**
 * 置顶工程
 * POST /api/works/:id/pin
 * 
 * 功能: 将工程设置为置顶状态，置顶项会在列表中排在前面
 */
router.post('/:id/pin', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询工程是否存在 - 验证权限
    const works = await query(
      'SELECT id, is_pinned FROM works WHERE id = ? AND creator_id = ?',
      [id, userId]
    )

    if (works.length === 0) {
      return notFound(res, '工程不存在或无权操作')
    }

    // 如果已经置顶，直接返回成功
    if (works[0].is_pinned === 1) {
      return success(res, { isPinned: true }, '工程已置顶')
    }

    // 更新为置顶状态
    await query(
      'UPDATE works SET is_pinned = 1, updated_at = NOW() WHERE id = ?',
      [id]
    )

    return success(res, { isPinned: true }, '置顶成功')

  } catch (error) {
    console.error('置顶工程错误:', error)
    return serverError(res, '置顶工程失败')
  }
})

/**
 * 取消置顶工程
 * POST /api/works/:id/unpin
 * 
 * 功能: 取消工程的置顶状态
 */
router.post('/:id/unpin', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询工程是否存在 - 验证权限
    const works = await query(
      'SELECT id, is_pinned FROM works WHERE id = ? AND creator_id = ?',
      [id, userId]
    )

    if (works.length === 0) {
      return notFound(res, '工程不存在或无权操作')
    }

    // 如果已经取消置顶，直接返回成功
    if (works[0].is_pinned === 0) {
      return success(res, { isPinned: false }, '工程未置顶')
    }

    // 更新为非置顶状态
    await query(
      'UPDATE works SET is_pinned = 0, updated_at = NOW() WHERE id = ?',
      [id]
    )

    return success(res, { isPinned: false }, '取消置顶成功')

  } catch (error) {
    console.error('取消置顶工程错误:', error)
    return serverError(res, '取消置顶工程失败')
  }
})

module.exports = router

