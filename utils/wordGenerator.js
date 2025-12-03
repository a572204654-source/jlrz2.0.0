const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  TextRun,
  PageBreak,
  convertInchesToTwip,
  HeightRule
} = require('docx')

// ==================== 固定模板配置 ====================
// A4纸张尺寸（单位: twip, 1英寸=1440twip）
const PAGE_WIDTH = 11906  // 210mm = 8.27英寸
const PAGE_HEIGHT = 16838 // 297mm = 11.69英寸

// 封面页边距
const COVER_MARGIN = {
  top: 1440,    // 1英寸
  right: 1440,  // 1英寸
  bottom: 1440, // 1英寸
  left: 1728    // 1.2英寸
}

// 内容页边距
const CONTENT_MARGIN = {
  top: 720,     // 0.5英寸
  right: 864,   // 0.6英寸
  bottom: 720,  // 0.5英寸
  left: 864     // 0.6英寸
}

// 封面页表格列宽（固定值，单位: DXA）
const COVER_COL_WIDTH = {
  label: 2000,      // 标签列
  value: 2200,      // 数据列
  labelSmall: 2000, // 小标签列
  valueSmall: 2200  // 小数据列
}

// 内容页表格列宽（固定值）
const CONTENT_COL_WIDTH = {
  labelVertical: 600,  // 竖排文字标签列
  content: 9200,       // 内容列
  labelSmall: 1600,    // 小标签列
  valueSmall: 3600,    // 小数据列
  signLabel: 1000,     // 签名标签
  signValue: 4000      // 签名内容
}

// 行高配置
const ROW_HEIGHT = {
  normal: 500,         // 普通行
  small: 400,          // 小行
  title: 8000,         // 标题行
  content: 3800        // 内容行
}

// 表格边框样式
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 8, color: '000000' }
}

// 无边框样式
const noBorders = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE }
}

/**
 * 创建居中对齐的段落
 */
function createCenteredParagraph(text, options = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({
        text: text || '',
        size: options.size || 21, // 10.5磅 = 21半磅
        bold: options.bold || false,
        font: '宋体'
      })
    ]
  })
}

/**
 * 创建左对齐的段落
 */
function createLeftParagraph(text, options = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({
        text: text || '',
        size: options.size || 21,
        font: '宋体'
      })
    ]
  })
}

/**
 * 创建竖排文字段落（每个字一行）
 */
function createVerticalTextParagraphs(text) {
  const chars = text.split('')
  return chars.map((char, index) => 
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({
          text: char,
          size: 21,
          font: '宋体'
        })
      ]
    })
  )
}

/**
 * 创建内容段落（用于多行文本区域）
 */
function createContentParagraph(text) {
  if (!text) {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 100, after: 100, line: 360 },
      indent: { left: 200 },
      children: []
    })
  }
  
  // 处理多行文本
  const lines = text.split('\n')
  const children = []
  
  lines.forEach((line, index) => {
    children.push(new TextRun({
      text: line,
      size: 21,
      font: '宋体'
    }))
    if (index < lines.length - 1) {
      children.push(new TextRun({ break: 1 }))
    }
  })
  
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 100, after: 100, line: 360 },
    indent: { left: 200 },
    children: children
  })
}

/**
 * 获取星期几
 */
function getWeekday(date) {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[date.getDay()]
}

/**
 * 格式化日期
 */
function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${year}年${month}月${day}日`
}

/**
 * 格式化日期（带星期）
 */
function formatDateWithWeekday(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekday = getWeekday(d)
  return `${year}年${month}月${day}日  ${weekday}`
}

/**
 * 格式化日期范围
 */
function formatDateRange(startDate, endDate) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (!start && !end) return ''
  if (!start) return `至 ${end}`
  if (!end) return `${start} 至今`
  return `${start} 至 ${end}`
}

/**
 * 格式化签名日期
 */
function formatDateForSignature(date) {
  if (!date) return '    年  月  日'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '    年  月  日'
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${year}年${month}月${day}日`
}

/**
 * 生成监理日志Word文档（按照标准格式1:1还原）
 * @param {Object} logData - 监理日志数据
 * @returns {Promise<Buffer>} Word文档Buffer
 */
