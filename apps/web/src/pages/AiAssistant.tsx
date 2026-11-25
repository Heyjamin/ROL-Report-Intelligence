import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { api, errMessage } from '@/api/client';
import DataTable from '@/components/DataTable';
import PeriodSelect from '@/components/PeriodSelect';
import StatusTag from '@/components/StatusTag';
import { NAVY, STATUS_COLORS } from '@/theme';

type Highlight = {
  label: string;
  value: string | number;
  tone?: 'default' | 'danger' | 'warn' | 'ok' | 'info';
};

type ChartSpec = {
  type: 'bar' | 'pie' | 'line';
  title: string;
  categories?: string[];
  series: { name: string; data: number[] }[];
};

type TableSpec = {
  title?: string;
  columns: { key: string; title: string }[];
  rows: Record<string, string | number | null>[];
};

type AssistantPayload = {
  answer: string;
  period: string | null;
  intent?: string;
  highlights?: Highlight[];
  chart?: ChartSpec;
  table?: TableSpec;
  disclaimer?: string;
};

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  payload?: AssistantPayload;
};

const SUGGESTIONS = [
  'Give me a summary of the current inventory position',
  'Which items are below ROL?',
  'What had the biggest stock drop?',
  'Which items need management attention?',
  'Show high volatility items',
  'How is item B322 doing?',
];

const toneColor: Record<string, string> = {
  danger: '#DC2626',
  warn: '#D97706',
  ok: '#16A34A',
  info: NAVY,
  default: '#334155',
};

function renderAnswerText(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return (
      <p key={i} style={{ margin: '0 0 6px', lineHeight: 1.5 }}>
        {parts.map((part, j) => {
          const bold = part.match(/^\*\*(.+)\*\*$/);
          if (bold) return <strong key={j}>{bold[1]}</strong>;
          return <span key={j}>{part}</span>;
        })}
      </p>
    );
  });
}

function buildChartOption(chart: ChartSpec) {
  if (chart.type === 'pie') {
    const cats = chart.categories || [];
    const data = (chart.series[0]?.data || []).map((v, i) => ({
      name: cats[i] || `Item ${i + 1}`,
      value: v,
      itemStyle: {
        color: STATUS_COLORS[cats[i]] || undefined,
      },
    }));
    return {
      title: { text: chart.title, left: 'center', textStyle: { fontSize: 13 } },
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['35%', '65%'],
          data,
          label: { formatter: '{b}: {c}' },
        },
      ],
    };
  }

  if (chart.type === 'line') {
    return {
      title: { text: chart.title, left: 0, textStyle: { fontSize: 13 } },
      tooltip: { trigger: 'axis' },
      legend: { top: 24 },
      grid: { left: 48, right: 16, top: 56, bottom: 28 },
      xAxis: { type: 'category', data: chart.categories || [] },
      yAxis: { type: 'value' },
      series: chart.series.map((s) => ({
        name: s.name,
        type: 'line',
        smooth: true,
        data: s.data,
      })),
    };
  }

  return {
    title: { text: chart.title, left: 0, textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 16, top: 40, bottom: 64 },
    xAxis: {
      type: 'category',
      data: chart.categories || [],
      axisLabel: { rotate: 35, fontSize: 10 },
    },
    yAxis: { type: 'value' },
    series: chart.series.map((s) => ({
      name: s.name,
      type: 'bar',
      data: s.data,
      itemStyle: { color: NAVY },
    })),
  };
}

