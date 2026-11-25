import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Input,
  Space,
  Typography,
  Tag,
  message,
} from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { api, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import { NAVY } from '@/theme';

type ForecastResult = {
  itemCode: string;
  source: string;
  history: { periodKey: string; stockTotal: number }[];
  forecast: {
    method?: string;
    pointForecast?: number | null;
    lowerBand?: number | null;
    upperBand?: number | null;
    confidence?: string;
    notes?: string;
    horizons?: { months: number; value: number }[];
  };
};

const fmt = (v?: number | null) =>
  v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function PredictiveAnalytics() {
  const [codes, setCodes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ForecastResult[]>([]);
  const navigate = useNavigate();

  const run = async (itemCodes?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{
        count: number;
        results: ForecastResult[];
      }>('/forecasts/batch', { itemCodes: itemCodes ?? [] });
      setResults(data.results || []);
      message.success(`Generated ${data.count} forecast(s)`);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const runTyped = () => {
    const list = codes
      .split(/[\s,;]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    void run(list.length ? list : undefined);
  };

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0, color: NAVY }}>
        Predictive Analytics
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Batch stock forecasts (analytics sidecar or local SMA / linear fallback).
        Leave codes empty to sample recent items.
      </Typography.Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input.TextArea
            rows={3}
            placeholder="Item codes separated by comma, space, or newline"
            value={codes}
            onChange={(e) => setCodes(e.target.value)}
          />
          <Space wrap>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={loading}
              onClick={runTyped}
            >
              Run forecasts
            </Button>
            <Button loading={loading} onClick={() => void run([])}>
              Sample batch
            </Button>
          </Space>
        </Space>
      </Card>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Card title={`Results (${results.length})`}>
        <DataTable
          rowKey="itemCode"
          loading={loading}
          dataSource={results}
          onRow={(r) => ({
            onClick: () =>
              navigate(`/inventory/${encodeURIComponent(r.itemCode)}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'Item', dataIndex: 'itemCode' },
            {
              title: 'Source',
              dataIndex: 'source',
              render: (s: string) => <Tag>{s}</Tag>,
            },
            {
              title: 'Method',
              render: (_: unknown, r: ForecastResult) =>
                r.forecast?.method || '—',
            },
            {
              title: 'Point',
              render: (_: unknown, r: ForecastResult) =>
                fmt(r.forecast?.pointForecast),
              align: 'right',
            },
            {
              title: 'Band',
              render: (_: unknown, r: ForecastResult) =>
                `${fmt(r.forecast?.lowerBand)} – ${fmt(r.forecast?.upperBand)}`,
            },
            {
              title: 'Confidence',
              render: (_: unknown, r: ForecastResult) =>
                r.forecast?.confidence || '—',
            },
            {
              title: 'History pts',
              render: (_: unknown, r: ForecastResult) => r.history?.length ?? 0,
            },
          ]}
          locale={{ emptyText: 'No forecasts yet — run a batch above' }}
        />
      </Card>
    </div>
  );
}
