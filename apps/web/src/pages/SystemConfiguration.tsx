import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Typography,
  message,
} from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import { NAVY } from '@/theme';

type ConfigRow = {
  key: string;
  value: string | null;
  description?: string | null;
  updatedAt?: string;
};

export default function SystemConfiguration() {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ConfigRow[]>('/system/config');
      setRows(data);
      const values: Record<string, string> = {};
      for (const r of data) values[r.key] = r.value ?? '';
      form.setFieldsValue(values);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    const values = form.getFieldsValue() as Record<string, string>;
    const patch: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(values)) {
      patch[key] = value === '' ? null : value;
    }
    setSaving(true);
    try {
      const { data } = await api.patch<ConfigRow[]>('/system/config', {
        values: patch,
      });
      setRows(data);
      message.success('Configuration saved');
    } catch (e) {
      message.error(errMessage(e));
    } finally {
      setSaving(false);
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
            System Configuration
          </Typography.Title>
          <Typography.Text type="secondary">
            Thresholds, paths, and integration keys
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            Reload
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => void save()}
          >
            Save changes
          </Button>
        </Space>
      </Space>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Card>
        <Form form={form} layout="vertical">
          <DataTable
            rowKey="key"
            loading={loading}
            dataSource={rows}
            columns={[
              { title: 'Key', dataIndex: 'key', width: 220 },
              {
                title: 'Value',
                dataIndex: 'key',
                render: (key: string) => (
                  <Form.Item name={key} style={{ margin: 0 }}>
                    <Input.TextArea
                      autoSize={{ minRows: 1, maxRows: 3 }}
                      placeholder="(empty)"
                    />
                  </Form.Item>
                ),
              },
              {
                title: 'Description',
                dataIndex: 'description',
                ellipsis: true,
              },
              {
                title: 'Updated',
                dataIndex: 'updatedAt',
                width: 160,
                render: (v: string) =>
                  v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—',
              },
            ]}
            locale={{ emptyText: loading ? 'Loading…' : 'No config keys' }}
          />
        </Form>
      </Card>
    </div>
  );
}
