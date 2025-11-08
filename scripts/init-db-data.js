const mysql = require('mysql2/promise')
const config = require('../config')

async function initTestData() {
  let connection
  
  try {
    console.log('开始初始化测试数据...')
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      charset: config.database.charset
    })

    console.log('✓ 已连接到数据库')

    // 清空现有数据（可选）
    console.log('清理现有测试数据...')
    await connection.query('DELETE FROM attachments')
    await connection.query('DELETE FROM ai_chat_logs')
    await connection.query('DELETE FROM supervision_logs')
    await connection.query('DELETE FROM works')
    await connection.query('DELETE FROM projects')
    await connection.query('DELETE FROM users')

    // 插入测试用户
    console.log('插入测试用户数据...')
    await connection.query(`
      INSERT INTO users (id, openid, unionid, nickname, avatar, organization) VALUES
      (1, 'test_openid_001', 'test_unionid_001', '张三', 'https://example.com/avatar1.jpg', '华建监理有限公司'),
      (2, 'test_openid_002', 'test_unionid_002', '李四', 'https://example.com/avatar2.jpg', '中建监理集团'),
      (3, 'test_openid_003', 'test_unionid_003', '王五', 'https://example.com/avatar3.jpg', '华建监理有限公司')
    `)

    // 插入测试项目
    console.log('插入测试项目数据...')
    await connection.query(`
      INSERT INTO projects (id, project_name, project_code, organization, chief_engineer, description, address, start_date, end_date, creator_id) VALUES
      (1, '城市综合体建设项目', 'CTZH-2024-001', '华建监理有限公司', '李建国', '上海市浦东新区大型商业综合体项目，总建筑面积约15万平方米', '上海市浦东新区世纪大道XXX号', '2024-01-01', '2024-12-31', 1),
      (2, '高速公路改扩建工程', 'GSGLS-2024-002', '中建监理集团', '赵明', '某高速公路改扩建工程，全长约50公里', '江苏省南京市', '2024-03-01', '2025-03-01', 2),
      (3, '住宅小区建设项目', 'ZZZQ-2024-003', '华建监理有限公司', '李建国', '高端住宅小区开发项目', '上海市闵行区', '2024-06-01', '2025-06-01', 1)
    `)

    // 插入测试工程
    console.log('插入测试工程数据...')
    await connection.query(`
      INSERT INTO works (id, project_id, work_name, work_code, unit_work, start_date, end_date, color, description, creator_id) VALUES
      (1, 1, '主体结构工程', 'CTZH-2024-001-ZTJ', '第一施工段', '2024-01-01', '2024-06-30', '#0d9488', '主体结构施工监理', 1),
      (2, 1, '装饰装修工程', 'CTZH-2024-001-ZSZX', '第二施工段', '2024-07-01', '2024-12-31', '#2563eb', '装饰装修施工监理', 1),
      (3, 1, '机电安装工程', 'CTZH-2024-001-JDAZ', '第三施工段', '2024-08-01', '2024-12-31', '#dc2626', '机电设备安装监理', 1),
      (4, 2, '路基工程', 'GSGLS-2024-002-LJ', '全线', '2024-03-01', '2024-08-31', '#7c3aed', '路基施工监理', 2),
      (5, 2, '路面工程', 'GSGLS-2024-002-LM', '全线', '2024-09-01', '2025-03-01', '#ea580c', '路面施工监理', 2)
    `)

    // 插入测试监理日志
    console.log('插入测试监理日志数据...')
    await connection.query(`
      INSERT INTO supervision_logs (project_id, work_id, user_id, log_date, weather, project_dynamics, supervision_work, safety_work, recorder_name, recorder_date, reviewer_name, reviewer_date) VALUES
      (1, 1, 1, '2024-10-21', '晴 16-24℃ 南风2级', '今日完成主体结构第三层混凝土浇筑，浇筑量约350立方米。施工单位组织3个作业班组，投入60名工人进行施工。混凝土质量经检查符合设计要求。现场施工秩序良好，各项技术措施落实到位。下午进行了混凝土试块留置，共留置标养试块3组、同条件试块2组。', '1. 检查模板支撑系统，符合规范要求，立杆间距、水平杆设置均符合施工方案。\n2. 旁站混凝土浇筑全过程，振捣密实，未发现漏振、过振现象。\n3. 检查钢筋绑扎质量，合格率100%，钢筋保护层厚度符合设计要求。\n4. 监督施工单位做好养护准备工作，覆盖材料、洒水设备已准备就绪。\n5. 审核混凝土配合比通知单，强度等级C30，坍落度180±20mm，符合要求。\n6. 检查混凝土运输车辆，共8辆罐车参与浇筑，运输时间均控制在规范要求范围内。', '1. 检查高处作业防护措施，安全网、防护栏杆齐全有效，临边防护符合规范。\n2. 发现3处电缆线路未规范敷设，已下发监理工程师通知单（编号：JL-2024-021），要求立即整改。\n3. 检查特种作业人员持证情况，均持证上岗，证件在有效期内。\n4. 检查施工现场消防器材配置，灭火器数量充足，压力正常。\n5. 巡查施工现场安全警示标识，标识清晰完整。\n6. 检查塔吊运行情况，各项安全装置齐全有效，操作规范。', '张三', '2024-10-21', '李建国', '2024-10-22'),
      (1, 1, 1, '2024-10-22', '多云 15-22℃ 东风3级', '继续进行第三层混凝土养护工作，检查养护措施落实情况。开始第四层钢筋绑扎施工，完成约30%。钢筋原材料进场约15吨，已进行见证取样送检。施工现场材料堆放整齐，文明施工良好。', '1. 检查混凝土养护措施，覆盖及洒水养护到位，养护次数每天不少于7次。\n2. 审核第四层钢筋加工配料单，规格、数量、长度均符合设计要求。\n3. 检查钢筋原材料质保书，生产厂家资质齐全，材料合格证、出厂检验报告齐全。\n4. 见证取样钢筋原材料，送往具有CMA资质的检测机构检测。\n5. 检查钢筋加工质量，箍筋弯钩角度、平直段长度符合规范要求。\n6. 复核第四层结构尺寸，与设计图纸一致。', '1. 检查施工现场临时用电，配电箱防护良好，三级配电两级保护落实到位。\n2. 检查脚手架搭设质量，立杆基础坚实，扫地杆设置规范，剪刀撑连续设置。\n3. 督促施工单位完善安全标识标牌，在危险部位增设警示标志。\n4. 检查施工人员劳保用品佩戴情况，安全帽、安全带佩戴规范。\n5. 检查临边洞口防护，楼梯口、电梯井口防护到位。', '张三', '2024-10-22', '李建国', '2024-10-23'),
      (1, 1, 1, '2024-10-23', '晴 17-25℃ 南风2级', '第四层钢筋绑扎完成约80%，质量检查合格。模板加工准备就绪，木工班组已进场准备安装模板。下午召开了专题会议，协调解决施工中存在的问题。预计明天可完成钢筋绑扎并开始模板安装。', '1. 检查钢筋绑扎质量，间距、搭接长度符合要求，钢筋接头位置设置合理。\n2. 复核钢筋数量及规格，与设计一致，未发现以小代大、以少代多现象。\n3. 检查预埋件位置，准确无误，标高、轴线偏差在允许范围内。\n4. 审核模板施工方案，支撑系统设计计算书齐全，方案已通过专家论证。\n5. 检查模板材料质量，模板板面平整，无破损变形。\n6. 组织召开监理例会，协调施工单位、建设单位解决材料供应问题。', '1. 对施工人员进行安全教育，提高安全意识，强调高处作业安全注意事项。\n2. 检查安全帽佩戴情况，全员正确佩戴，未发现不戴或不规范佩戴现象。\n3. 检查消防器材配置，满足要求，灭火器布置合理，标识清晰。\n4. 检查施工用电安全，电缆线路架空敷设或埋地敷设，严禁拖地使用。\n5. 检查脚手架验收手续，验收记录齐全，验收人员签字完整。\n6. 巡查施工现场整体安全状况，未发现重大安全隐患。', '张三', '2024-10-23', '李建国', '2024-10-24'),
      (1, 2, 3, '2024-10-21', '晴 16-24℃ 南风2级', '开始进行二层外墙抹灰施工，完成约200平方米。抹灰砂浆采用现场搅拌，配合比经试验确定。施工班组技术熟练，施工质量良好。', '1. 检查抹灰砂浆配合比，符合要求，水泥、砂子、添加剂用量准确。\n2. 检查基层处理质量，清洁、湿润到位，基层无浮灰、油污。\n3. 检查抹灰厚度及平整度，符合规范，用2米靠尺检查，偏差在4mm以内。\n4. 检查抹灰分层施工，底层、中层、面层施工工艺正确。\n5. 检查阴阳角方正度，阴阳角做法规范，顺直方正。', '1. 检查外脚手架稳固性，符合要求，立杆基础坚实，连墙件设置牢固。\n2. 检查安全网设置，密目网完整有效，网间连接严密。\n3. 检查作业层防护，脚手板铺设严密，防护栏杆设置规范。\n4. 检查物料提升机运行，安全装置齐全有效，操作人员持证上岗。', '王五', '2024-10-21', '李建国', '2024-10-22'),
      (2, 4, 2, '2024-10-21', '阴 12-18℃ 北风4级', '完成K3+200至K3+500段路基土方填筑，填筑量约5000立方米。填筑采用分层填筑、分层压实的方法，每层松铺厚度30cm。压实度检测合格率98%，满足设计要求。现场施工组织有序，机械设备运行正常。', '1. 检查填料质量，符合设计要求，土质均匀，无淤泥、腐殖土、冻土块等杂质。\n2. 旁站压实度检测，合格率98%，检测方法采用灌砂法，检测频率符合规范要求。\n3. 检查路基边坡整修质量，坡度符合要求，边坡平顺，无明显凹凸。\n4. 检查分层填筑厚度，松铺厚度控制在30cm，符合施工方案要求。\n5. 检查压实遍数，碾压6遍，压实效果良好。\n6. 审核测量放线成果，中线、边线放样准确，标高控制到位。', '1. 检查施工车辆运行安全，限速标志明显，车辆限速20km/h。\n2. 检查交通导改措施，安全有效，警示标志、隔离设施齐全。\n3. 巡查施工区域警示标识，完善齐全，夜间警示灯正常工作。\n4. 检查机械设备安全状况，压路机、推土机等设备状态良好，操作人员持证上岗。\n5. 检查现场临时用电，配电箱防护到位，接地保护可靠。\n6. 检查施工人员安全教育，进场安全教育记录齐全，安全技术交底已完成。', '李四', '2024-10-21', '赵明', '2024-10-22')
    `)

    // 插入测试AI对话记录
    console.log('插入测试AI对话记录数据...')
    const sessionId = 'session_' + Date.now()
    await connection.query(`
      INSERT INTO ai_chat_logs (user_id, session_id, message_type, content) VALUES
      (1, '${sessionId}', 'user', '帮我优化今天的监理日志内容'),
      (1, '${sessionId}', 'ai', '好的，我来帮您优化监理日志内容。请提供您今天记录的具体内容，我会从专业角度为您完善。')
    `)

    // 插入系统配置（如果不存在）
    console.log('插入系统配置数据...')
    await connection.query(`
      INSERT IGNORE INTO system_configs (config_key, config_value, config_type, description) VALUES
      ('doubao_api_key', '', 'string', '豆包AI API密钥'),
      ('doubao_model', 'doubao-pro', 'string', '豆包AI模型'),
      ('max_upload_size', '10485760', 'number', '文件上传最大大小（字节）'),
      ('allowed_file_types', '["image/jpeg","image/png","image/gif","application/pdf","application/msword"]', 'json', '允许上传的文件类型')
    `)

    console.log('✓ 测试数据初始化成功')
    console.log('\n初始化统计：')
    
    // 统计数据
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users')
    const [projects] = await connection.query('SELECT COUNT(*) as count FROM projects')
    const [works] = await connection.query('SELECT COUNT(*) as count FROM works')
    const [logs] = await connection.query('SELECT COUNT(*) as count FROM supervision_logs')
    
    console.log(`用户数: ${users[0].count}`)
    console.log(`项目数: ${projects[0].count}`)
    console.log(`工程数: ${works[0].count}`)
    console.log(`监理日志数: ${logs[0].count}`)
    
  } catch (error) {
    console.error('✗ 测试数据初始化失败:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initTestData()
}

module.exports = initTestData

