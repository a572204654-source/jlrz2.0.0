const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, VerticalAlign, BorderStyle, TextDirection, TextRun, PageBreak } = require('docx')

/**
 * 生成监理日志Word文档（按照标准格式1:1还原）
 * @param {Object} logData - 监理日志数据
 * @returns {Promise<Buffer>} Word文档Buffer
 */
async function generateSupervisionLogWord(logData) {
    try {
    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 720,
              bottom: 1440,
              left: 720
            }
          }
        },
        children: [
          // ============== 第一页：封面页 ==============
          // 顶部：附录 11-5 表（左）+ 监理日志（居中）
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '附录 11-5 表        ',
                size: 24,
                font: '宋体'
              }),
              new TextRun({
                text: '                    监理日志',
                size: 24,
                font: '宋体',
                bold: true
              })
            ]
          }),

          // 封面主表格（包含标题）
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
            },
            rows: [
              // 第1行：项目名称
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('项目名称')]
                  }),
                  new TableCell({
                    width: { size: 75, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    columnSpan: 3,
                    children: [createCenteredParagraph(logData.projectName || logData.project_name || '')]
                  })
                ]
              }),

              // 第2行：项目编号
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('项目编号')]
                  }),
                  new TableCell({
                    width: { size: 75, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    columnSpan: 3,
                    children: [createCenteredParagraph(logData.projectCode || logData.project_code || '')]
                  })
                ]
              }),

              // 第3行：单项工程名称和编号
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('单项工程名称')]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph(logData.workName || logData.work_name || '')]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('单项工程编号')]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph(logData.workCode || logData.work_code || '')]
                  })
                ]
              }),

              // 第4行：单位工程名称和编号
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('单位工程名称')]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph(logData.unitWork || logData.unit_work || '')]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('单位工程编号')]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph(logData.workCode || logData.work_code || '')]
                  })
                ]
              }),

              // 第5行：空白区域 + "监理日志"大标题
              new TableRow({
                height: { value: 8000, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    columnSpan: 4,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: {
                          before: 2000,
                          after: 2000
                        },
                        children: [
                          new TextRun({
                            text: '监理日志',
                            size: 72,
                            bold: true,
                            font: '宋体'
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // 项目监理机构标题 + 底部签名表格（合并为一个表格）
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
            },
            rows: [
              // 第1行：项目监理机构（标题行）+ 数据单元格
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: '项目监理机构',
                            size: 24,
                            font: '宋体',
                            bold: true
                          })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 75, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    columnSpan: 3,
                    children: [createCenteredParagraph(logData.organization || '')]
                  })
                ]
              }),
              // 第2行：总监理工程师和专业监理工程师
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('总监理工程师')]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph(logData.chiefEngineer || logData.chief_engineer || '')]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('专业监理工程师')]
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph(logData.specialistEngineer || logData.specialist_engineer || logData.userName || logData.user_name || '')]
                  })
                ]
              }),
              // 第3行：监理日志起止时间
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('监理日志起止时间')]
                  }),
                  new TableCell({
                    width: { size: 75, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    columnSpan: 3,
                    children: [createCenteredParagraph(formatDateRange(logData.startDate || logData.projectStartDate || logData.project_start_date, logData.endDate || logData.projectEndDate || logData.project_end_date))]
                  })
                ]
              })
            ]
          }),

          // 分页符
          new Paragraph({
            children: [new PageBreak()]
          }),

          // ============== 第二页：日志内容页 ==============
          // 顶部：监理日志（完全按照第一页格式）
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0, line: 240 },
            children: [
              new TextRun({
                text: '监理日志',
                size: 24,
                font: '宋体',
                bold: true
              })
            ]
          }),

          // 第一部分表格：单位工程信息、日期、气象
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
            },
            rows: [
              // 第1行：单位工程名称和编号（扩宽四字符）
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 16, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('单位工程名称')]
                  }),
                  new TableCell({
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph(logData.workName || logData.work_name || '')]
                  }),
                  new TableCell({
                    width: { size: 16, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('单位工程编号')]
                  }),
                  new TableCell({
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph(logData.workCode || logData.work_code || '')]
                  })
                ]
              }),

              // 第2行：日期（缩小高度）
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 12, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('日    期')]
                  }),
                  new TableCell({
                    width: { size: 88, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    columnSpan: 3,
                    children: [createCenteredParagraph(formatDate(logData.logDate || logData.log_date))]
                  })
                ]
              }),

              // 第3行：气象（缩小高度）
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 12, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('气    象')]
                  }),
                  new TableCell({
                    width: { size: 88, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    columnSpan: 3,
                    children: [createCenteredParagraph(logData.weather || '')]
                  })
                ]
              })
            ]
          }),
          
          // 表格间零间距段落
          new Paragraph({
            spacing: { before: 0, after: 0, line: 1 },
            children: []
          }),

          // 第二部分表格：工程动态、监理工作情况、安全监理工作情况
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
            },
            rows: [
              // 第4行：工程动态（缩小左侧标签列宽度，一行一个字，增加高度）
              new TableRow({
                height: { value: 3400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 2, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: '工\n程\n动\n态',
                            size: 24,
                            font: '宋体'
                          })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 98, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.TOP,
                    children: [createContentParagraph(logData.project_dynamics || '')]
                  })
                ]
              }),

              // 第5行：监理工作情况（缩小左侧标签列宽度，一行一个字，增加高度）
              new TableRow({
                height: { value: 3400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 2, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: '监\n理\n工\n作\n情\n况',
                            size: 24,
                            font: '宋体'
                          })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 98, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.TOP,
                    children: [createContentParagraph(logData.supervision_work || '')]
                  })
                ]
              }),

              // 第6行：安全监理工作情况（缩小左侧标签列宽度，一行一个字，增加高度）
              new TableRow({
                height: { value: 3400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 2, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: '安\n全\n监\n理\n工\n作\n情\n况',
                            size: 24,
                            font: '宋体'
                          })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 98, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.TOP,
                    children: [createContentParagraph(logData.safety_work || '')]
                  })
                ]
              })
            ]
          }),
          
          // 表格间零间距段落
          new Paragraph({
            spacing: { before: 0, after: 0, line: 1 },
            children: []
          }),

          // 第三部分表格：记录人和审核人签名
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
            },
            rows: [
              // 第7行：记录人和审核人签名（姓名左对齐+日期右对齐，同一行）
              new TableRow({
                height: { value: 400, rule: 'atLeast' },
                children: [
                  new TableCell({
                    width: { size: 8, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('记录人')]
                  }),
                  new TableCell({
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: {
                          top: { style: BorderStyle.NONE },
                          bottom: { style: BorderStyle.NONE },
                          left: { style: BorderStyle.NONE },
                          right: { style: BorderStyle.NONE },
                          insideHorizontal: { style: BorderStyle.NONE },
                          insideVertical: { style: BorderStyle.NONE }
                        },
                        rows: [
                          new TableRow({
                            children: [
                              new TableCell({
                                width: { size: 30, type: WidthType.PERCENTAGE },
                                borders: {
                                  top: { style: BorderStyle.NONE },
                                  bottom: { style: BorderStyle.NONE },
                                  left: { style: BorderStyle.NONE },
                                  right: { style: BorderStyle.NONE }
                                },
                                children: [createLeftParagraph(logData.recorderName || logData.recorder_name || '')]
                              }),
                              new TableCell({
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                borders: {
                                  top: { style: BorderStyle.NONE },
                                  bottom: { style: BorderStyle.NONE },
                                  left: { style: BorderStyle.NONE },
                                  right: { style: BorderStyle.NONE }
                                },
                                children: [
                                  new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                      new TextRun({
                                        text: formatDateForSignature(logData.recorderDate || logData.recorder_date),
                                        size: 24,
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
                  }),
                  new TableCell({
                    width: { size: 8, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [createCenteredParagraph('审核人')]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: {
                          top: { style: BorderStyle.NONE },
                          bottom: { style: BorderStyle.NONE },
                          left: { style: BorderStyle.NONE },
                          right: { style: BorderStyle.NONE },
                          insideHorizontal: { style: BorderStyle.NONE },
                          insideVertical: { style: BorderStyle.NONE }
                        },
                        rows: [
                          new TableRow({
                            children: [
                              new TableCell({
                                width: { size: 30, type: WidthType.PERCENTAGE },
                                borders: {
                                  top: { style: BorderStyle.NONE },
                                  bottom: { style: BorderStyle.NONE },
                                  left: { style: BorderStyle.NONE },
                                  right: { style: BorderStyle.NONE }
                                },
                                children: [createLeftParagraph(logData.reviewerName || logData.reviewer_name || '')]
                              }),
                              new TableCell({
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                borders: {
                                  top: { style: BorderStyle.NONE },
                                  bottom: { style: BorderStyle.NONE },
                                  left: { style: BorderStyle.NONE },
                                  right: { style: BorderStyle.NONE }
                                },
                                children: [
                                  new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                      new TextRun({
                                        text: formatDateForSignature(logData.reviewerDate || logData.reviewer_date),
                                        size: 24,
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
                  })
                ]
              })
            ]
          })
        ]
      }]
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
 * 创建居中对齐的段落
 * @param {string} text - 文本内容
 * @param {boolean} bold - 是否加粗
 * @returns {Paragraph}
 */
function createCenteredParagraph(text, bold = false) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: text,
        size: 24,
        bold: bold,
        font: '宋体'
        })
    ]
  })
}

/**
 * 创建左对齐的段落
 * @param {string} text - 文本内容
 * @returns {Paragraph}
 */
function createLeftParagraph(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({
        text: text,
        size: 24,
        font: '宋体'
      })
    ]
  })
}

/**
 * 创建纵向文字段落
 * @param {string} text - 文本内容
 * @returns {Paragraph}
 */
function createVerticalParagraph(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: text,
        size: 24,
        font: '宋体'
          })
    ]
        })
      }

/**
 * 创建内容段落（带缩进）
 * @param {string} text - 文本内容
 * @returns {Paragraph}
 */
function createContentParagraph(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: {
      left: 400,
      right: 200
    },
    spacing: {
      line: 360,
      before: 100,
      after: 100
    },
    children: [
      new TextRun({
        text: text,
        size: 24,
        font: '宋体'
      })
    ]
  })
}

/**
 * 格式化日期
 * @param {Date|string} date - 日期
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return `${year}年${month}月${day}日`
}

/**
 * 格式化日期范围
 * @param {Date|string} startDate - 开始日期
 * @param {Date|string} endDate - 结束日期
 * @returns {string} 格式化后的日期范围字符串
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
 * 格式化签名日期（年 月 日格式，如有数据则填充）
 * @param {Date|string} date - 日期
 * @returns {string} 格式化后的签名日期
 */
function formatDateForSignature(date) {
  if (!date) return '年   月   日'
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return '年   月   日'
  
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  
  return `${year}年 ${month}月 ${day}日`
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

module.exports = {
  generateSupervisionLogWord
}
