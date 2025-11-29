const express = require('express')
const router = express.Router()

// 导入各模块路由
const authRouter = require('./auth')
const userRouter = require('./user')
const projectRouter = require('./project')
const workRouter = require('./work')
const supervisionLogRouter = require('./supervision-log')
const aiChatRouter = require('./ai-chat')
const aiProviderRouter = require('./ai-provider')
const attachmentRouter = require('./attachment')
const weatherRouter = require('./weather')

// 注册各模块路由
router.use('/auth', authRouter)
router.use('/user', userRouter)
router.use('/projects', projectRouter)
router.use('/works', workRouter)
router.use('/supervision-logs', supervisionLogRouter)
router.use('/ai/chat', aiChatRouter)  // AI聊天API（支持文件上传、多模态）
router.use('/ai', aiProviderRouter)
router.use('/attachments', attachmentRouter)
router.use('/weather', weatherRouter)

// API根路径
router.get('/', (req, res) => {
  res.json({
    name: 'CloudBase 监理日志小程序 API',
    version: '1.0.0',
    description: '基于Express + MySQL的监理日志小程序后端服务',
    modules: {
      auth: '认证模块 - 微信登录、退出登录',
      user: '用户模块 - 用户信息、统计数据',
      project: '项目模块 - 项目CRUD',
      work: '工程模块 - 工程CRUD',
      supervisionLog: '监理日志模块 - 日志CRUD、导出',
      aiChat: 'AI助手模块 - 对话管理',
      attachment: '附件模块 - 附件管理',
      weather: '气象模块 - 根据位置获取气象信息'
    },
    endpoints: {
      auth: '/api/auth/* - 认证相关接口',
      user: '/api/user/* - 用户相关接口',
      projects: '/api/projects - 项目相关接口',
      works: '/api/works - 工程相关接口',
      supervisionLogs: '/api/supervision-logs - 监理日志相关接口',
      aiChat: '/api/ai/chat/* - AI聊天（支持文件上传、多模态）',
      aiProvider: '/api/ai/provider-key - AI提供商密钥接口',
      attachments: '/api/attachments - 附件相关接口',
      weather: '/api/weather/current - 气象相关接口'
    }
  })
})

module.exports = router

