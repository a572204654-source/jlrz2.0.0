#!/usr/bin/env node

/**
 * 测试修复后的Word导出功能 - 验证缺失字段
 * 
 * 本脚本测试以下修复：
 * 1. ✅ 单项工程名称（应该显示work_name）
 * 2. ✅ 单位工程名称（应该显示unit_work）
 * 3. ✅ 监理日志起止时间（应该显示项目的start_date和end_date）
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// 云托管环境配置
const API_BASE_URL = 'https://api.yimengpl.com'

// 测试用户信息
const TEST_USER = {
  openid: 'test_openid_001',
  nickname: '张三'
}

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function separator(title = '') {
  console.log('')
  log('━'.repeat(80), 'cyan')
  if (title) {
    log(`  ${title}`, 'yellow')
    log('━'.repeat(80), 'cyan')
  }
  console.log('')
}

// 创建输出目录
const outputDir = path.join(__dirname, 'test-output')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// 全局变量存储测试数据
let token = ''
let projectId = null
let workId = null
let logId = null

/**
 * 步骤1: 用户登录
 */
async function login() {
  separator('步骤1: 用户登录')
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/test-login`, {
      openid: TEST_USER.openid
    })
    
    if (response.data.code === 0) {
      token = response.data.data.token
      log('✅ 登录成功', 'green')
      log(`ℹ️  Token: ${token.substring(0, 50)}...`, 'gray')
      log(`ℹ️  用户ID: ${response.data.data.userInfo.id}`, 'gray')
      log(`ℹ️  用户昵称: ${response.data.data.userInfo.nickname}`, 'gray')
      return true
    } else {
      log(`❌ 登录失败: ${response.data.message}`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ 登录请求失败: ${error.message}`, 'red')
    if (error.response) {
      log(`   状态码: ${error.response.status}`, 'red')
      log(`   响应: ${JSON.stringify(error.response.data)}`, 'red')
    }
    return false
  }
}

/**
 * 步骤2: 创建测试项目（包含完整字段）
 */
async function createProject() {
  separator('步骤2: 创建测试项目')
  
  const timestamp = Date.now()
  const projectData = {
    projectName: `字段修复测试项目-${timestamp}`,
    projectCode: `TEST-FIX-${timestamp}`,
    organization: '测试监理机构有限公司',
    chiefEngineer: '王总监',
    address: '测试地址-北京市海淀区中关村大街1号',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    description: '这是用于测试字段修复的测试项目，包含完整的起止时间'
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/projects`, projectData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.data.code === 0) {
      projectId = response.data.data.id
      log('✅ 项目创建成功', 'green')
      log(`ℹ️  项目ID: ${projectId}`, 'gray')
      log(`ℹ️  项目名称: ${projectData.projectName}`, 'gray')
      log(`ℹ️  项目编号: ${projectData.projectCode}`, 'gray')
      log(`ℹ️  监理机构: ${projectData.organization}`, 'gray')
      log(`ℹ️  总监: ${projectData.chiefEngineer}`, 'gray')
      log(`ℹ️  起止时间: ${projectData.startDate} 至 ${projectData.endDate}`, 'gray')
      return true
    } else {
      log(`❌ 项目创建失败: ${response.data.message}`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ 项目创建请求失败: ${error.message}`, 'red')
    if (error.response) {
      log(`   响应: ${JSON.stringify(error.response.data)}`, 'red')
    }
    return false
  }
}

/**
 * 步骤3: 创建测试工程（包含单位工程字段）
 */
async function createWork() {
  separator('步骤3: 创建测试工程')
  
  const timestamp = Date.now()
  const workData = {
    projectId: projectId,
    workName: `字段测试单项工程-${timestamp}`,
    workCode: `WORK-FIX-${timestamp}`,
    unitWork: '主体结构单位工程',
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    description: '这是用于测试字段修复的工程，包含单位工程信息'
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/works`, workData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.data.code === 0) {
      workId = response.data.data.id
      log('✅ 工程创建成功', 'green')
      log(`ℹ️  工程ID: ${workId}`, 'gray')
      log(`ℹ️  单项工程名称: ${workData.workName}`, 'gray')
      log(`ℹ️  单项工程编号: ${workData.workCode}`, 'gray')
      log(`ℹ️  单位工程: ${workData.unitWork}`, 'gray')
      return true
    } else {
      log(`❌ 工程创建失败: ${response.data.message}`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ 工程创建请求失败: ${error.message}`, 'red')
    if (error.response) {
      log(`   响应: ${JSON.stringify(error.response.data)}`, 'red')
    }
    return false
  }
}

