/**
 * 调试现有监理日志的导出数据结构
 */

const axios = require('axios')

const API_BASE = 'https://api.yimengpl.com'

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('')
  log('━'.repeat(80), 'blue')
  log(`  ${title}`, 'yellow')
  log('━'.repeat(80), 'blue')
  console.log('')
}

async function debugExistingLog() {
  try {
    logSection('调试现有监理日志数据结构')

    // 1. 登录
    log('步骤1: 用户登录', 'yellow')
    const loginRes = await axios.post(`${API_BASE}/api/auth/test-login`, {
      openid: 'test_openid_001'
    })

    if (loginRes.data.code !== 0) {
      log(`❌ 登录失败: ${loginRes.data.message}`, 'red')
      return
    }

    const token = loginRes.data.data.token
    log(`✅ 登录成功`, 'green')
    console.log('')

    // 2. 获取监理日志列表
    log('步骤2: 获取监理日志列表', 'yellow')
    const listRes = await axios.get(`${API_BASE}/api/supervision-logs?page=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (listRes.data.data.list.length === 0) {
      log(`❌ 没有找到监理日志`, 'red')
      return
    }

    const firstLog = listRes.data.data.list[0]
    const logId = firstLog.id
    log(`✅ 找到监理日志`, 'green')
    log(`   日志ID: ${logId}`, 'gray')
    log(`   日志日期: ${firstLog.log_date}`, 'gray')
    console.log('')

    // 3. 获取监理日志详情
    logSection('步骤3: 查询监理日志详情')
    
    const detailRes = await axios.get(
      `${API_BASE}/api/supervision-logs/${logId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    const logData = detailRes.data.data
    
    log('✅ 查询成功，以下是完整的数据结构：', 'green')
    console.log('')
    
    // 打印完整的JSON数据
    log('【完整JSON数据】', 'yellow')
    console.log(JSON.stringify(logData, null, 2))
    console.log('')

    // 分析关键字段
    logSection('关键字段分析')
    
    const fields = [
      { label: '项目名称', keys: ['project_name', 'projectName'], value: logData.project_name || logData.projectName },
      { label: '项目编号', keys: ['project_code', 'projectCode'], value: logData.project_code || logData.projectCode },
      { label: '单项工程名称', keys: ['work_name', 'workName'], value: logData.work_name || logData.workName },
      { label: '单项工程编号', keys: ['work_code', 'workCode'], value: logData.work_code || logData.workCode },
      { label: '单位工程名称', keys: ['unit_work', 'unitWork'], value: logData.unit_work || logData.unitWork },
      { label: '监理机构', keys: ['organization'], value: logData.organization },
      { label: '总监理工程师', keys: ['chief_engineer', 'chiefEngineer'], value: logData.chief_engineer || logData.chiefEngineer },
      { label: '项目开始日期', keys: ['project_start_date', 'projectStartDate', 'start_date', 'startDate'], value: logData.project_start_date || logData.projectStartDate || logData.start_date || logData.startDate },
      { label: '项目结束日期', keys: ['project_end_date', 'projectEndDate', 'end_date', 'endDate'], value: logData.project_end_date || logData.projectEndDate || logData.end_date || logData.endDate }
    ]

    log('【关键字段检查】', 'yellow')
    console.log('')
    
    fields.forEach(field => {
      const status = field.value ? '✅' : '❌'
      const color = field.value ? 'green' : 'red'
      log(`${status} ${field.label}:`, color)
      log(`   可能的字段名: ${field.keys.join(', ')}`, 'gray')
      log(`   实际值: ${field.value || '【缺失】'}`, field.value ? 'blue' : 'red')
      console.log('')
    })

    logSection('总结')
    
    const missingFields = fields.filter(f => !f.value)
    if (missingFields.length > 0) {
      log(`❌ 发现${missingFields.length}个字段缺失：`, 'red')
      missingFields.forEach(f => {
        log(`   - ${f.label}`, 'red')
      })
      console.log('')
      log('💡 建议：检查 routes/supervision-log.js 中的导出查询SQL', 'yellow')
      log('   确保 LEFT JOIN 查询包含了所有需要的字段', 'yellow')
    } else {
      log('🎉 所有字段都存在！', 'green')
    }

  } catch (error) {
    console.error('')
    log('❌ 发生错误:', 'red')
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2))
    } else {
      console.error(error.message)
      console.error(error.stack)
    }
  }
}

// 运行调试
debugExistingLog()

