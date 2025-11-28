const express = require('express')
const router = express.Router()
const { success, badRequest, serverError, notFound } = require('../utils/response')
const { query } = require('../config/database')
const { authenticate } = require('../middleware/auth')

/**
 * 获取项目列表
 * GET /api/projects
 * 
 * 请求参数:
 * - page: 页码，默认1
 * - pageSize: 每页数量，默认20
 * - keyword: 搜索关键词（项目名称或编号）
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const offset = (page - 1) * pageSize
    const keyword = req.query.keyword || ''

    // 构建查询条件 - 只显示当前用户创建的项目
    let whereClause = 'p.creator_id = ?'
    const params = [userId]

    if (keyword) {
      whereClause += ' AND (p.project_name LIKE ? OR p.project_code LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    // 查询项目列表（置顶项优先）
    const projects = await query(
      `SELECT 
        p.id,
        p.project_name,
        p.project_code,
        p.organization,
        p.chief_engineer,
        p.specialist_engineer,
        p.description,
        p.address,
        p.start_date,
        p.end_date,
        p.creator_id,
        p.is_pinned,
        p.created_at,
        p.updated_at,
        (SELECT COUNT(*) FROM works WHERE project_id = p.id) as work_count
       FROM projects p
       WHERE ${whereClause}
       ORDER BY p.is_pinned DESC, p.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    )

    // 转换为驼峰命名
    const list = projects.map(p => ({
      id: p.id,
      projectName: p.project_name,
      projectCode: p.project_code,
      organization: p.organization,
      chiefEngineer: p.chief_engineer,
      specialistEngineer: p.specialist_engineer,
      description: p.description,
      address: p.address,
      startDate: p.start_date,
      endDate: p.end_date,
      creatorId: p.creator_id,
      isPinned: p.is_pinned === 1,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      workCount: p.work_count || 0
    }))

    // 查询总数
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM projects p WHERE ${whereClause}`,
      params
    )

    return success(res, {
      total: countResult.total,
      page,
      pageSize,
      list
    })

  } catch (error) {
    console.error('获取项目列表错误:', error)
    return serverError(res, '获取项目列表失败')
  }
})

/**
 * 获取项目详情
 * GET /api/projects/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询项目详情 - 只能查看自己创建的项目
    const projects = await query(
      `SELECT 
        p.id,
        p.project_name,
        p.project_code,
        p.organization,
        p.chief_engineer,
        p.specialist_engineer,
        p.description,
        p.address,
        p.start_date,
        p.end_date,
        p.creator_id,
        p.is_pinned,
        p.created_at,
        p.updated_at,
        (SELECT COUNT(*) FROM works WHERE project_id = p.id) as work_count
       FROM projects p
       WHERE p.id = ? AND p.creator_id = ?`,
      [id, userId]
    )

    if (projects.length === 0) {
      return notFound(res, '项目不存在或无权访问')
    }

    const p = projects[0]

    // 转换为驼峰命名
    return success(res, {
      id: p.id,
      projectName: p.project_name,
      projectCode: p.project_code,
      organization: p.organization,
      chiefEngineer: p.chief_engineer,
      specialistEngineer: p.specialist_engineer,
      description: p.description,
      address: p.address,
      startDate: p.start_date,
      endDate: p.end_date,
      creatorId: p.creator_id,
      isPinned: p.is_pinned === 1,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      workCount: p.work_count || 0
    })

  } catch (error) {
    console.error('获取项目详情错误:', error)
    return serverError(res, '获取项目详情失败')
  }
})

/**
 * 新增项目
 * POST /api/projects
 * 
 * 请求参数:
 * - projectName: 项目名称（必填）
 * - projectCode: 项目编号（必填）
 * - organization: 监理机构（必填）
 * - chiefEngineer: 总监理工程师（必填）
 * - specialistEngineer: 专业监理工程师
 * - description: 项目描述
 * - address: 项目地址
 * - startDate: 开始日期
 * - endDate: 结束日期
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const {
      projectName,
      projectCode,
      organization,
      chiefEngineer,
      specialistEngineer,
      description,
      address,
      startDate,
      endDate
    } = req.body

    // 参数验证
    if (!projectName) {
      return badRequest(res, '项目名称不能为空')
    }
    if (!projectCode) {
      return badRequest(res, '项目编号不能为空')
    }
    if (!organization) {
      return badRequest(res, '监理机构不能为空')
    }
    if (!chiefEngineer) {
      return badRequest(res, '总监理工程师不能为空')
    }

    // 创建项目
    const result = await query(
      `INSERT INTO projects 
        (project_name, project_code, organization, chief_engineer, specialist_engineer, description, address, start_date, end_date, creator_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectName, projectCode, organization, chiefEngineer, specialistEngineer || '', description || '', address || '', startDate || null, endDate || null, userId]
    )

    return success(res, { id: result.insertId }, '创建成功')

  } catch (error) {
    console.error('创建项目错误:', error)
    return serverError(res, '创建项目失败')
  }
})

/**
 * 编辑项目
 * PUT /api/projects/:id
 * 
 * 请求参数:
 * - projectName: 项目名称
 * - projectCode: 项目编号
 * - organization: 监理机构
 * - chiefEngineer: 总监理工程师
 * - specialistEngineer: 专业监理工程师
 * - description: 项目描述
 * - address: 项目地址
 * - startDate: 开始日期
 * - endDate: 结束日期
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId
    const {
      projectName,
      projectCode,
      organization,
      chiefEngineer,
      specialistEngineer,
      description,
      address,
      startDate,
      endDate
    } = req.body

    // 查询项目 - 验证权限
    const projects = await query(
      'SELECT * FROM projects WHERE id = ? AND creator_id = ?',
      [id, userId]
    )

    if (projects.length === 0) {
      return notFound(res, '项目不存在或无权操作')
    }

    // 更新项目
    await query(
      `UPDATE projects SET 
        project_name = COALESCE(?, project_name),
        project_code = COALESCE(?, project_code),
        organization = COALESCE(?, organization),
        chief_engineer = COALESCE(?, chief_engineer),
        specialist_engineer = COALESCE(?, specialist_engineer),
        description = COALESCE(?, description),
        address = COALESCE(?, address),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        updated_at = NOW()
      WHERE id = ?`,
      [projectName ?? null, projectCode ?? null, organization ?? null, chiefEngineer ?? null, specialistEngineer ?? null,
       description ?? null, address ?? null, startDate ?? null, endDate ?? null, id]
    )

    return success(res, {}, '更新成功')

  } catch (error) {
    console.error('更新项目错误:', error)
    return serverError(res, '更新项目失败')
  }
})

/**
 * 删除项目
 * DELETE /api/projects/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询项目 - 验证权限
    const projects = await query(
      'SELECT * FROM projects WHERE id = ? AND creator_id = ?',
      [id, userId]
    )

    if (projects.length === 0) {
      return notFound(res, '项目不存在或无权操作')
    }

    // 检查是否有关联的工程
    const works = await query(
      'SELECT COUNT(*) as count FROM works WHERE project_id = ?',
      [id]
    )

    if (works[0].count > 0) {
      return badRequest(res, '该项目下存在工程，无法删除')
    }

    // 删除项目
    await query('DELETE FROM projects WHERE id = ?', [id])

    return success(res, {}, '删除成功')

  } catch (error) {
    console.error('删除项目错误:', error)
    return serverError(res, '删除项目失败')
  }
})

/**
 * 置顶项目
 * POST /api/projects/:id/pin
 * 
 * 功能: 将项目设置为置顶状态，置顶项会在列表中排在前面
 */
