import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { api, downloadBlob, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import PeriodSelect from '@/components/PeriodSelect';
import StatusTag from '@/components/StatusTag';
import { NAVY } from '@/theme';

type Insight = {
  period: string | null;
  summary: string;
  kpis?: {
    itemCount: number;
    stockout: number;
    critical: number;
    belowRol: number;
    excess: number;
    gapValue: number;
    stockValue: number;
  } | null;
  charts?: {
    topIncreases?: { itemCode: string; stockDelta: number }[];
    topDecreases?: { itemCode: string; stockDelta: number }[];
    critical?: { itemCode: string; stockStatus: string; gapValue: number | null }[];
  };
  attention?: { itemCode: string; stockStatus: string; recommendedAction: string | null }[];
  highlights?: {
    decreasing: number;
    highVol: number;
    largestGap: { itemCode: string; gapValue: number | null; stockStatus: string }[];
  };
};

export default function MonthlyStockInsight() {
  const [period, setPeriod] = useState<string>();
  const [data, setData] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!period) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: d } = await api.get<Insight>('/reports/monthly-insight', {
          params: { period },
        });
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
  }, [period]);

  const exportFile = async (kind: 'xlsx' | 'pdf') => {
    setExporting(kind);
    try {
      const path =
        kind === 'xlsx'
          ? '/exports/monthly-insight.xlsx'
          : '/exports/monthly-insight.pdf';
      await downloadBlob(path, `monthly-insight-${period || 'latest'}.${kind}`, {
        period,
      });
      message.success(`${kind.toUpperCase()} download started`);
    } catch (e) {
      message.error(errMessage(e, 'Export failed'));
    } finally {
      setExporting(null);
    }
  };

  const fmt = (n?: number | null) =>
    n == null ? '—' : Math.round(n).toLocaleString();

  return (
    <div>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        wrap
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0, color: NAVY }}>
            Monthly Stock Insight
          </Typography.Title>
          <Typography.Text type="secondary">
            Narrative summary with exportable Excel / PDF
          </Typography.Text>
        </div>
        <Space wrap>
          <PeriodSelect value={period} onChange={setPeriod} />
          <Button
            icon={<FileExcelOutlined />}
            loading={exporting === 'xlsx'}
            onClick={() => void exportFile('xlsx')}
            disabled={!period}
          >
            Excel
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            loading={exporting === 'pdf'}
            onClick={() => void exportFile('pdf')}
            disabled={!period}
          >
            PDF
          </Button>
        </Space>
      </Space>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      )}
      {!loading && !error && !data?.kpis && (
        <Empty description={data?.summary || 'No insight available'} />
      )}

      {!loading && data?.kpis && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Typography.Paragraph style={{ marginBottom: 0, fontSize: 15 }}>
              {data.summary}
            </Typography.Paragraph>
          </Card>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={4}>
              <Card size="small">
                <Statistic title="Items" value={data.kpis.itemCount} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card size="small">
                <Statistic title="Stockout" value={data.kpis.stockout} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card size="small">
                <Statistic title="Critical" value={data.kpis.critical} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card size="small">
                <Statistic title="Below ROL" value={data.kpis.belowRol} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card size="small">
                <Statistic title="Gap value" value={fmt(data.kpis.gapValue)} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card size="small">
                <Statistic
                  title="Decreasing / High vol"
                  value={`${data.highlights?.decreasing ?? 0} / ${data.highlights?.highVol ?? 0}`}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card
                title="Largest gaps"
                extra={
                  <Button
                    type="link"
                    icon={<DownloadOutlined />}
                    onClick={() => void exportFile('xlsx')}
                  >
                    Export
                  </Button>
                }
              >
                <DataTable
                  size="small"
                  rowKey="itemCode"
                  dataSource={data.highlights?.largestGap || []}
                  onRow={(r) => ({
                    onClick: () =>
                      navigate(`/inventory/${encodeURIComponent(r.itemCode)}`),
                    style: { cursor: 'pointer' },
                  })}
                  columns={[
                    { title: 'Item', dataIndex: 'itemCode' },
                    {
                      title: 'Status',
                      dataIndex: 'stockStatus',
                      render: (s: string) => <StatusTag status={s} />,
                    },
                    { title: 'Gap value', dataIndex: 'gapValue', render: fmt },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Attention sample">
                <DataTable
                  size="small"
                  rowKey="itemCode"
                  dataSource={data.attention || []}
                  onRow={(r) => ({
                    onClick: () =>
                      navigate(`/inventory/${encodeURIComponent(r.itemCode)}`),
                    style: { cursor: 'pointer' },
                  })}
                  columns={[
                    { title: 'Item', dataIndex: 'itemCode' },
                    {
                      title: 'Status',
                      dataIndex: 'stockStatus',
                      render: (s: string) => <StatusTag status={s} />,
                    },
                    {
                      title: 'Action',
                      dataIndex: 'recommendedAction',
                      ellipsis: true,
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
