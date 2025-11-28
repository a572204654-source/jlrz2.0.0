/**
 * 测试监理日志Word导出功能
 */
const path = require('path')
const fs = require('fs')

// 引入Word生成器
const { generateSupervisionLogWord } = require('../utils/wordGenerator')

// 模拟监理日志数据
const mockLogData = {
  // 项目信息
  project_name: '某水利工程项目',
  project_code: 'SL-2024-001',
  
  // 工程信息
  work_name: '主体工程',
  work_code: 'ZT-001',
  unit_work: '大坝混凝土浇筑',
  unit_work_code: 'DB-001',
  
  // 监理机构信息
  organization: 'XX监理有限公司',
  chief_engineer: '张三',
  specialist_engineer: '李四',
  
  // 日期信息
  project_start_date: '2024-01-01',
  project_end_date: '2024-12-31',
  log_date: '2024-11-28',
  
  // 日志内容
  weather: '晴，温度15-22℃，东南风3级',
  project_dynamics: `1. 今日施工人员120人，其中管理人员15人，技术人员25人，普通工人80人。
2. 主要施工设备：挖掘机3台，装载机2台，混凝土搅拌车5台，振捣器8台。
3. 大坝C30混凝土浇筑，完成工程量约280立方米。
4. 模板安装作业持续进行，完成安装面积约150平方米。`,
  supervision_work: `1. 进行大坝混凝土浇筑旁站监理，检查混凝土坍落度、和易性。
2. 复核混凝土原材料进场检验报告，水泥、砂石等材料合格。
3. 检查钢筋绑扎质量，间距、保护层厚度符合设计要求。
4. 签发监理通知单1份，要求加强混凝土养护措施。
5. 参加施工方组织的技术交底会议。`,
  safety_work: `1. 巡查施工现场安全文明施工情况，未发现重大安全隐患。
2. 检查施工人员安全防护用品佩戴情况，个别人员安全帽佩戴不规范，已现场督促整改。
3. 检查临边洞口防护设施，防护完善。
4. 检查用电安全，配电箱、电缆布设规范。`,
  
  // 签名信息
  recorder_name: '李四',
  recorder_date: '2024-11-28',
  reviewer_name: '张三',
  reviewer_date: '2024-11-28'
}

async function testWordExport() {
  console.log('='.repeat(50))
  console.log('开始测试监理日志Word导出功能')
  console.log('='.repeat(50))
  
  try {
    console.log('\n正在生成Word文档...')
    
    // 生成Word文档
    const wordBuffer = await generateSupervisionLogWord(mockLogData)
    
    console.log(`✓ Word文档生成成功，大小: ${(wordBuffer.length / 1024).toFixed(2)} KB`)
    
    // 保存到output目录
    const outputDir = path.join(__dirname, '../output')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const outputPath = path.join(outputDir, `监理日志_测试_${timestamp}.docx`)
    
    fs.writeFileSync(outputPath, wordBuffer)
    console.log(`✓ 文件已保存: ${outputPath}`)
    
    console.log('\n' + '='.repeat(50))
    console.log('测试完成！请打开生成的文件检查格式是否正确。')
    console.log('='.repeat(50))
    
    return true
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message)
    console.error('详细错误:', error.stack)
    return false
  }
}

// 运行测试
testWordExport()
