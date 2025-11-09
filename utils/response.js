/**
 * 统一响应格式
 */

// 设置响应字符编码为UTF-8
function setUTF8Encoding(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

// 成功响应
function success(res, data = null, message = '操作成功') {
  setUTF8Encoding(res);
  return res.json({
    code: 0,
    message,
    data,
    timestamp: Date.now()
  });
}

// 失败响应
function error(res, message = '操作失败', code = -1, statusCode = 200) {
  setUTF8Encoding(res);
  return res.status(statusCode).json({
    code,
    message,
    data: null,
    timestamp: Date.now()
  });
}

// 参数错误
function badRequest(res, message = '参数错误') {
  return error(res, message, 400, 400);
}

// 未授权
function unauthorized(res, message = '未授权，请先登录') {
  return error(res, message, 401, 401);
}

// 禁止访问
function forbidden(res, message = '无权限访问') {
  return error(res, message, 403, 403);
}

// 未找到
function notFound(res, message = '资源不存在') {
  return error(res, message, 404, 404);
}

// 服务器错误
function serverError(res, message = '服务器错误') {
  return error(res, message, 500, 500);
}

module.exports = {
  success,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError
};

