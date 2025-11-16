/**
 * 查看项目表的所有索引
 * 该脚本会连接到数据库并显示 projects 表的所有索引信息
 */

const mysql = require('mysql2/promise');
const config = require('../config');

// 使用配置文件中的数据库连接信息
const dbConfig = {
  ...config.database,
  charset: 'utf8mb4'
};

async function checkIndexes() {
  let connection;
  
  try {
    console.log('正在连接数据库...');
    console.log(`地址: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`数据库: ${dbConfig.database}`);
    console.log('-----------------------------------');
    
    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 数据库连接成功\n');
    
    // 查看表结构
    console.log('projects 表结构:');
    console.log('===================================');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM projects
    `);
    
    console.log('\n字段信息:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Key ? `[${col.Key}]` : ''} ${col.Null === 'NO' ? '必填' : '可选'}`);
    });
    
    // 查看所有索引
    console.log('\n\n索引信息:');
    console.log('===================================');
    const [indexes] = await connection.execute(`
      SHOW INDEX FROM projects
    `);
    
    if (indexes.length === 0) {
      console.log('没有找到索引');
    } else {
      const indexMap = {};
      
      indexes.forEach(idx => {
        if (!indexMap[idx.Key_name]) {
          indexMap[idx.Key_name] = {
            name: idx.Key_name,
            unique: idx.Non_unique === 0,
            columns: []
          };
        }
        indexMap[idx.Key_name].columns.push(idx.Column_name);
      });
      
      Object.values(indexMap).forEach(idx => {
        const type = idx.name === 'PRIMARY' ? 'PRIMARY KEY' : (idx.unique ? 'UNIQUE' : 'INDEX');
        console.log(`\n- ${idx.name}`);
        console.log(`  类型: ${type}`);
        console.log(`  字段: ${idx.columns.join(', ')}`);
      });
    }
    
    // 测试插入重复的项目编号
    console.log('\n\n测试重复项目编号:');
    console.log('===================================');
    const testCode = 'TEST_' + Date.now();
    
    try {
      // 第一次插入
      const [result1] = await connection.execute(`
        INSERT INTO projects (project_name, project_code, organization, chief_engineer, creator_id)
        VALUES (?, ?, ?, ?, ?)
      `, ['测试项目1', testCode, '测试机构', '测试工程师', 1]);
      
      console.log(`✓ 第一次插入成功 (ID: ${result1.insertId})`);
      
      // 第二次插入相同编号
      const [result2] = await connection.execute(`
        INSERT INTO projects (project_name, project_code, organization, chief_engineer, creator_id)
        VALUES (?, ?, ?, ?, ?)
      `, ['测试项目2', testCode, '测试机构', '测试工程师', 1]);
      
      console.log(`✓ 第二次插入成功 (ID: ${result2.insertId})`);
      console.log('\n✓ 项目编号可以重复！');
      
      // 清理测试数据
      await connection.execute(`DELETE FROM projects WHERE project_code = ?`, [testCode]);
      console.log('✓ 测试数据已清理');
      
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('✗ 项目编号不能重复（存在唯一性约束）');
        console.log(`错误信息: ${error.message}`);
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('\n✗ 执行失败:', error.message);
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
console.log('查看 projects 表索引结构');
console.log('=======================================\n');

checkIndexes()
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
