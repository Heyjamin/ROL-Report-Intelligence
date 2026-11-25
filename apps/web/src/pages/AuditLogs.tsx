import { useEffect, useState } from 'react';
import { Alert, Card, Typography } from 'antd';
import dayjs from 'dayjs';
import { api, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import { NAVY } from '@/theme';

type AuditRow = {
  id: number;
  username?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<{
          items: AuditRow[];
          total: number;
        }>('/audit', { params: { page, pageSize } });
        if (cancelled) return;
        setRows(data.items);
      } catch (e) {
        if (!cancelled) setError(errMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0, color: NAVY }}>
        Audit Logs
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Security and administration activity trail
      </Typography.Paragraph>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Card>
        <DataTable
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={[
            {
              title: 'When',
              dataIndex: 'createdAt',
              render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
              width: 180,
            },
            { title: 'User', dataIndex: 'username', width: 120 },
            { title: 'Action', dataIndex: 'action', width: 120 },
            { title: 'Resource', dataIndex: 'resource', width: 140 },
            { title: 'Resource ID', dataIndex: 'resourceId', width: 100 },
            { title: 'IP', dataIndex: 'ipAddress', width: 120 },
            {
              title: 'Details',
              dataIndex: 'details',
              ellipsis: true,
            },
          ]}
          locale={{ emptyText: loading ? 'Loading…' : 'No audit entries' }}
        />
      </Card>
    </div>
  );
}
