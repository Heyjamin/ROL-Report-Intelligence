import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Card,
  Empty,
  Space,
  Spin,
  Statistic,
  Typography,
  Row,
  Col,
} from 'antd';
import { api, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import PeriodSelect from '@/components/PeriodSelect';
import StatusTag from '@/components/StatusTag';
import { NAVY, STATUS_COLORS } from '@/theme';

type Item = {
  itemCode: string;
  description?: string | null;
  stockStatus: string;
  stockTotal?: number | null;
  rol?: number | null;
  gapQty?: number | null;
  gapValue?: number | null;
  poOps?: number | null;
  trendLabel?: string | null;
  isHighVolatility?: boolean;
  recommendedAction?: string | null;
};

const fmt = (v?: number | null) =>
  v == null ? '—' : Number(v).toLocaleString();

export default function RiskAttention() {
  const [period, setPeriod] = useState<string>();
  const [items, setItems] = useState<Item[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!period) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<{
          period: string;
          items: Item[];
          alertCount: number;
        }>('/risk/attention', { params: { period } });
        if (cancelled) return;
        setItems(data.items || []);
        setAlertCount(data.alertCount ?? 0);
      } catch (e) {
        if (!cancelled) setError(errMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const stockout = items.filter((i) => i.stockStatus === 'STOCKOUT').length;
  const critical = items.filter((i) => i.stockStatus === 'CRITICAL').length;

  return (
    <div>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        wrap
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0, color: NAVY }}>
            Risk & Attention Center
          </Typography.Title>
          <Typography.Text type="secondary">
            Prioritized items needing review
          </Typography.Text>
        </div>
        <PeriodSelect value={period} onChange={setPeriod} />
      </Space>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Attention items" value={items.length} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Stockout"
              value={stockout}
              valueStyle={{ color: STATUS_COLORS.STOCKOUT }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Critical"
              value={critical}
              valueStyle={{ color: STATUS_COLORS.CRITICAL }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Active alerts" value={alertCount} />
          </Card>
        </Col>
      </Row>

      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : (
          <DataTable
            rowKey="itemCode"
            dataSource={items}
            onRow={(r) => ({
              onClick: () =>
                navigate(`/inventory/${encodeURIComponent(r.itemCode)}`),
              style: { cursor: 'pointer' },
            })}
            columns={[
              { title: 'Item', dataIndex: 'itemCode', width: 120 },
              {
                title: 'Description',
                dataIndex: 'description',
                ellipsis: true,
              },
              {
                title: 'Status',
                dataIndex: 'stockStatus',
                render: (s: string) => <StatusTag status={s} />,
              },
              { title: 'Stock', dataIndex: 'stockTotal', render: fmt, align: 'right' },
              { title: 'ROL', dataIndex: 'rol', render: fmt, align: 'right' },
              { title: 'Gap qty', dataIndex: 'gapQty', render: fmt, align: 'right' },
              { title: 'Gap value', dataIndex: 'gapValue', render: fmt, align: 'right' },
              { title: 'PO/OPS', dataIndex: 'poOps', render: fmt, align: 'right' },
              { title: 'Trend', dataIndex: 'trendLabel' },
              {
                title: 'Volatile',
                dataIndex: 'isHighVolatility',
                render: (v: boolean) => (v ? 'Yes' : '—'),
              },
              {
                title: 'Action',
                dataIndex: 'recommendedAction',
                ellipsis: true,
              },
            ]}
            locale={{
              emptyText: <Empty description="No attention items for this period" />,
            }}
          />
        )}
      </Card>
    </div>
  );
}