/**
 * 步骤4: 创建监理日志
 */
async function createLog() {
  separator('步骤4: 创建监理日志')
  
  const logData = {
    projectId: projectId,
    workId: workId,
    logDate: '2024-06-15',
    weather: '晴',
    temperature: '25~32℃',
    windDirection: '东南风',
    windForce: '3级',
    projectDynamics: '【施工部位】\n3层框架柱\n\n【施工内容】\n混凝土浇筑\n\n【施工人员】\n15人\n\n【监理人员】\n3人\n\n【设备情况】\n混凝土泵车1台、振捣器2台\n\n【材料进场】\n商品混凝土C30\n\n【质量管理】\n检查钢筋绑扎、模板支撑\n\n【安全管理】\n检查高处作业防护\n\n【进度情况】\n按计划进行',
    constructionPart: '3层框架柱',
    constructionContent: '混凝土浇筑',
    constructionStaff: 15,
    supervisionStaff: 3,
    equipment: '混凝土泵车1台、振捣器2台',
    materials: '商品混凝土C30',
    qualityManagement: '【检查内容】\n- 钢筋绑扎质量\n- 模板支撑系统\n- 混凝土坍落度\n\n【发现问题】\n- 部分钢筋保护层厚度不足\n\n【处理措施】\n- 要求整改，增加垫块\n\n【处理状态】\n- 已整改完成',
    safetyManagement: '【检查内容】\n- 高处作业防护\n- 临边防护\n- 用电安全\n\n【发现问题】\n- 1处临边防护栏杆松动\n\n【处理措施】\n- 立即加固\n\n【处理状态】\n- 已完成',
    progressStatus: '按计划进行',
    supervisionWork: '1. 审核施工方案\n2. 旁站监理混凝土浇筑\n3. 见证取样混凝土试块3组',
    safetyWork: '1. 进行现场安全巡查\n2. 检查安全防护措施\n3. 监督安全技术交底',
    recorder: '李工',
    reviewer: '王总监'
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/supervision-logs`, logData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.data.code === 0) {
      logId = response.data.data.id
      log('✅ 监理日志创建成功', 'green')
      log(`ℹ️  日志ID: ${logId}`, 'gray')
      log(`ℹ️  日志日期: ${logData.logDate}`, 'gray')
      return true
    } else {
      log(`❌ 监理日志创建失败: ${response.data.message}`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ 监理日志创建请求失败: ${error.message}`, 'red')
    if (error.response) {
      log(`   响应: ${JSON.stringify(error.response.data)}`, 'red')
    }
    return false
  }
}

/**
 * 步骤5: 导出Word文档
 */
