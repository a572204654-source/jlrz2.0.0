const express = require('express')
const router = express.Router()
const { success, badRequest, serverError, notFound, forbidden } = require('../../utils/response')
const { query } = require('../../config/database')
const { authenticate } = require('../../middleware/auth')

/**
 * 获取监理日志列表
 * GET /api/v1/supervision-logs
 */
router.get('/supervision-logs', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const projectId = req.query.projectId
    const workId = req.query.workId
    const filterUserId = req.query.userId
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const offset = (page - 1) * pageSize

    // 构建查询条件
    let whereClause = '1=1'
    const params = []
    const statsParams = []

    if (projectId) {
      whereClause += ' AND sl.project_id = ?'
      params.push(projectId)
      statsParams.push(projectId)
    }

    if (workId) {
      whereClause += ' AND sl.work_id = ?'
      params.push(workId)
      statsParams.push(workId)
    }

    if (filterUserId) {
      whereClause += ' AND sl.user_id = ?'
      params.push(filterUserId)
      statsParams.push(filterUserId)
    } else {
      // 如果没有指定用户ID，默认查询当前用户的
      whereClause += ' AND sl.user_id = ?'
      params.push(userId)
      statsParams.push(userId)
    }

    if (startDate) {
      whereClause += ' AND sl.log_date >= ?'
      params.push(startDate)
      statsParams.push(startDate)
    }

    if (endDate) {
      whereClause += ' AND sl.log_date <= ?'
      params.push(endDate)
      statsParams.push(endDate)
    }

    // 查询统计信息
    const [stats] = await query(
      `SELECT 
        COUNT(CASE WHEN DATE_FORMAT(log_date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') THEN 1 END) as monthCount,
        COUNT(*) as totalCount
       FROM supervision_logs sl
       WHERE ${whereClause}`,
      statsParams
    )

    // 查询监理日志列表
    const logs = await query(
      `SELECT 
        sl.id,
        sl.project_id as projectId,
        p.project_name as projectName,
        sl.work_id as workId,
        w.work_name as workName,
        sl.user_id as userId,
        u.nickname as userName,
        sl.log_date as logDate,
        DATE_FORMAT(sl.log_date, '%Y-%m-%d') as logDateText,
        sl.weather,
        sl.created_at as createdAt
       FROM supervision_logs sl
       LEFT JOIN projects p ON sl.project_id = p.id
       LEFT JOIN works w ON sl.work_id = w.id
       LEFT JOIN users u ON sl.user_id = u.id
       WHERE ${whereClause}
       ORDER BY sl.log_date DESC, sl.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    // 查询总数
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM supervision_logs sl WHERE ${whereClause}`,
      params
    )

    return success(res, {
      total: countResult.total,
      page,
      pageSize,
      stats: {
        monthCount: stats.monthCount || 0,
        totalCount: stats.totalCount || 0
      },
      list: logs
    })

  } catch (error) {
    console.error('获取监理日志列表错误:', error)
    return serverError(res, '获取监理日志列表失败')
  }
})

/**
 * 获取监理日志详情
 * GET /api/v1/supervision-logs/:id
 */
router.get('/supervision-logs/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询监理日志详情 - 只能查看自己创建的日志
    const logs = await query(
      `SELECT 
        sl.id,
        sl.project_id as projectId,
        p.project_name as projectName,
        p.project_code as projectCode,
        sl.work_id as workId,
        w.work_name as workName,
        w.work_code as workCode,
        sl.user_id as userId,
        u.nickname as userName,
        sl.log_date as logDate,
        sl.weather,
        sl.project_dynamics as projectDynamics,
        sl.supervision_work as supervisionWork,
        sl.safety_work as safetyWork,
        sl.recorder_name as recorderName,
        sl.recorder_date as recorderDate,
        sl.reviewer_name as reviewerName,
        sl.reviewer_date as reviewerDate,
        sl.created_at as createdAt
       FROM supervision_logs sl
       LEFT JOIN projects p ON sl.project_id = p.id
       LEFT JOIN works w ON sl.work_id = w.id
       LEFT JOIN users u ON sl.user_id = u.id
       WHERE sl.id = ? AND sl.user_id = ?`,
      [id, userId]
    )

    if (logs.length === 0) {
      return notFound(res, '监理日志不存在或无权访问')
    }

    // 查询附件
    const attachments = await query(
      `SELECT 
        id,
        file_name as fileName,
        file_type as fileType,
        file_url as fileUrl,
        file_size as fileSize
       FROM attachments
       WHERE related_type = 'log' AND related_id = ?
       ORDER BY created_at ASC`,
      [id]
    )

    const log = logs[0]
    log.attachments = attachments

    return success(res, log)

  } catch (error) {
    console.error('获取监理日志详情错误:', error)
    return serverError(res, '获取监理日志详情失败')
  }
})

