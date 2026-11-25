import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Tag, Typography } from 'antd';
import { api, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import { NAVY } from '@/theme';

type Role = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  permissions: string[];
};

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<Role[]>('/roles');
        if (!cancelled) setRoles(data);
      } catch (e) {
        if (!cancelled) setError(errMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0, color: NAVY }}>
        Role Management
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Read-only view of roles and permission codes
      </Typography.Paragraph>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Card>
          <DataTable
            rowKey="id"
            dataSource={roles}
            expandable={{
              expandedRowRender: (r) => (
                <div>
                  {(r.permissions || []).map((p) => (
                    <Tag key={p} style={{ marginBottom: 4 }}>
                      {p}
                    </Tag>
                  ))}
                  {!r.permissions?.length && (
                    <Typography.Text type="secondary">No permissions</Typography.Text>
                  )}
                </div>
              ),
            }}
            columns={[
              { title: 'Code', dataIndex: 'code' },
              { title: 'Name', dataIndex: 'name' },
              { title: 'Description', dataIndex: 'description' },
              {
                title: 'Permissions',
                dataIndex: 'permissions',
                render: (p: string[]) => p?.length ?? 0,
              },
            ]}
            locale={{ emptyText: <Empty description="No roles" /> }}
          />
        </Card>
      )}
    </div>
  );
}
