const express = require('express')
const router = express.Router()
const { success, badRequest, serverError, notFound, forbidden } = require('../../utils/response')
const { query } = require('../../config/database')
const { authenticate } = require('../../middleware/auth')

/**
 * 获取项目列表
 * GET /api/v1/projects
 */
router.get('/projects', authenticate, async (req, res) => {
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

    // 查询项目列表
    const projects = await query(
      `SELECT 
        p.id,
        p.project_name as projectName,
        p.project_code as projectCode,
        p.organization,
        p.chief_engineer as chiefEngineer,
        (SELECT COUNT(*) FROM works WHERE project_id = p.id) as workCount,
        p.created_at as createdAt
       FROM projects p
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    // 查询总数
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM projects p WHERE ${whereClause}`,
      params
    )

    return success(res, {
      total: countResult.total,
      page,
      pageSize,
      list: projects
    })

  } catch (error) {
    console.error('获取项目列表错误:', error)
    return serverError(res, '获取项目列表失败')
  }
})

/**
 * 获取项目详情
 * GET /api/v1/projects/:id
 */
router.get('/projects/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询项目详情 - 只能查看自己创建的项目
    const projects = await query(
      `SELECT 
        p.id,
        p.project_name as projectName,
        p.project_code as projectCode,
        p.organization,
        p.chief_engineer as chiefEngineer,
        p.description,
        p.address,
        p.start_date as startDate,
        p.end_date as endDate,
        (SELECT COUNT(*) FROM works WHERE project_id = p.id) as workCount,
        p.created_at as createdAt
       FROM projects p
       WHERE p.id = ? AND p.creator_id = ?`,
      [id, userId]
    )

    if (projects.length === 0) {
      return notFound(res, '项目不存在或无权访问')
    }

    return success(res, projects[0])

  } catch (error) {
    console.error('获取项目详情错误:', error)
    return serverError(res, '获取项目详情失败')
  }
})

/**
 * 新增项目
 * POST /api/v1/projects
 */
router.post('/projects', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const {
      projectName,
      projectCode,
      organization,
      chiefEngineer,
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
        (project_name, project_code, organization, chief_engineer, description, address, start_date, end_date, creator_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectName, projectCode, organization, chiefEngineer, description || '', address || '', startDate || null, endDate || null, userId]
    )

    return success(res, { id: result.insertId }, '创建成功')

  } catch (error) {
    console.error('创建项目错误:', error)
    return serverError(res, '创建项目失败')
  }
})

/**
 * 编辑项目
 * PUT /api/v1/projects/:id
 */
router.put('/projects/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId
    const {
      projectName,
      projectCode,
      organization,
      chiefEngineer,
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
        description = COALESCE(?, description),
        address = COALESCE(?, address),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        updated_at = NOW()
      WHERE id = ?`,
      [projectName ?? null, projectCode ?? null, organization ?? null, chiefEngineer ?? null, 
       description ?? null, address ?? null, startDate ?? null, endDate ?? null, id]
    )

    return success(res, {}, '更新成功')

  } catch (error) {
    console.error('更新项目错误:', error)
    console.error('错误详情:', {
      message: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    })
    return serverError(res, '更新项目失败')
  }
})

/**
 * 删除项目
 * DELETE /api/v1/projects/:id
 */
router.delete('/projects/:id', authenticate, async (req, res) => {
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

module.exports = router