async function generateSupervisionLogWord(logData) {
  try {
    // 提取数据（兼容驼峰和下划线命名）
    // 字段说明：
    // - workName / work_name: 单项工程名称
    // - projectWorkCode / project_work_code: 单项工程编号
    // - unitWork / unit_work: 单位工程名称
    // - workCode / work_code: 单位工程编号
    const data = {
      projectName: logData.projectName || logData.project_name || '',
      projectCode: logData.projectCode || logData.project_code || '',
      workName: logData.workName || logData.work_name || '',
      projectWorkCode: logData.projectWorkCode || logData.project_work_code || '',
      unitWork: logData.unitWork || logData.unit_work || '',
      unitWorkCode: logData.workCode || logData.work_code || '',
      organization: logData.organization || '',
      chiefEngineer: logData.chiefEngineer || logData.chief_engineer || '',
      specialistEngineer: logData.specialistEngineer || logData.specialist_engineer || logData.userName || logData.user_name || '',
      projectStartDate: logData.startDate || logData.projectStartDate || logData.project_start_date || '',
      projectEndDate: logData.endDate || logData.projectEndDate || logData.project_end_date || '',
      logDate: logData.logDate || logData.log_date || '',
      weather: logData.weather || '',
      projectDynamics: logData.projectDynamics || logData.project_dynamics || '',
      supervisionWork: logData.supervisionWork || logData.supervision_work || '',
      safetyWork: logData.safetyWork || logData.safety_work || '',
      recorderName: logData.recorderName || logData.recorder_name || logData.userName || logData.user_name || '',
      recorderDate: logData.recorderDate || logData.recorder_date || '',
      reviewerName: logData.reviewerName || logData.reviewer_name || '',
      reviewerDate: logData.reviewerDate || logData.reviewer_date || ''
    }

    // ==================== 第一页：封面页 ====================
    const coverPage = {
      properties: {
        page: {
          size: {
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT
          },
          margin: COVER_MARGIN
        }
      },
      children: [
        // 顶部标题行：附录11-5表 + 监理日志
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: '附录11-5表',
              size: 21,
              font: '宋体'
            }),
            new TextRun({
              text: '                                监理日志',
              size: 21,
              font: '宋体',
              bold: true
            })
          ]
        }),

        // 封面主表格
        new Table({
          width: { size: 8800, type: WidthType.DXA },
          borders: tableBorders,
          rows: [
            // 项目名称
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('项目名称')]
                }),
                new TableCell({
                  width: { size: 6800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 3,
                  children: [createCenteredParagraph(data.projectName)]
                })
              ]
            }),

            // 项目编号
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('项目编号')]
                }),
                new TableCell({
                  width: { size: 6800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 3,
                  children: [createCenteredParagraph(data.projectCode)]
                })
              ]
            }),

            // 单项工程名称 + 单项工程编号
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('单项工程名称')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.workName)]
                }),
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('单项工程编号')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.projectWorkCode)]
                })
              ]
            }),

            // 单位工程名称 + 单位工程编号
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('单位工程名称')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.unitWork)]
                }),
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('单位工程编号')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.unitWorkCode)]
                })
              ]
            }),

            // 大标题区域："监理日志"
            new TableRow({
              height: { value: 8000, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 8800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 4,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: '监 理 日 志',
                          size: 72, // 36磅
                          bold: true,
                          font: '宋体'
                        })
                      ]
                    })
                  ]
                })
              ]
            }),

            // 项目监理机构
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('项目监理机构', { bold: true })]
                }),
                new TableCell({
                  width: { size: 6800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 3,
                  children: [createCenteredParagraph(data.organization)]
                })
              ]
            }),

            // 总监理工程师 + 专业监理工程师
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('总监理工程师')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.chiefEngineer)]
                }),
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('专业监理工程师')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.specialistEngineer)]
                })
              ]
            }),

            // 监理日志起止时间
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('监理日志起止时间')]
                }),
                new TableCell({
                  width: { size: 6800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 3,
                  children: [createCenteredParagraph(formatDateRange(data.projectStartDate, data.projectEndDate))]
                })
              ]
            })
          ]
        })
      ]
    }

    // ==================== 第二页：日志内容页 ====================
    const contentPage = {
      properties: {
        page: {
          size: {
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT
          },
          margin: CONTENT_MARGIN
        }
      },
      children: [
        // 顶部标题
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: '监理日志',
              size: 28,
              bold: true,
              font: '宋体'
            })
          ]
        }),

        // 日志内容表格
        new Table({
          width: { size: 9800, type: WidthType.DXA },
          borders: tableBorders,
          rows: [
            // 单位工程名称 + 单位工程编号
            new TableRow({
              height: { value: 450, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 1600, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('单位工程名称')]
                }),
                new TableCell({
                  width: { size: 3600, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.unitWork || data.workName)]
                }),
                new TableCell({
                  width: { size: 1600, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('单位工程编号')]
                }),
                new TableCell({
                  width: { size: 3000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.unitWorkCode)]
                })
              ]
            }),

            // 日期
            new TableRow({
              height: { value: 400, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 1600, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('日    期')]
                }),
                new TableCell({
                  width: { size: 8200, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 3,
                  children: [createCenteredParagraph(formatDateWithWeekday(data.logDate))]
                })
              ]
            }),

            // 气象
            new TableRow({
              height: { value: 400, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 1600, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('气    象')]
                }),
                new TableCell({
                  width: { size: 8200, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 3,
                  children: [createCenteredParagraph(data.weather)]
                })
              ]
            }),

            // 工程动态
            new TableRow({
              height: { value: 3800, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 600, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: createVerticalTextParagraphs('工程动态')
                }),
                new TableCell({
                  width: { size: 9200, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  columnSpan: 3,
                  children: [createContentParagraph(data.projectDynamics)]
                })
              ]
            }),

            // 监理工作情况
            new TableRow({
              height: { value: 3800, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 600, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: createVerticalTextParagraphs('监理工作情况')
                }),
                new TableCell({
                  width: { size: 9200, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  columnSpan: 3,
                  children: [createContentParagraph(data.supervisionWork)]
                })
              ]
            }),

            // 安全监理工作情况
            new TableRow({
              height: { value: 3800, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 600, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: createVerticalTextParagraphs('安全监理工作情况')
                }),
                new TableCell({
                  width: { size: 9200, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  columnSpan: 3,
                  children: [createContentParagraph(data.safetyWork)]
                })
              ]
            }),

            // 记录人 + 审核人签名行
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 1000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('记录人')]
                }),
                new TableCell({
                  width: { size: 4000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: '  ' + data.recorderName + '        ',
                          size: 21,
                          font: '宋体'
                        }),
                        new TextRun({
                          text: formatDateForSignature(data.recorderDate),
                          size: 21,
                          font: '宋体'
                        })
                      ]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 1000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('审核人')]
                }),
                new TableCell({
                  width: { size: 3800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: '  ' + data.reviewerName + '        ',
                          size: 21,
                          font: '宋体'
                        }),
                        new TextRun({
                          text: formatDateForSignature(data.reviewerDate),
                          size: 21,
                          font: '宋体'
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    }

    // 创建文档
    const doc = new Document({
      sections: [coverPage, contentPage]
    })

    // 生成Buffer
    const buffer = await Packer.toBuffer(doc)
    return buffer

  } catch (error) {
    console.error('生成Word文档错误:', error)
    throw error
  }
}

