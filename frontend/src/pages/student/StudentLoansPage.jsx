import React, { useState, useEffect } from 'react';
import { Table, Select, message, Tag, Empty } from 'antd';
import axios from 'axios';

const { Option } = Select;

// 后端接口地址
const API_BASE_URL = 'http://localhost:3001/api/student';

const StudentLoansPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [status, setStatus] = useState('all');

  // 加载借阅记录
  const loadLoans = async () => {
    setLoading(true);
    try {
      const params = status === 'all' ? {} : { status };
      const res = await axios.get(`${API_BASE_URL}/books/my-loans`, {
        params,
        headers: {
          // 如果你的登录功能已经完成，这里加上 token：
          // Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setData(res.data);
    } catch (err) {
      message.error('加载借阅记录失败：' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, [status]);

  // 状态标签
  const getStatusTag = (record) => {
    if (record.returnDate) {
      return <Tag color="default">已归还</Tag>;
    }
    const now = new Date();
    const dueDate = new Date(record.dueDate);
    const diffDays = (dueDate - now) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return <Tag color="red">已逾期</Tag>;
    if (diffDays <= 3) return <Tag color="orange">即将逾期</Tag>;
    return <Tag color="green">正常</Tag>;
  };

  // 表格列
  const columns = [
    { title: '书名', dataIndex: 'title', key: 'title' },
    { title: '作者', dataIndex: 'author', key: 'author' },
    { title: '借阅日期', dataIndex: 'borrowDate', key: 'borrowDate' },
    { title: '到期日期', dataIndex: 'dueDate', key: 'dueDate' },
    { title: '状态', key: 'status', render: (_, record) => getStatusTag(record) },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>我的借阅记录</h2>
      <div style={{ marginBottom: 16 }}>
        <Select value={status} onChange={setStatus} style={{ width: 150 }}>
          <Option value="all">全部</Option>
          <Option value="borrowed">未归还</Option>
          <Option value="returned">已归还</Option>
        </Select>
      </div>

      <Table
        loading={loading}
        columns={columns}
        dataSource={data}
        rowKey="id"
        locale={{ emptyText: <Empty description="你还没有借阅过任何书籍" /> }}
      />
    </div>
  );
};

export default StudentLoansPage;