/**
 * 删除项目编号唯一性约束
 * 该脚本会连接到数据库并删除 projects 表中 project_code 字段的唯一索引
 */

const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'sh-cynosdbmysql-grp-goudlu7k.sql.tencentcdb.com',
  port: 22087,
  user: 'a572204654',
  password: '572204654aA',
  database: 'jlzr1101-5g9kplxza13a780d',
  charset: 'utf8mb4'
};

async function removeUniqueConstraint() {
  let connection;
  
  try {
    console.log('正在连接数据库...');
    console.log(`地址: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`数据库: ${dbConfig.database}`);
    console.log(`用户: ${dbConfig.user}`);
    console.log('-----------------------------------');
    
    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 数据库连接成功');
    
    // 检查唯一索引是否存在
    console.log('\n检查项目编号唯一索引...');
    const [indexes] = await connection.execute(`
      SHOW INDEX FROM projects WHERE Key_name = 'uk_project_code'
    `);
    
    if (indexes.length === 0) {
      console.log('✓ 项目编号唯一索引不存在，无需删除');
      return;
    }
    
    console.log('✓ 找到项目编号唯一索引: uk_project_code');
    
    // 删除唯一索引
    console.log('\n正在删除项目编号唯一索引...');
    await connection.execute(`
      ALTER TABLE projects DROP INDEX uk_project_code
    `);
    
    console.log('✓ 成功删除项目编号唯一索引');
    
    // 验证删除结果
    console.log('\n验证删除结果...');
    const [verifyIndexes] = await connection.execute(`
      SHOW INDEX FROM projects WHERE Key_name = 'uk_project_code'
    `);
    
    if (verifyIndexes.length === 0) {
      console.log('✓ 验证成功：项目编号唯一索引已被删除');
      console.log('\n现在可以创建具有相同项目编号的项目了');
    } else {
      console.log('✗ 验证失败：索引仍然存在');
    }
    
  } catch (error) {
    console.error('\n✗ 执行失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('提示: 无法连接到数据库服务器，请检查：');
      console.error('  1. 数据库服务器地址和端口是否正确');
      console.error('  2. 网络连接是否正常');
      console.error('  3. 防火墙是否允许该连接');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('提示: 数据库访问被拒绝，请检查：');
      console.error('  1. 用户名和密码是否正确');
      console.error('  2. 该用户是否有权限访问该数据库');
    } else if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.error('提示: 无法删除索引，可能该索引不存在');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 执行脚本
console.log('=======================================');
console.log('删除项目编号唯一性约束');
console.log('=======================================\n');

removeUniqueConstraint()
  .then(() => {
    console.log('\n=======================================');
    console.log('脚本执行完成');
    console.log('=======================================');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行出错:', error);
    process.exit(1);
  });