/**
 * 生成单条日志内容页（用于批量导出）
 * @param {Object} logData - 监理日志数据
 * @returns {Array} 内容页children数组
 */
function generateLogContentChildren(logData) {
  const data = {
    workName: logData.workName || logData.work_name || '',
    unitWork: logData.unitWork || logData.unit_work || '',
    unitWorkCode: logData.workCode || logData.work_code || '',
    logDate: logData.logDate || logData.log_date || '',
    weather: logData.weather || '',
    projectDynamics: logData.projectDynamics || logData.project_dynamics || '',
    supervisionWork: logData.supervisionWork || logData.supervision_work || '',
    safetyWork: logData.safetyWork || logData.safety_work || '',
    recorderName: logData.recorderName || logData.recorder_name || logData.userName || logData.user_name || '',
    recorderDate: logData.recorderDate || logData.recorder_date || '',
    reviewerName: logData.reviewerName || logData.reviewer_name || '',
    reviewerDate: logData.reviewerDate || logData.reviewer_date || ''
  }

  return [
    // 顶部标题
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: '监理日志',
          size: 28,
          bold: true,
          font: '宋体'
        })
      ]
    }),

    // 日志内容表格
    new Table({
      width: { size: 9800, type: WidthType.DXA },
      borders: tableBorders,
      rows: [
        // 单位工程名称 + 单位工程编号
        new TableRow({
          height: { value: 450, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 1600, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [createCenteredParagraph('单位工程名称')]
            }),
            new TableCell({
              width: { size: 3600, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [createCenteredParagraph(data.unitWork || data.workName)]
            }),
            new TableCell({
              width: { size: 1600, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [createCenteredParagraph('单位工程编号')]
            }),
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [createCenteredParagraph(data.unitWorkCode)]
            })
          ]
        }),

        // 日期
        new TableRow({
          height: { value: 400, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 1600, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [createCenteredParagraph('日    期')]
            }),
            new TableCell({
              width: { size: 8200, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              columnSpan: 3,
              children: [createCenteredParagraph(formatDateWithWeekday(data.logDate))]
            })
          ]
        }),

        // 气象
        new TableRow({
          height: { value: 400, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 1600, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [createCenteredParagraph('气    象')]
            }),
            new TableCell({
              width: { size: 8200, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              columnSpan: 3,
              children: [createCenteredParagraph(data.weather)]
            })
          ]
        }),

        // 工程动态
        new TableRow({
          height: { value: 3800, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 600, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: createVerticalTextParagraphs('工程动态')
            }),
            new TableCell({
              width: { size: 9200, type: WidthType.DXA },
              verticalAlign: VerticalAlign.TOP,
              columnSpan: 3,
              children: [createContentParagraph(data.projectDynamics)]
            })
          ]
        }),

        // 监理工作情况
        new TableRow({
          height: { value: 3800, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 600, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: createVerticalTextParagraphs('监理工作情况')
            }),
            new TableCell({
              width: { size: 9200, type: WidthType.DXA },
              verticalAlign: VerticalAlign.TOP,
              columnSpan: 3,
              children: [createContentParagraph(data.supervisionWork)]
            })
          ]
        }),

        // 安全监理工作情况
        new TableRow({
          height: { value: 3800, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 600, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: createVerticalTextParagraphs('安全监理工作情况')
            }),
            new TableCell({
              width: { size: 9200, type: WidthType.DXA },
              verticalAlign: VerticalAlign.TOP,
              columnSpan: 3,
              children: [createContentParagraph(data.safetyWork)]
            })
          ]
        }),

        // 记录人 + 审核人签名行
        new TableRow({
          height: { value: 500, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 1000, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [createCenteredParagraph('记录人')]
            }),
            new TableCell({
              width: { size: 4000, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '  ' + data.recorderName + '        ',
                      size: 21,
                      font: '宋体'
                    }),
                    new TextRun({
                      text: formatDateForSignature(data.recorderDate),
                      size: 21,
                      font: '宋体'
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 1000, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [createCenteredParagraph('审核人')]
            }),
            new TableCell({
              width: { size: 3800, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '  ' + data.reviewerName + '        ',
                      size: 21,
                      font: '宋体'
                    }),
                    new TextRun({
                      text: formatDateForSignature(data.reviewerDate),
                      size: 21,
                      font: '宋体'
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  ]
}

/**
 * 生成批量导出Word文档
 * @param {Array} logsData - 监理日志数据数组
 * @param {Object} projectInfo - 项目信息 { projectName, workName }
 * @returns {Promise<Buffer>} Word文档Buffer
 */
async function generateSupervisionLogBatchWord(logsData, projectInfo) {
  try {
    // 使用第一条日志的数据作为封面信息
    const firstLog = logsData[0]
    
    // 获取日期范围（所有日志的最早和最晚日期）
    let minDate = null
    let maxDate = null
    logsData.forEach(log => {
      const logDate = new Date(log.logDate || log.log_date)
      if (!isNaN(logDate.getTime())) {
        if (!minDate || logDate < minDate) minDate = logDate
        if (!maxDate || logDate > maxDate) maxDate = logDate
      }
    })

    // 提取封面数据（与单个导出格式一致）
    const data = {
      projectName: projectInfo.projectName || firstLog.project_name || '',
      projectCode: firstLog.project_code || '',
      workName: projectInfo.workName || firstLog.work_name || '',
      projectWorkCode: firstLog.project_work_code || '',
      unitWork: firstLog.unit_work || '',
      unitWorkCode: firstLog.work_code || '',
      organization: firstLog.organization || '',
      chiefEngineer: firstLog.chief_engineer || '',
      specialistEngineer: firstLog.user_name || '',
      // 使用所有日志的日期范围
      projectStartDate: minDate,
      projectEndDate: maxDate
    }

    // ==================== 第一页：封面页（与单个导出一致） ====================
    const coverPage = {
      properties: {
        page: {
          size: {
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT
          },
          margin: COVER_MARGIN
        }
      },
      children: [
        // 顶部标题行：附录11-5表 + 监理日志
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: '附录11-5表',
              size: 21,
              font: '宋体'
            }),
            new TextRun({
              text: '                                监理日志',
              size: 21,
              font: '宋体',
              bold: true
            })
          ]
        }),

        // 封面主表格
        new Table({
          width: { size: 8800, type: WidthType.DXA },
          borders: tableBorders,
          rows: [
            // 项目名称
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('项目名称')]
                }),
                new TableCell({
                  width: { size: 6800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 3,
                  children: [createCenteredParagraph(data.projectName)]
                })
              ]
            }),

            // 项目编号
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('项目编号')]
                }),
                new TableCell({
                  width: { size: 6800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 3,
                  children: [createCenteredParagraph(data.projectCode)]
                })
              ]
            }),

            // 单项工程名称 + 单项工程编号
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('单项工程名称')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.workName)]
                }),
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('单项工程编号')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.projectWorkCode)]
                })
              ]
            }),

            // 单位工程名称 + 单位工程编号
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('单位工程名称')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.unitWork)]
                }),
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('单位工程编号')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.unitWorkCode)]
                })
              ]
            }),

            // 大标题区域："监理日志"
            new TableRow({
              height: { value: 8000, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 8800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 4,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: '监 理 日 志',
                          size: 72,
                          bold: true,
                          font: '宋体'
                        })
                      ]
                    })
                  ]
                })
              ]
            }),

            // 项目监理机构
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('项目监理机构', { bold: true })]
                }),
                new TableCell({
                  width: { size: 6800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 3,
                  children: [createCenteredParagraph(data.organization)]
                })
              ]
            }),

            // 总监理工程师 + 专业监理工程师
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('总监理工程师')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.chiefEngineer)]
                }),
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('专业监理工程师')]
                }),
                new TableCell({
                  width: { size: 2000, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph(data.specialistEngineer)]
                })
              ]
            }),

            // 监理日志起止时间
            new TableRow({
              height: { value: 500, rule: HeightRule.ATLEAST },
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [createCenteredParagraph('监理日志起止时间')]
                }),
                new TableCell({
                  width: { size: 6800, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.CENTER,
                  columnSpan: 3,
                  children: [createCenteredParagraph(formatDateRange(data.projectStartDate, data.projectEndDate))]
                })
              ]
            })
          ]
        })
      ]
    }

    // ==================== 后续页面：各条日志内容 ====================
    const logSections = logsData.map((logData, index) => ({
      properties: {
        page: {
          size: {
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT
          },
          margin: CONTENT_MARGIN
        }
      },
      children: generateLogContentChildren(logData)
    }))

    // 创建文档
    const doc = new Document({
      sections: [coverPage, ...logSections]
    })

    // 生成Buffer
    const buffer = await Packer.toBuffer(doc)
    return buffer

  } catch (error) {
    console.error('生成批量Word文档错误:', error)
    throw error
  }
}

module.exports = {
  generateSupervisionLogWord,
  generateSupervisionLogBatchWord
}
