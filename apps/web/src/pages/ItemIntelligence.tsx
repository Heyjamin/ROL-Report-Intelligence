import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Spin,
  Typography,
} from 'antd';
import ReactECharts from 'echarts-for-react';
import { api, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import StatusTag from '@/components/StatusTag';
import { NAVY } from '@/theme';

type Detail = {
  item: {
    itemCode: string;
    description?: string | null;
    uom?: string | null;
    itemType?: string | null;
  };
  latest: {
    periodKey: string;
    stockTotal?: number | string | null;
    rol?: number | string | null;
    roq?: number | string | null;
    avgCost?: number | string | null;
    /** Total P/Orders (Opr.) */
    poOps?: number | string | null;
    /** Quot./Ten./Evalu. (Opr.) */
    quotOps?: number | string | null;
    suggestedQty?: number | null;
    metric?: {
      stockStatus?: string;
      gapQty?: number | string | null;
      gapValue?: number | string | null;
      recommendedAction?: string | null;
      trendLabel?: string | null;
    } | null;
  } | null;
  history: {
    periodKey: string;
    stockTotal?: number | string | null;
    rol?: number | string | null;
    poOps?: number | string | null;
    quotOps?: number | string | null;
  }[];
  metrics: {
    periodKey: string;
    stockStatus: string;
    stockDelta?: number | string | null;
  }[];
};

type ForecastResp = {
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
    forecasts?: number[];
  };
};

const num = (v: unknown) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const fmt = (v: unknown) => {
  const n = num(v);
  return n == null ? '—' : n.toLocaleString();
};

export default function ItemIntelligence() {
  const { itemCode = '' } = useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [forecast, setForecast] = useState<ForecastResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemCode) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [d, f] = await Promise.all([
          api.get<Detail>(`/inventory/${encodeURIComponent(itemCode)}`),
          api
            .get<ForecastResp>(`/forecasts/${encodeURIComponent(itemCode)}`)
            .catch(() => null),
        ]);
        if (cancelled) return;
        setDetail(d.data);
        setForecast(f?.data ?? null);
      } catch (e) {
        if (!cancelled) setError(errMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemCode]);

  const histPeriods = detail?.history.map((h) => h.periodKey) || [];
  const stockSeries = detail?.history.map((h) => num(h.stockTotal)) || [];
  const rolSeries = detail?.history.map((h) => num(h.rol)) || [];

  const chartOpt = {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 48, right: 24, top: 40, bottom: 32 },
    xAxis: { type: 'category', data: histPeriods },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Stock',
        type: 'line',
        smooth: true,
        data: stockSeries,
        itemStyle: { color: NAVY },
      },
      {
        name: 'ROL',
        type: 'line',
        data: rolSeries,
        itemStyle: { color: '#F59E0B' },
        lineStyle: { type: 'dashed' },
      },
    ],
  };

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[
          { title: <Link to="/inventory">Inventory</Link> },
          { title: itemCode },
        ]}
      />
      <Typography.Title level={3} style={{ marginTop: 0, color: NAVY }}>
        Item Intelligence — {itemCode}
      </Typography.Title>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      )}
      {!loading && !error && !detail && <Empty />}

      {!loading && detail && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card>
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
              <Descriptions.Item label="Description">
                {detail.item.description || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="UOM">{detail.item.uom || '—'}</Descriptions.Item>
              <Descriptions.Item label="Type">
                {detail.item.itemType || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Latest period">
                {detail.latest?.periodKey || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Stock">
                {fmt(detail.latest?.stockTotal)}
              </Descriptions.Item>
              <Descriptions.Item label="ROL / ROQ">
                {fmt(detail.latest?.rol)} / {fmt(detail.latest?.roq)}
              </Descriptions.Item>
              <Descriptions.Item label="Still Order Processing Qty">
                {fmt(detail.latest?.poOps)}
              </Descriptions.Item>
              <Descriptions.Item label="Already Ordered Qty">
                {fmt(detail.latest?.quotOps)}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag status={detail.latest?.metric?.stockStatus} />
              </Descriptions.Item>
              <Descriptions.Item label="Gap qty / value">
                {fmt(detail.latest?.metric?.gapQty)} /{' '}
                {fmt(detail.latest?.metric?.gapValue)}
              </Descriptions.Item>
              <Descriptions.Item label="Suggested qty">
                {fmt(detail.latest?.suggestedQty)}
              </Descriptions.Item>
              <Descriptions.Item label="Trend">
                {detail.latest?.metric?.trendLabel || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Action" span={2}>
                {detail.latest?.metric?.recommendedAction || '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card title="Stock vs ROL history">
                {histPeriods.length ? (
                  <ReactECharts option={chartOpt} style={{ height: 320 }} />
                ) : (
                  <Empty />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card
                title="Forecast"
                extra={
                  forecast ? (
                    <Typography.Text type="secondary">
                      {forecast.source} · {forecast.forecast?.method || 'n/a'}
                    </Typography.Text>
                  ) : null
                }
              >
                {!forecast ? (
                  <Empty description="Forecast unavailable" />
                ) : (
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Point forecast">
                      {fmt(forecast.forecast.pointForecast)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Band">
                      {fmt(forecast.forecast.lowerBand)} –{' '}
                      {fmt(forecast.forecast.upperBand)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Confidence">
                      {forecast.forecast.confidence || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Notes">
                      {forecast.forecast.notes || '—'}
                    </Descriptions.Item>
                    {(forecast.forecast.horizons || []).map((h) => (
                      <Descriptions.Item
                        key={h.months}
                        label={`+${h.months} mo`}
                      >
                        {fmt(h.value)}
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                )}
              </Card>
            </Col>
          </Row>

          <Card title="Period metrics">
            <DataTable
              size="small"
              rowKey="periodKey"
              dataSource={detail.history.map((h) => {
                const m = detail.metrics.find((x) => x.periodKey === h.periodKey);
                return {
                  periodKey: h.periodKey,
                  stockStatus: m?.stockStatus || '—',
                  stockDelta: m?.stockDelta ?? null,
                  stockTotal: h.stockTotal,
                  rol: h.rol,
                  poOps: h.poOps,
                  quotOps: h.quotOps,
                };
              })}
              columns={[
                { title: 'Period', dataIndex: 'periodKey' },
                {
                  title: 'Status',
                  dataIndex: 'stockStatus',
                  render: (s: string) =>
                    s && s !== '—' ? <StatusTag status={s} /> : '—',
                },
                { title: 'Stock', dataIndex: 'stockTotal', render: fmt },
                { title: 'ROL', dataIndex: 'rol', render: fmt },
                {
                  title: 'Still Order Processing Qty',
                  dataIndex: 'poOps',
                  render: fmt,
                },
                {
                  title: 'Already Ordered Qty',
                  dataIndex: 'quotOps',
                  render: fmt,
                },
                {
                  title: 'Δ Stock',
                  dataIndex: 'stockDelta',
                  render: fmt,
                },
              ]}
              locale={{ emptyText: <Empty description="No metrics" /> }}
            />
          </Card>
        </Space>
      )}
    </div>
  );
}