function AssistantBubble({ payload, text }: { payload?: AssistantPayload; text: string }) {
  const fmtCell = (v: unknown) => {
    if (v == null) return '—';
    if (typeof v === 'number') return v.toLocaleString('en-LK');
    return String(v);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 8 }}>{renderAnswerText(text)}</div>

      {payload?.highlights && payload.highlights.length > 0 && (
        <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
          {payload.highlights.map((h) => (
            <Col xs={12} sm={8} md={6} key={h.label}>
              <Card size="small" styles={{ body: { padding: '10px 12px' } }}>
                <Statistic
                  title={h.label}
                  value={h.value}
                  valueStyle={{
                    fontSize: 16,
                    color: toneColor[h.tone || 'default'],
                  }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {payload?.chart && (
        <Card size="small" style={{ marginBottom: 12 }}>
          <ReactECharts
            option={buildChartOption(payload.chart)}
            style={{ height: 280 }}
            notMerge
          />
        </Card>
      )}

      {payload?.table && payload.table.rows.length > 0 && (
        <Card
          size="small"
          title={payload.table.title}
          style={{ marginBottom: 8 }}
        >
          <DataTable
            size="small"
            rowKey={(_, i) => String(i)}
            dataSource={payload.table.rows}
            scroll={{ x: true }}
            columns={payload.table.columns.map((c) => ({
              title: c.title,
              dataIndex: c.key,
              key: c.key,
              render: (v: unknown) =>
                c.key === 'stockStatus' || c.key === 'status' ? (
                  <StatusTag status={String(v || '')} />
                ) : (
                  fmtCell(v)
                ),
            }))}
          />
        </Card>
      )}

      {(payload?.period || payload?.disclaimer) && (
        <Space wrap size={4} style={{ marginTop: 4 }}>
          {payload.period && <Tag color="blue">Period {payload.period}</Tag>}
          {payload.disclaimer && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {payload.disclaimer}
            </Typography.Text>
          )}
        </Space>
      )}
    </div>
  );
}

export default function AiAssistant() {
  const [period, setPeriod] = useState<string>();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async (raw?: string) => {
    const q = (raw ?? question).trim();
    if (q.length < 2) return;
    setLoading(true);
    setError(null);
    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: q,
    };
    setMessages((m) => [...m, userMsg]);
    setQuestion('');
    try {
      const { data } = await api.post<AssistantPayload>('/assistant/query', {
        question: q,
        period,
      });
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.answer,
          payload: data,
        },
      ]);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 140px)',
      }}
    >
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}
        wrap
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0, color: NAVY }}>
            Inventory Assistant
          </Typography.Title>
          <Typography.Text type="secondary">
            Ask in plain language — answers use your imported Re-Order reports
          </Typography.Text>
        </div>
        <PeriodSelect value={period} onChange={setPeriod} allowClear />
      </Space>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      <Card
        styles={{ body: { padding: 12, display: 1, displayDirection: 'column', minHeight: 420 } }}
        style={{ flex: 1, marginBottom: 12 }}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px 16px' }}>
          {!messages.length && (
            <div style={{ textAlign: 'center', padding: '32px 12px' }}>
              <RobotOutlined style={{ fontSize: 36, color: NAVY, marginBottom: 12 }} />
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                How can I help with inventory today?
              </Typography.Title>
              <Typography.Paragraph type="secondary">
                Pick a suggestion or type your own question.
              </Typography.Paragraph>
              <Space wrap style={{ justifyContent: 'center' }}>
                {SUGGESTIONS.map((s) => (
                  <Button key={s} onClick={() => void ask(s)}>
                    {s}
                  </Button>
                ))}
              </Space>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  maxWidth: m.role === 'user' ? '70%' : '100%',
                  width: m.role === 'assistant' ? '100%' : undefined,
                }}
              >
                <Space size={6} style={{ marginBottom: 4 }}>
                  {m.role === 'assistant' ? (
                    <RobotOutlined style={{ color: NAVY }} />
                  ) : (
                    <UserOutlined style={{ color: '#64748B' }} />
                  )}
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {m.role === 'assistant' ? 'Assistant' : 'You'}
                  </Typography.Text>
                </Space>
                <div
                  style={{
                    background: m.role === 'user' ? NAVY : '#F8FAFC',
                    color: m.role === 'user' ? '#fff' : '#0F172A',
                    border: m.role === 'assistant' ? '1px solid #E2E8F0' : undefined,
                    padding: m.role === 'user' ? '10px 14px' : '14px 16px',
                    borderRadius:
                      m.role === 'user'
                        ? '12px 12px 4px 12px'
                        : '12px 12px 12px 4px',
                  }}
                >
                  {m.role === 'user' ? (
                    <Typography.Text style={{ color: '#fff' }}>
                      {m.text}
                    </Typography.Text>
                  ) : (
                    <AssistantBubble text={m.text} payload={m.payload} />
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <Typography.Text type="secondary">
              <RobotOutlined /> Looking up verified report data…
            </Typography.Text>
          )}
          <div ref={endRef} />
        </div>
      </Card>

      {!!messages.length && (
        <Space wrap style={{ marginBottom: 8 }}>
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <Tag
              key={s}
              style={{ cursor: 'pointer' }}
              onClick={() => void ask(s)}
            >
              {s}
            </Tag>
          ))}
        </Space>
      )}

      <Card size="small">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            size="large"
            placeholder="Ask about stock, ROL risk, an item code…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onPressEnter={() => void ask()}
            disabled={loading}
          />
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            loading={loading}
            onClick={() => void ask()}
          >
            Send
          </Button>
        </Space.Compact>
      </Card>
    </div>
  );
}
