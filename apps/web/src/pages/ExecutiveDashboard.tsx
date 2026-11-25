import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Statistic,
  Typography,
} from 'antd';
import ReactECharts from 'echarts-for-react';
import { api, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import PeriodSelect from '@/components/PeriodSelect';
import StatusTag from '@/components/StatusTag';
import { NAVY, STATUS_COLORS } from '@/theme';

type Kpis = {
  itemCount: number;
  stockout: number;
  critical: number;
  belowRol: number;
  atRol: number;
  aboveRol: number;
  excess: number;
  gapValue: number;
  stockValue: number;
  byStatus: Record<string, number>;
  partialRows: number;
};

type Charts = {
  trend: {
    period: string;
    below: number;
    at: number;
    above: number;
    stockValue: number;
    itemCount: number;
  }[];
  belowAtAbove: { below: number; at: number; above: number };
  topIncreases: {
    itemCode: string;
    stockDelta: number;
    stockStatus: string;
  }[];
  topDecreases: {
    itemCode: string;
    stockDelta: number;
    stockStatus: string;
  }[];
  critical: {
    itemCode: string;
    stockStatus: string;
    stockTotal: number | null;
    rol: number | null;
    gapQty: number | null;
    gapValue: number | null;
  }[];
  excess: {
    itemCode: string;
    stockTotal: number | null;
    rol: number | null;
    rolRatio: number | null;
  }[];
};

const fmt = (n?: number | null) =>
  n == null ? '—' : Math.round(n).toLocaleString();

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState<string>();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
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
        const [k, c] = await Promise.all([
          api.get<{ period: string; kpis: Kpis | null }>('/dashboard/kpis', {
            params: { period },
          }),
          api.get<{ period: string; charts: Charts | null }>(
            '/dashboard/charts',
            { params: { period } },
          ),
        ]);
        if (cancelled) return;
        setKpis(k.data.kpis);
        setCharts(c.data.charts);
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

  const goItem = (code: string) => navigate(`/inventory/${encodeURIComponent(code)}`);
  const goExplorer = (status?: string) =>
    navigate(status ? `/inventory?status=${status}` : '/inventory');

  const trendOpt = {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 48, right: 24, top: 40, bottom: 32 },
    xAxis: {
      type: 'category',
      data: charts?.trend.map((t) => t.period) || [],
    },
    yAxis: { type: 'value', name: 'Items' },
    series: [
      {
        name: 'Below / at risk',
        type: 'bar',
        stack: 's',
        data: charts?.trend.map((t) => t.below) || [],
        itemStyle: { color: STATUS_COLORS.BELOW_ROL },
      },
      {
        name: 'At ROL',
        type: 'bar',
        stack: 's',
        data: charts?.trend.map((t) => t.at) || [],
        itemStyle: { color: STATUS_COLORS.AT_ROL },
      },
      {
        name: 'Above ROL',
        type: 'bar',
        stack: 's',
        data: charts?.trend.map((t) => t.above) || [],
        itemStyle: { color: STATUS_COLORS.ABOVE_ROL },
      },
    ],
  };

  const pieOpt = {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        data: [
          {
            name: 'Below / risk',
            value: charts?.belowAtAbove.below ?? 0,
            itemStyle: { color: STATUS_COLORS.BELOW_ROL },
          },
          {
            name: 'At ROL',
            value: charts?.belowAtAbove.at ?? 0,
            itemStyle: { color: STATUS_COLORS.AT_ROL },
          },
          {
            name: 'Above ROL',
            value: charts?.belowAtAbove.above ?? 0,
            itemStyle: { color: STATUS_COLORS.ABOVE_ROL },
          },
        ],
        label: { formatter: '{b}\n{c}' },
      },
    ],
  };

  const valueTrendOpt = {
    tooltip: { trigger: 'axis' },
    grid: { left: 64, right: 24, top: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: charts?.trend.map((t) => t.period) || [],
    },
    yAxis: { type: 'value', name: 'LKR' },
    series: [
      {
        name: 'Stock value',
        type: 'line',
        smooth: true,
        data: charts?.trend.map((t) => Math.round(t.stockValue)) || [],
        itemStyle: { color: NAVY },
        areaStyle: { color: 'rgba(10,37,64,0.12)' },
      },
    ],
  };

  return (
    <div>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        wrap
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0, color: NAVY }}>
            Executive Dashboard
          </Typography.Title>
          <Typography.Text type="secondary">
            Portfolio KPIs and stock movement analytics
          </Typography.Text>
        </div>
        <PeriodSelect value={period} onChange={setPeriod} />
      </Space>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      )}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      )}
      {!loading && !error && !kpis && (
        <Empty description="No KPI data for this period. Run ingestion sync first." />
      )}

      {!loading && kpis && (
        <>
          <Row gutter={[16, 16]}>
            {[
              { title: 'Items', value: kpis.itemCount },
              { title: 'Stockout', value: kpis.stockout, color: STATUS_COLORS.STOCKOUT },
              { title: 'Critical', value: kpis.critical, color: STATUS_COLORS.CRITICAL },
              { title: 'Below ROL risk', value: kpis.belowRol, color: STATUS_COLORS.BELOW_ROL },
              { title: 'Excess', value: kpis.excess, color: STATUS_COLORS.EXCESS },
              { title: 'Gap value (LKR)', value: fmt(kpis.gapValue) },
              { title: 'Stock value (LKR)', value: fmt(kpis.stockValue) },
              { title: 'Partial rows', value: kpis.partialRows },
            ].map((k) => (
              <Col xs={12} sm={8} md={6} lg={3} key={k.title}>
                <Card size="small" hoverable onClick={() => goExplorer()}>
                  <Statistic
                    title={k.title}
                    value={k.value}
                    valueStyle={{ color: k.color || NAVY, fontSize: 22 }}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={14}>
              <Card title="Status trend by period">
                {charts?.trend?.length ? (
                  <ReactECharts
                    option={trendOpt}
                    style={{ height: 320 }}
                    onEvents={{
                      click: (params: { name?: string }) => {
                        if (params?.name) {
                          navigate(`/inventory?period=${params.name}`);
                        }
                      },
                    }}
                  />
                ) : (
                  <Empty />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="Below / At / Above (current)">
                <ReactECharts
                  option={pieOpt}
                  style={{ height: 320 }}
                  onEvents={{
                    click: (params: { name?: string }) => {
                      if (params?.name?.includes('Below')) goExplorer('BELOW_ROL');
                      else if (params?.name?.includes('At')) goExplorer('AT_ROL');
                      else goExplorer('ABOVE_ROL');
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={24}>
              <Card title="On-hand stock value trend">
                <ReactECharts option={valueTrendOpt} style={{ height: 260 }} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Top stock increases">
                <DataTable
                  size="small"
                  rowKey="itemCode"
                  dataSource={charts?.topIncreases || []}
                  onRow={(r) => ({ onClick: () => goItem(r.itemCode), style: { cursor: 'pointer' } })}
                  columns={[
                    { title: 'Item', dataIndex: 'itemCode' },
                    {
                      title: 'Δ Stock',
                      dataIndex: 'stockDelta',
                      render: (v: number) => (
                        <span style={{ color: STATUS_COLORS.ABOVE_ROL }}>+{fmt(v)}</span>
                      ),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'stockStatus',
                      render: (s: string) => <StatusTag status={s} />,
                    },
                  ]}
                  locale={{ emptyText: <Empty description="No deltas" /> }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Top stock decreases">
                <DataTable
                  size="small"
                  rowKey="itemCode"
                  dataSource={charts?.topDecreases || []}
                  onRow={(r) => ({ onClick: () => goItem(r.itemCode), style: { cursor: 'pointer' } })}
                  columns={[
                    { title: 'Item', dataIndex: 'itemCode' },
                    {
                      title: 'Δ Stock',
                      dataIndex: 'stockDelta',
                      render: (v: number) => (
                        <span style={{ color: STATUS_COLORS.STOCKOUT }}>{fmt(v)}</span>
                      ),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'stockStatus',
                      render: (s: string) => <StatusTag status={s} />,
                    },
                  ]}
                  locale={{ emptyText: <Empty description="No deltas" /> }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card title="Critical / below ROL (by gap value)">
                <DataTable
                  size="small"
                  rowKey="itemCode"
                  dataSource={charts?.critical || []}
                  onRow={(r) => ({ onClick: () => goItem(r.itemCode), style: { cursor: 'pointer' } })}
                  columns={[
                    { title: 'Item', dataIndex: 'itemCode' },
                    {
                      title: 'Status',
                      dataIndex: 'stockStatus',
                      render: (s: string) => <StatusTag status={s} />,
                    },
                    { title: 'Stock', dataIndex: 'stockTotal', render: fmt },
                    { title: 'ROL', dataIndex: 'rol', render: fmt },
                    { title: 'Gap qty', dataIndex: 'gapQty', render: fmt },
                    { title: 'Gap value', dataIndex: 'gapValue', render: fmt },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="Excess stock">
                <DataTable
                  size="small"
                  rowKey="itemCode"
                  dataSource={charts?.excess || []}
                  onRow={(r) => ({ onClick: () => goItem(r.itemCode), style: { cursor: 'pointer' } })}
                  columns={[
                    { title: 'Item', dataIndex: 'itemCode' },
                    { title: 'Stock', dataIndex: 'stockTotal', render: fmt },
                    { title: 'ROL', dataIndex: 'rol', render: fmt },
                    {
                      title: 'Ratio',
                      dataIndex: 'rolRatio',
                      render: (v: number | null) =>
                        v == null ? '—' : v.toFixed(2),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
