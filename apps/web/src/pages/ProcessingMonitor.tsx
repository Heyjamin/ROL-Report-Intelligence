import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import { CloudSyncOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, errMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import DataTable from '@/components/DataTable';
import { NAVY } from '@/theme';

type Status = {
  syncing: boolean;
  lastSyncAt: string | null;
  lastResult: {
    scanned: number;
    imported: number;
    skippedDuplicate: number;
    failed: number;
    files: { name: string; status: string; rows?: number; message?: string }[];
    metrics?: { periods: number; metrics: number };
  } | null;
  reportsPath?: string;
  folderExists?: boolean;
  folderFiles?: {
    name: string;
    size: number;
    modifiedAt?: string;
    extension?: string;
  }[];
  kpis?: {
    sourceReports: number;
    periods: number;
    inventoryItems: number;
    snapshots: number;
    latestPeriod: string | null;
  };
};

export default function ProcessingMonitor() {
  const { hasPermission, hasRole } = useAuth();
  const canSync =
    hasPermission('ingestion:sync') &&
    hasRole('SUPER_ADMIN', 'ADMIN', 'ANALYST');
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: d } = await api.get<Status>('/ingestion/status');
      setData(d);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data: result } = await api.post('/ingestion/sync');
      message.success(
        `Sync finished — imported ${result.imported ?? 0}, skipped ${result.skippedDuplicate ?? 0}, failed ${result.failed ?? 0}`,
      );
      await load();
    } catch (e) {
      message.error(errMessage(e, 'Sync failed'));
    } finally {
      setSyncing(false);
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
            Processing Monitor
          </Typography.Title>
          <Typography.Text type="secondary">
            Ingestion status and manual sync
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            Refresh
          </Button>
          {canSync && (
            <Button
              type="primary"
              icon={<CloudSyncOutlined />}
              loading={syncing || !!data?.syncing}
              onClick={() => void syncNow()}
            >
              Sync Now
            </Button>
          )}
        </Space>
      </Space>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : data ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Sync state"
                  value={data.syncing ? 'Running' : 'Idle'}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Last sync"
                  value={
                    data.lastSyncAt
                      ? dayjs(data.lastSyncAt).format('YYYY-MM-DD HH:mm')
                      : 'Never'
                  }
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Snapshots"
                  value={data.kpis?.snapshots ?? 0}
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

          <Card title="Path">
            <Typography.Text code>{data.reportsPath || '—'}</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={data.folderExists ? 'green' : 'red'}>
                {data.folderExists ? 'Folder found' : 'Folder missing'}
              </Tag>
              <Tag>{(data.folderFiles || []).length} file(s) on disk</Tag>
            </div>
          </Card>

          <Card title="Files in Re-Order Reports folder">
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
              <Empty description="No .csv / .xlsx files found in REPORTS_PATH" />
            )}
          </Card>

          <Card title="Last sync result">
            {!data.lastResult ? (
              <Empty description="No sync has run yet" />
            ) : (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Statistic title="Scanned" value={data.lastResult.scanned} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Imported" value={data.lastResult.imported} />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Duplicates"
                      value={data.lastResult.skippedDuplicate}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Failed" value={data.lastResult.failed} />
                  </Col>
                </Row>
                <DataTable
                  size="small"
                  rowKey={(r) => `${r.name}-${r.status}`}
                  dataSource={data.lastResult.files || []}
                  columns={[
                    { title: 'File', dataIndex: 'name' },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      render: (s: string) => (
                        <Tag
                          color={
                            s === 'imported'
                              ? 'green'
                              : s === 'failed'
                                ? 'red'
                                : 'default'
                          }
                        >
                          {s}
                        </Tag>
                      ),
                    },
                    { title: 'Rows', dataIndex: 'rows' },
                    { title: 'Message', dataIndex: 'message', ellipsis: true },
                  ]}
                />
              </>
            )}
          </Card>
        </Space>
      ) : null}
    </div>
  );
}
