// backend/src/utils/response.js
/**
 * 统一成功响应
 * @param {*} data - 返回数据
 * @param {string} msg - 消息
 * @param {number} code - 状态码
 */
const success = (data, msg = 'success', code = 200) => {
    return { code, data, msg };
  };
  
  /**
   * 统一错误响应
   * @param {string} msg - 错误消息
   * @param {number} code - 状态码
   * @param {*} data - 额外数据（可选）
   */
  const error = (msg, code = 400, data = null) => {
    return { code, data, msg };
  };
  
  module.exports = { success, error };