router.post('/:id/pin', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询项目是否存在 - 验证权限
    const projects = await query(
      'SELECT id, is_pinned FROM projects WHERE id = ? AND creator_id = ?',
      [id, userId]
    )

    if (projects.length === 0) {
      return notFound(res, '项目不存在或无权操作')
    }

    // 如果已经置顶，直接返回成功
    if (projects[0].is_pinned === 1) {
      return success(res, { isPinned: true }, '项目已置顶')
    }

    // 更新为置顶状态
    await query(
      'UPDATE projects SET is_pinned = 1, updated_at = NOW() WHERE id = ?',
      [id]
    )

    return success(res, { isPinned: true }, '置顶成功')

  } catch (error) {
    console.error('置顶项目错误:', error)
    return serverError(res, '置顶项目失败')
  }
})

/**
 * 取消置顶项目
 * POST /api/projects/:id/unpin
 * 
 * 功能: 取消项目的置顶状态
 */
router.post('/:id/unpin', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询项目是否存在 - 验证权限
    const projects = await query(
      'SELECT id, is_pinned FROM projects WHERE id = ? AND creator_id = ?',
      [id, userId]
    )

    if (projects.length === 0) {
      return notFound(res, '项目不存在或无权操作')
    }

    // 如果已经取消置顶，直接返回成功
    if (projects[0].is_pinned === 0) {
      return success(res, { isPinned: false }, '项目未置顶')
    }

    // 更新为非置顶状态
    await query(
      'UPDATE projects SET is_pinned = 0, updated_at = NOW() WHERE id = ?',
      [id]
    )

    return success(res, { isPinned: false }, '取消置顶成功')

  } catch (error) {
    console.error('取消置顶项目错误:', error)
    return serverError(res, '取消置顶项目失败')
  }
})

module.exports = router

