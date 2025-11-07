/**
 * 监理日志调试脚本
 * 用于排查Word导出问题
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST_EXTERNAL,
  port: process.env.DB_PORT_EXTERNAL,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}

async function debugSupervisionLogs() {
  let connection
  
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 监理日志数据库调试')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // 连接数据库
    console.log('🔌 连接数据库...')
    console.log(`   地址: ${dbConfig.host}:${dbConfig.port}`)
    console.log(`   数据库: ${dbConfig.database}`)
    console.log(`   用户: ${dbConfig.user}\n`)
    
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ 数据库连接成功!\n')
    
    // 1. 检查相关表是否存在
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 第1步：检查数据库表')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const tables = ['supervision_logs', 'projects', 'works', 'attachments', 'users']
    
    for (const table of tables) {
      const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`)
      if (rows.length > 0) {
        console.log(`✅ ${table} 表存在`)
      } else {
        console.log(`❌ ${table} 表不存在`)
      }
    }
    
    // 2. 查询监理日志总数
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 第2步：统计监理日志数据')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const [totalRows] = await connection.query('SELECT COUNT(*) as total FROM supervision_logs')
    console.log(`📝 监理日志总数: ${totalRows[0].total}`)
    
    const [activeRows] = await connection.query('SELECT COUNT(*) as total FROM supervision_logs WHERE status = 1')
    console.log(`✅ 正常状态日志: ${activeRows[0].total}`)
    
    const [deletedRows] = await connection.query('SELECT COUNT(*) as total FROM supervision_logs WHERE status = 2')
    console.log(`🗑️  已删除日志: ${deletedRows[0].total}`)
    
    // 3. 查询最近的5条日志
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 第3步：最近的监理日志')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const [recentLogs] = await connection.query(`
      SELECT 
        sl.id,
        sl.user_id,
        sl.title,
        sl.status,
        sl.log_date,
        sl.project_id,
        sl.work_id,
        sl.created_at,
        u.nickname as user_name
      FROM supervision_logs sl
      LEFT JOIN users u ON sl.user_id = u.id
      ORDER BY sl.created_at DESC
      LIMIT 5
    `)
    
    if (recentLogs.length === 0) {
      console.log('⚠️  暂无监理日志')
    } else {
      console.log('最近的5条日志：\n')
      recentLogs.forEach((log, index) => {
        console.log(`${index + 1}. 日志ID: ${log.id}`)
        console.log(`   标题: ${log.title}`)
        console.log(`   用户: ${log.user_name} (ID: ${log.user_id})`)
        console.log(`   状态: ${log.status === 1 ? '正常' : log.status === 2 ? '已删除' : '未知'}`)
        console.log(`   日期: ${log.log_date}`)
        console.log(`   项目ID: ${log.project_id || '无'}`)
        console.log(`   工程ID: ${log.work_id || '无'}`)
        console.log(`   创建时间: ${log.created_at}`)
        console.log('')
      })
    }
    
    // 4. 检查关联数据完整性
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔗 第4步：检查关联数据完整性')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // 检查有多少日志关联了项目
    const [withProject] = await connection.query(`
      SELECT COUNT(*) as total 
      FROM supervision_logs sl
      LEFT JOIN projects p ON sl.project_id = p.id
      WHERE sl.status = 1 AND sl.project_id IS NOT NULL AND p.id IS NOT NULL
    `)
    console.log(`✅ 关联了有效项目的日志: ${withProject[0].total}`)
    
    // 检查有多少日志关联了工程
    const [withWork] = await connection.query(`
      SELECT COUNT(*) as total 
      FROM supervision_logs sl
      LEFT JOIN works w ON sl.work_id = w.id
      WHERE sl.status = 1 AND sl.work_id IS NOT NULL AND w.id IS NOT NULL
    `)
    console.log(`✅ 关联了有效工程的日志: ${withWork[0].total}`)
    
    // 检查有多少日志有附件
    const [withAttachments] = await connection.query(`
      SELECT COUNT(DISTINCT related_id) as total 
      FROM attachments 
      WHERE related_type = 'log'
    `)
    console.log(`📎 有附件的日志: ${withAttachments[0].total}`)
    
    // 5. 检查孤立数据（可能导致查询失败）
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  第5步：检查数据问题')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // 检查关联了不存在的项目
    const [orphanProjects] = await connection.query(`
      SELECT COUNT(*) as total 
      FROM supervision_logs sl
      LEFT JOIN projects p ON sl.project_id = p.id
      WHERE sl.status = 1 AND sl.project_id IS NOT NULL AND p.id IS NULL
    `)
    if (orphanProjects[0].total > 0) {
      console.log(`❌ 关联了不存在项目的日志: ${orphanProjects[0].total}`)
      
      // 显示这些问题日志
      const [problemLogs] = await connection.query(`
        SELECT sl.id, sl.title, sl.project_id
        FROM supervision_logs sl
        LEFT JOIN projects p ON sl.project_id = p.id
        WHERE sl.status = 1 AND sl.project_id IS NOT NULL AND p.id IS NULL
        LIMIT 5
      `)
      
      console.log('   问题日志示例：')
      problemLogs.forEach(log => {
        console.log(`   - 日志ID: ${log.id}, 标题: ${log.title}, 无效项目ID: ${log.project_id}`)
      })
    } else {
      console.log('✅ 所有日志的项目关联都正常')
    }
    
    // 检查关联了不存在的工程
    const [orphanWorks] = await connection.query(`
      SELECT COUNT(*) as total 
      FROM supervision_logs sl
      LEFT JOIN works w ON sl.work_id = w.id
      WHERE sl.status = 1 AND sl.work_id IS NOT NULL AND w.id IS NULL
    `)
    if (orphanWorks[0].total > 0) {
      console.log(`❌ 关联了不存在工程的日志: ${orphanWorks[0].total}`)
    } else {
      console.log('✅ 所有日志的工程关联都正常')
    }
    
    // 6. 测试导出查询
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🧪 第6步：测试导出SQL查询')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    if (recentLogs.length > 0) {
      const testLogId = recentLogs[0].id
      console.log(`测试日志ID: ${testLogId}\n`)
      
      // 执行与导出接口相同的查询
      const [exportTest] = await connection.query(`
        SELECT 
          sl.*,
          p.project_name,
          p.project_code,
          w.work_name,
          w.work_code,
          u.nickname as user_name
        FROM supervision_logs sl
        LEFT JOIN projects p ON sl.project_id = p.id
        LEFT JOIN works w ON sl.work_id = w.id
        LEFT JOIN users u ON sl.user_id = u.id
        WHERE sl.id = ?
      `, [testLogId])
      
      if (exportTest.length > 0) {
        const log = exportTest[0]
        console.log('✅ 导出查询成功！')
        console.log('\n查询结果：')
        console.log(`  日志ID: ${log.id}`)
        console.log(`  标题: ${log.title}`)
        console.log(`  日期: ${log.log_date}`)
        console.log(`  天气: ${log.weather || '未填写'}`)
        console.log(`  温度: ${log.temperature || '未填写'}`)
        console.log(`  项目: ${log.project_name || '未关联'}`)
        console.log(`  工程: ${log.work_name || '未关联'}`)
        console.log(`  用户: ${log.user_name}`)
        console.log(`  内容: ${log.content ? log.content.substring(0, 50) + '...' : '无'}`)
        
        // 查询附件
        const [attachments] = await connection.query(`
          SELECT file_name, file_type, file_size
          FROM attachments
          WHERE related_type = 'log' AND related_id = ?
        `, [testLogId])
        
        console.log(`  附件数量: ${attachments.length}`)
        
        console.log('\n✅ 这个日志应该可以正常导出！')
      } else {
        console.log('❌ 导出查询失败！日志不存在')
      }
    }
    
    // 7. 用户信息
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👤 第7步：用户信息统计')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const [userStats] = await connection.query(`
      SELECT COUNT(*) as total FROM users WHERE status = 1
    `)
    console.log(`👥 活跃用户数: ${userStats[0].total}`)
    
    const [usersWithLogs] = await connection.query(`
      SELECT 
        u.id,
        u.nickname,
        u.openid,
        COUNT(sl.id) as log_count
      FROM users u
      LEFT JOIN supervision_logs sl ON u.id = sl.user_id AND sl.status = 1
      WHERE u.status = 1
      GROUP BY u.id
      HAVING log_count > 0
      ORDER BY log_count DESC
      LIMIT 10
    `)
    
    console.log('\n创建日志最多的用户：')
    usersWithLogs.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.nickname} (ID: ${user.id}) - ${user.log_count}条日志`)
    })
    
    // 8. 推荐测试的日志ID
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 推荐用于测试的日志')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const [testLogs] = await connection.query(`
      SELECT 
        sl.id,
        sl.title,
        sl.user_id,
        u.nickname,
        sl.project_id,
        p.project_name,
        sl.work_id,
        w.work_name,
        COUNT(a.id) as attachment_count
      FROM supervision_logs sl
      LEFT JOIN users u ON sl.user_id = u.id
      LEFT JOIN projects p ON sl.project_id = p.id
      LEFT JOIN works w ON sl.work_id = w.id
      LEFT JOIN attachments a ON a.related_type = 'log' AND a.related_id = sl.id
      WHERE sl.status = 1
      GROUP BY sl.id
      ORDER BY sl.created_at DESC
      LIMIT 5
    `)
    
    if (testLogs.length > 0) {
      console.log('以下日志数据完整，适合用于测试导出：\n')
      testLogs.forEach((log, index) => {
        console.log(`${index + 1}. 日志ID: ${log.id}`)
        console.log(`   标题: ${log.title}`)
        console.log(`   用户: ${log.nickname} (ID: ${log.user_id})`)
        console.log(`   项目: ${log.project_name || '❌ 未关联'}`)
        console.log(`   工程: ${log.work_name || '❌ 未关联'}`)
        console.log(`   附件: ${log.attachment_count}个`)
        console.log(`   推荐度: ${log.project_name && log.work_name ? '⭐⭐⭐' : log.project_name || log.work_name ? '⭐⭐' : '⭐'}`)
        console.log('')
      })
      
      console.log('💡 建议：')
      console.log('   1. 使用带 ⭐⭐⭐ 的日志进行测试（数据最完整）')
      console.log(`   2. 在小程序中使用这个日志ID: ${testLogs[0].id}`)
      console.log(`   3. 确认当前登录用户ID是: ${testLogs[0].user_id}`)
    } else {
      console.log('⚠️  暂无可用的日志进行测试')
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 调试完成！')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
  } catch (error) {
    console.error('\n❌ 调试出错:', error.message)
    console.error('\n详细错误:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 数据库连接已关闭')
    }
  }
}

// 运行调试
debugSupervisionLogs()

