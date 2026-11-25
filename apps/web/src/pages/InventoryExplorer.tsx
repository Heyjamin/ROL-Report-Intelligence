import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { api, downloadBlob, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import PeriodSelect from '@/components/PeriodSelect';
import StatusTag from '@/components/StatusTag';
import { NAVY } from '@/theme';

type Row = {
  itemCode: string;
  description?: string;
  uom?: string;
  stockTotal?: number;
  rol?: number;
  roq?: number;
  stockStatus?: string;
  stockDelta?: number;
  gapQty?: number;
  gapValue?: number;
  recommendedAction?: string;
};

const STATUSES = [
  'STOCKOUT',
  'CRITICAL',
  'BELOW_ROL',
  'AT_ROL',
  'APPROACHING_ROL',
  'NORMAL',
  'ABOVE_ROL',
  'EXCESS',
  'NO_ROL',
];

const fmt = (v?: number | null) =>
  v == null ? '—' : Number(v).toLocaleString();

export default function InventoryExplorer() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string | undefined>(
    params.get('period') || undefined,
  );
  const [q, setQ] = useState(params.get('q') || '');
  const [status, setStatus] = useState<string | undefined>(
    params.get('status') || undefined,
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!period) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Load full filtered set; DataTable handles sort / keyword / pagination
        const { data } = await api.get<{
          items: Row[];
          total: number;
        }>('/inventory', {
          params: {
            period,
            q: q || undefined,
            status,
            page: 1,
            pageSize: 5000,
          },
        });
        if (cancelled) return;
        setRows(data.items);
        const next = new URLSearchParams();
        next.set('period', period);
        if (q) next.set('q', q);
        if (status) next.set('status', status);
        setParams(next, { replace: true });
      } catch (e) {
        if (!cancelled) setError(errMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, q, status, setParams]);

  const exportXlsx = async () => {
    try {
      await downloadBlob(
        '/exports/inventory.xlsx',
        `inventory-${period || 'latest'}.xlsx`,
        { period, q: q || undefined, status },
      );
      message.success('Excel download started');
    } catch (e) {
      message.error(errMessage(e, 'Export failed'));
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
            Inventory Explorer
          </Typography.Title>
          <Typography.Text type="secondary">
            Search, filter, and drill into stock metrics
          </Typography.Text>
        </div>
        <Button icon={<DownloadOutlined />} onClick={() => void exportXlsx()}>
          Export Excel
        </Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <PeriodSelect value={period} onChange={setPeriod} />
          <Input.Search
            allowClear
            placeholder="Search code or description"
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            defaultValue={q}
            onSearch={(v) => setQ(v.trim())}
          />
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 180 }}
            value={status}
            onChange={setStatus}
            options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
          />
        </Space>
      </Card>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Card>
        <DataTable
          rowKey="itemCode"
          loading={loading}
          dataSource={rows}
          onRow={(r) => ({
            onClick: () =>
              navigate(`/inventory/${encodeURIComponent(r.itemCode)}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'Item', dataIndex: 'itemCode', fixed: 'left', width: 120 },
            {
              title: 'Description',
              dataIndex: 'description',
              ellipsis: true,
            },
            { title: 'UOM', dataIndex: 'uom', width: 70 },
            {
              title: 'Stock',
              dataIndex: 'stockTotal',
              render: fmt,
              align: 'right',
            },
            { title: 'ROL', dataIndex: 'rol', render: fmt, align: 'right' },
            { title: 'ROQ', dataIndex: 'roq', render: fmt, align: 'right' },
            {
              title: 'Status',
              dataIndex: 'stockStatus',
              render: (s: string) => <StatusTag status={s} />,
            },
            {
              title: 'Δ',
              dataIndex: 'stockDelta',
              render: fmt,
              align: 'right',
            },
            {
              title: 'Gap value',
              dataIndex: 'gapValue',
              render: fmt,
              align: 'right',
            },
            {
              title: 'Action',
              dataIndex: 'recommendedAction',
              ellipsis: true,
            },
          ]}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: loading ? 'Loading…' : 'No inventory rows for this filter',
          }}
        />
      </Card>
    </div>
  );
}