async function exportWord() {
  separator('步骤5: 导出Word文档（验证修复字段）')
  
  try {
    log('📤 正在请求导出...', 'cyan')
    
    const response = await axios.get(
      `${API_BASE_URL}/api/supervision-logs/${logId}/export`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'arraybuffer'
      }
    )
    
    // 检查Content-Type
    const contentType = response.headers['content-type']
    if (contentType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      log(`❌ 响应类型错误: ${contentType}`, 'red')
      return false
    }
    
    // 保存文件
    const timestamp = Date.now()
    const fileName = `监理日志-字段修复验证-${timestamp}.docx`
    const filePath = path.join(outputDir, fileName)
    
    fs.writeFileSync(filePath, response.data)
    
    const fileSize = (response.data.length / 1024).toFixed(2)
    
    log('✅ Word文档导出成功！', 'green')
    log(`ℹ️  文件路径: ${filePath}`, 'gray')
    log(`ℹ️  文件大小: ${fileSize} KB`, 'gray')
    log(`ℹ️  Content-Type: ${contentType}`, 'gray')
    
    console.log('')
    log('📋 请打开Word文档，验证以下字段：', 'yellow')
    log('   1. 单项工程名称: 应该显示 "字段测试单项工程-..."', 'cyan')
    log('   2. 单位工程名称: 应该显示 "主体结构单位工程"', 'cyan')
    log('   3. 监理日志起止时间: 应该显示 "2024-01-01 至 2024-12-31"', 'cyan')
    log('   4. 项目监理机构: 应该显示 "测试监理机构有限公司"', 'cyan')
    log('   5. 总监理工程师: 应该显示 "王总监"', 'cyan')
    
    return true
  } catch (error) {
    log(`❌ 导出失败: ${error.message}`, 'red')
    if (error.response) {
      log(`   状态码: ${error.response.status}`, 'red')
      // 如果是arraybuffer，尝试转换为文本
      if (error.response.data) {
        try {
          const text = Buffer.from(error.response.data).toString('utf-8')
          log(`   响应: ${text}`, 'red')
        } catch (e) {
          log(`   响应: [二进制数据]`, 'red')
        }
      }
    }
    return false
  }
}

/**
 * 步骤6: 清理测试数据
 */
async function cleanup() {
  separator('步骤6: 清理测试数据')
  
  let hasError = false
  
  // 删除监理日志
  if (logId) {
    try {
      await axios.delete(`${API_BASE_URL}/api/supervision-logs/${logId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      log(`✅ 删除监理日志: ${logId}`, 'green')
    } catch (error) {
      log(`❌ 删除监理日志失败: ${error.message}`, 'red')
      hasError = true
    }
  }
  
  // 删除工程
  if (workId) {
    try {
      await axios.delete(`${API_BASE_URL}/api/works/${workId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      log(`✅ 删除工程: ${workId}`, 'green')
    } catch (error) {
      log(`❌ 删除工程失败: ${error.message}`, 'red')
      hasError = true
    }
  }
  
  // 删除项目
  if (projectId) {
    try {
      await axios.delete(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      log(`✅ 删除项目: ${projectId}`, 'green')
    } catch (error) {
      log(`❌ 删除项目失败: ${error.message}`, 'red')
      hasError = true
    }
  }
  
  return !hasError
}

/**
 * 主测试流程
 */
async function main() {
  console.clear()
  
  separator('云托管 Word 导出字段修复验证测试')
  log('🎯 测试目标: 验证以下字段是否正确显示', 'cyan')
  log('   1. 单项工程名称（work_name）', 'gray')
  log('   2. 单位工程名称（unit_work）', 'gray')
  log('   3. 监理日志起止时间（project start_date ~ end_date）', 'gray')
  log('   4. 项目监理机构（organization）', 'gray')
  log('   5. 总监理工程师（chief_engineer）', 'gray')
  console.log('')
  log(`📡 API地址: ${API_BASE_URL}`, 'cyan')
  log(`📁 输出目录: ${outputDir}`, 'cyan')
  
  try {
    // 执行测试流程
    if (!await login()) {
      throw new Error('登录失败')
    }
    
    if (!await createProject()) {
      throw new Error('创建项目失败')
    }
    
    if (!await createWork()) {
      throw new Error('创建工程失败')
    }
    
    if (!await createLog()) {
      throw new Error('创建监理日志失败')
    }
    
    if (!await exportWord()) {
      throw new Error('导出Word失败')
    }
    
    // 清理数据
    await cleanup()
    
    // 测试成功
    separator('测试完成')
    log('🎉 所有测试步骤执行成功！', 'green')
    log('📄 Word文档已保存到 test-output 目录', 'cyan')
    log('👀 请打开文档查看字段是否正确显示', 'yellow')
    
  } catch (error) {
    separator('测试失败')
    log(`❌ 测试失败: ${error.message}`, 'red')
    
    // 尝试清理数据
    if (token) {
      log('\n🧹 尝试清理测试数据...', 'yellow')
      await cleanup()
    }
    
    process.exit(1)
  }
}

// 运行测试
main()