/**
 * 新增监理日志
 * POST /api/v1/supervision-logs
 */
router.post('/supervision-logs', authenticate, async (req, res) => {
  try {
    const userId = req.userId
    const {
      projectId,
      workId,
      logDate,
      weather,
      projectDynamics,
      supervisionWork,
      safetyWork,
      recorderName,
      recorderDate,
      reviewerName,
      reviewerDate
    } = req.body

    // 参数验证
    if (!projectId) {
      return badRequest(res, '项目ID不能为空')
    }
    if (!workId) {
      return badRequest(res, '工程ID不能为空')
    }
    if (!logDate) {
      return badRequest(res, '日志日期不能为空')
    }
    if (!weather) {
      return badRequest(res, '气象情况不能为空')
    }
    if (!projectDynamics) {
      return badRequest(res, '工程动态不能为空')
    }
    if (!supervisionWork) {
      return badRequest(res, '监理工作情况不能为空')
    }
    if (!safetyWork) {
      return badRequest(res, '安全监理工作情况不能为空')
    }

    // 检查项目是否存在
    const projects = await query(
      'SELECT id FROM projects WHERE id = ?',
      [projectId]
    )

    if (projects.length === 0) {
      return notFound(res, '项目不存在')
    }

    // 检查工程是否存在
    const works = await query(
      'SELECT id FROM works WHERE id = ? AND project_id = ?',
      [workId, projectId]
    )

    if (works.length === 0) {
      return notFound(res, '工程不存在或不属于该项目')
    }

    // 检查该工程该日期是否已有日志
    const existing = await query(
      'SELECT id FROM supervision_logs WHERE work_id = ? AND log_date = ?',
      [workId, logDate]
    )

    if (existing.length > 0) {
      return badRequest(res, '该工程在此日期已有监理日志')
    }

    // 创建监理日志
    const result = await query(
      `INSERT INTO supervision_logs 
        (project_id, work_id, user_id, log_date, weather, project_dynamics, supervision_work, safety_work, 
         recorder_name, recorder_date, reviewer_name, reviewer_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, workId, userId, logDate, weather, projectDynamics, supervisionWork, safetyWork, 
       recorderName || '', recorderDate || null, reviewerName || '', reviewerDate || null]
    )

    return success(res, { id: result.insertId }, '保存成功')

  } catch (error) {
    console.error('创建监理日志错误:', error)
    return serverError(res, '保存失败')
  }
})

/**
 * 编辑监理日志
 * PUT /api/v1/supervision-logs/:id
 */
router.put('/supervision-logs/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId
    const {
      logDate,
      weather,
      projectDynamics,
      supervisionWork,
      safetyWork,
      recorderName,
      recorderDate,
      reviewerName,
      reviewerDate
    } = req.body

    // 查询监理日志 - 验证权限
    const logs = await query(
      'SELECT * FROM supervision_logs WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    if (logs.length === 0) {
      return notFound(res, '监理日志不存在或无权操作')
    }

    // 如果修改了日期，检查是否重复
    if (logDate) {
      // 将数据库日期转换为字符串格式进行比较
      const dbLogDate = logs[0].log_date ? new Date(logs[0].log_date).toISOString().split('T')[0] : null
      if (logDate !== dbLogDate) {
        const existing = await query(
          'SELECT id FROM supervision_logs WHERE work_id = ? AND log_date = ? AND id != ?',
          [logs[0].work_id, logDate, id]
        )

        if (existing.length > 0) {
          return badRequest(res, '该工程在此日期已有监理日志')
        }
      }
    }

    // 更新监理日志
    await query(
      `UPDATE supervision_logs SET 
        log_date = COALESCE(?, log_date),
        weather = COALESCE(?, weather),
        project_dynamics = COALESCE(?, project_dynamics),
        supervision_work = COALESCE(?, supervision_work),
        safety_work = COALESCE(?, safety_work),
        recorder_name = COALESCE(?, recorder_name),
        recorder_date = COALESCE(?, recorder_date),
        reviewer_name = COALESCE(?, reviewer_name),
        reviewer_date = COALESCE(?, reviewer_date),
        updated_at = NOW()
      WHERE id = ?`,
      [logDate ?? null, weather ?? null, projectDynamics ?? null, supervisionWork ?? null, 
       safetyWork ?? null, recorderName ?? null, recorderDate ?? null, reviewerName ?? null, 
       reviewerDate ?? null, id]
    )

    return success(res, {}, '更新成功')

  } catch (error) {
    console.error('更新监理日志错误:', error)
    console.error('请求参数:', req.body)
    return serverError(res, '更新失败')
  }
})

/**
 * 删除监理日志
 * DELETE /api/v1/supervision-logs/:id
 */
router.delete('/supervision-logs/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    // 查询监理日志 - 验证权限
    const logs = await query(
      'SELECT * FROM supervision_logs WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    if (logs.length === 0) {
      return notFound(res, '监理日志不存在或无权操作')
    }

    // 删除关联的附件
    await query('DELETE FROM attachments WHERE related_type = ? AND related_id = ?', ['log', id])

    // 删除监理日志
    await query('DELETE FROM supervision_logs WHERE id = ?', [id])

    return success(res, {}, '删除成功')

  } catch (error) {
    console.error('删除监理日志错误:', error)
    return serverError(res, '删除失败')
  }
})

/**
 * 导出监理日志（Word）
 * GET /api/v1/supervision-logs/:id/export
 */
router.get('/supervision-logs/:id/export', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    // 查询监理日志详情
    const logs = await query(
      `SELECT 
        sl.*,
        p.project_name,
        p.project_code,
        p.organization,
        p.chief_engineer,
        p.start_date as project_start_date,
        p.end_date as project_end_date,
        w.work_name,
        w.project_work_code,
        w.work_code,
        w.unit_work,
        u.nickname as user_name
       FROM supervision_logs sl
       LEFT JOIN projects p ON sl.project_id = p.id
       LEFT JOIN works w ON sl.work_id = w.id
       LEFT JOIN users u ON sl.user_id = u.id
       WHERE sl.id = ?`,
      [id]
    )

    if (logs.length === 0) {
      return notFound(res, '监理日志不存在')
    }

    const logData = logs[0]

    // 查询附件信息
    const attachments = await query(
      `SELECT 
        file_name,
        file_type,
        file_size
       FROM attachments
       WHERE related_type = 'log' AND related_id = ?
       ORDER BY created_at ASC`,
      [id]
    )

    // 添加附件信息到日志数据
    logData.attachments = attachments

    // 导入Word生成工具
    const { generateSupervisionLogWord } = require('../../utils/wordGenerator')

    // 生成Word文档
    const wordBuffer = await generateSupervisionLogWord(logData)

    // 格式化日期用于文件名
    const dateStr = logData.log_date ? 
      new Date(logData.log_date).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0]
    
    const fileName = `监理日志_${dateStr}.docx`

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    res.setHeader('Content-Length', wordBuffer.length)

    // 返回文件流
    res.send(wordBuffer)

  } catch (error) {
    console.error('导出监理日志错误:', error)
    return serverError(res, '导出失败')
  }
})

module.exports = router

