const mysql = require('mysql2/promise');
const config = require('./index');

// 输出数据库连接配置信息（隐藏密码）
console.log('==================================');
console.log('数据库连接配置:');
console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
console.log(`地址: ${config.database.host}:${config.database.port}`);
console.log(`数据库: ${config.database.database}`);
console.log(`用户: ${config.database.user}`);
console.log(`连接类型: ${process.env.NODE_ENV === 'production' ? '内网' : '外网'}`);
console.log('==================================');

// 创建数据库连接池，确保使用UTF8MB4字符集
const pool = mysql.createPool({
  ...config.database,
  charset: 'utf8mb4',
  // 确保连接时设置字符集
  typeCast: function (field, next) {
    if (field.type === 'VAR_STRING' || field.type === 'STRING' || field.type === 'TEXT') {
      return field.string();
    }
    return next();
  }
});

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    // 设置连接字符集为UTF8MB4
    await connection.execute('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
    await connection.execute('SET CHARACTER_SET_CLIENT = utf8mb4');
    await connection.execute('SET CHARACTER_SET_CONNECTION = utf8mb4');
    await connection.execute('SET CHARACTER_SET_RESULTS = utf8mb4');
    console.log('✓ 数据库连接成功（字符集: UTF8MB4）');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ 数据库连接失败:', error.message);
    return false;
  }
}

// 执行查询
async function query(sql, params) {
  try {
    // 使用连接池的execute方法，会自动管理连接
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

// 执行事务
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    // 确保使用UTF8MB4字符集
    await connection.execute('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};

