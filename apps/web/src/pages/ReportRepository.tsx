import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { api, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import { NAVY } from '@/theme';

type Status = {
  reportsPath?: string;
  folderExists?: boolean;
  folderFiles?: { name: string; size: number; extension?: string }[];
  kpis?: {
    sourceReports: number;
    periods: number;
    inventoryItems: number;
    snapshots: number;
    latestPeriod: string | null;
  };
  periods?: { periodKey: string; label?: string | null }[];
  recentReports?: {
    id: number;
    fileName?: string;
    originalName?: string;
    periodKey?: string;
    fileHash?: string;
    rowCount?: number;
    status?: string;
    createdAt?: string;
  }[];
};

export default function ReportRepository() {
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: d } = await api.get<Status>('/ingestion/status');
        if (!cancelled) setData(d);
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
        Report Repository
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Folder files are detected automatically. Imported reports appear after
        Sync (Processing Monitor). Supports .csv and .xlsx.
      </Typography.Paragraph>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      )}

      {!loading && data && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Source reports"
                  value={data.kpis?.sourceReports ?? 0}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="Periods" value={data.kpis?.periods ?? 0} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Inventory items"
                  value={data.kpis?.inventoryItems ?? 0}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Latest period"
                  value={data.kpis?.latestPeriod || '—'}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Reports path">
            <Typography.Text code>{data.reportsPath || '—'}</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={data.folderExists ? 'green' : 'red'}>
                {data.folderExists ? 'Folder found' : 'Folder missing'}
              </Tag>
            </div>
          </Card>

          <Card title="Files on disk (.csv / .xlsx)">
            {(data.folderFiles || []).length ? (
              <DataTable
                size="small"
                rowKey={(r) => r.name}
                dataSource={data.folderFiles}
                columns={[
                  { title: 'File', dataIndex: 'name' },
                  { title: 'Type', dataIndex: 'extension' },
                  {
                    title: 'Size',
                    dataIndex: 'size',
                    render: (n: number) =>
                      n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`,
                  },
                ]}
              />
            ) : (
              <Empty description="No report files in folder" />
            )}
          </Card>

          <Card title="Loaded periods">
            {(data.periods || []).length ? (
              <Space wrap>
                {(data.periods || []).map((p) => (
                  <Tag key={p.periodKey} color="blue">
                    {p.label || p.periodKey}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Empty description="No periods" />
            )}
          </Card>

          <Card title="Recent source reports">
            <DataTable
              rowKey={(r) => String(r.id ?? r.fileHash ?? r.fileName)}
              dataSource={data.recentReports || []}
              columns={[
                {
                  title: 'File',
                  render: (_: unknown, r) =>
                    r.originalName || r.fileName || '—',
                },
                { title: 'Period', dataIndex: 'periodKey' },
                { title: 'Rows', dataIndex: 'rowCount' },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (s: string) => <Tag>{s || '—'}</Tag>,
                },
                {
                  title: 'Imported',
                  dataIndex: 'createdAt',
                  render: (v: string) =>
                    v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—',
                },
              ]}
              locale={{ emptyText: <Empty description="No source reports yet" /> }}
            />
          </Card>
        </Space>
      )}
    </div>
  );
}
