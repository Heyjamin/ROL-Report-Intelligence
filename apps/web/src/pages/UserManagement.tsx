import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import { NAVY } from '@/theme';

type UserRow = {
  id: number;
  username: string;
  displayName?: string | null;
  email?: string | null;
  isActive: boolean;
  roles: string[];
};

type RoleRow = { code: string; name: string };

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([
        api.get<UserRow[]>('/users'),
        api.get<RoleRow[]>('/roles').catch(() => ({ data: [] as RoleRow[] })),
      ]);
      setUsers(u.data);
      setRoles(r.data);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, roleCodes: ['VIEWER'] });
    setOpen(true);
  };

  const openEdit = (row: UserRow) => {
    setEditing(row);
    form.setFieldsValue({
      username: row.username,
      displayName: row.displayName,
      email: row.email,
      isActive: row.isActive,
      roleCodes: row.roles,
      password: undefined,
    });
    setOpen(true);
  };

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          displayName: values.displayName,
          email: values.email || null,
          isActive: values.isActive,
          roleCodes: values.roleCodes,
        };
        if (values.password) body.password = values.password;
        await api.patch(`/users/${editing.id}`, body);
        message.success('User updated');
      } else {
        await api.post('/users', {
          username: values.username,
          password: values.password,
          displayName: values.displayName,
          email: values.email || null,
          isActive: values.isActive,
          roleCodes: values.roleCodes,
        });
        message.success('User created');
      }
      setOpen(false);
      await load();
    } catch (e) {
      message.error(errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      message.success('User deleted');
      await load();
    } catch (e) {
      message.error(errMessage(e));
    }
  };

  return (
    <div>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        wrap
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0, color: NAVY }}>
            User Management
          </Typography.Title>
          <Typography.Text type="secondary">Admin CRUD for platform users</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New user
        </Button>
      </Space>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <DataTable
        rowKey="id"
        loading={loading}
        dataSource={users}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: 'Username', dataIndex: 'username' },
          { title: 'Display name', dataIndex: 'displayName' },
          { title: 'Email', dataIndex: 'email' },
          {
            title: 'Roles',
            dataIndex: 'roles',
            render: (roles: string[]) =>
              (roles || []).map((r) => (
                <Tag key={r} color="blue">
                  {r}
                </Tag>
              )),
          },
          {
            title: 'Active',
            dataIndex: 'isActive',
            render: (v: boolean) => (
              <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag>
            ),
          },
          {
            title: 'Actions',
            render: (_: unknown, row: UserRow) => (
              <Space>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(row)}
                />
                <Popconfirm
                  title="Delete this user?"
                  onConfirm={() => void remove(row.id)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: loading ? 'Loading…' : 'No users' }}
      />

      <Modal
        title={editing ? `Edit ${editing.username}` : 'Create user'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void save()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {!editing && (
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          )}
          <Form.Item
            name="password"
            label={editing ? 'New password (optional)' : 'Password'}
            rules={editing ? [] : [{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="displayName" label="Display name">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="roleCodes" label="Roles" rules={[{ required: true }]}>
            <Select
              mode="multiple"
              options={(roles.length
                ? roles
                : [
                    { code: 'VIEWER', name: 'Viewer' },
                    { code: 'ANALYST', name: 'Analyst' },
                    { code: 'MANAGEMENT', name: 'Management' },
                    { code: 'ADMIN', name: 'Administrator' },
                  ]
              ).map((r) => ({ value: r.code, label: `${r.code} — ${r.name}` }))}
            />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
