require('dotenv').config();

module.exports = {
  // CloudBase云托管环境配置
  cloudbase: {
    env: process.env.CLOUDBASE_ENV || 'production',
    envId: process.env.CLOUDBASE_ENV_ID || '',
  },

  // 数据库配置
  database: {
    // 根据环境自动选择内网或外网地址
    // 云托管环境(production)使用内网，本地开发(development)使用外网
    host: process.env.NODE_ENV === 'production' 
      ? (process.env.DB_HOST_INTERNAL || '10.27.100.151')
      : (process.env.DB_HOST_EXTERNAL || 'sh-cynosdbmysql-grp-goudlu7k.sql.tencentcdb.com'),
    port: process.env.NODE_ENV === 'production'
      ? parseInt(process.env.DB_PORT_INTERNAL || '3306')
      : parseInt(process.env.DB_PORT_EXTERNAL || '22087'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'express_miniapp',
    connectionLimit: 10, // 连接池大小
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 10000,
    // 字符集配置
    charset: 'utf8mb4'
  },

  // 微信小程序配置
  wechat: {
    appId: process.env.WECHAT_APPID || '',
    appSecret: process.env.WECHAT_APPSECRET || '',
    // 微信登录API
    loginUrl: 'https://api.weixin.qq.com/sns/jscode2session',
    // 获取AccessToken API
    tokenUrl: 'https://api.weixin.qq.com/cgi-bin/token'
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: '7d' // token有效期
  },

  // 豆包AI配置
  doubao: {
    apiKey: process.env.DOUBAO_API_KEY || '',
    endpointId: process.env.DOUBAO_ENDPOINT_ID || '',  // 推理接入点ID
    apiUrl: process.env.DOUBAO_API_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    maxTokens: 2048,
    temperature: 0.8
  },

  // 服务配置
  server: {
    port: parseInt(process.env.PORT) || 80,
    serviceName: process.env.SERVICE_NAME || 'supervision-log-api',
    domain: process.env.SERVICE_DOMAIN || 'http://localhost'
  },

  // 和风天气配置（JWT认证）
  qweather: {
    // JWT认证配置
    keyId: process.env.QWEATHER_KEY_ID || '',
    projectId: process.env.QWEATHER_PROJECT_ID || '',
    privateKey: process.env.QWEATHER_PRIVATE_KEY || '',
    // API Host（专属域名，JWT认证必需）
    apiHost: process.env.QWEATHER_API_HOST || 'https://ma4bjadbw4.re.qweatherapi.com',
    timeout: 8000,
    cacheTime: 300 // 缓存5分钟
  },

};

