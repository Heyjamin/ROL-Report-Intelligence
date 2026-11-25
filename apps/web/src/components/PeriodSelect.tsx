import { useEffect, useRef, useState } from 'react';
import { Select, Spin } from 'antd';
import { api, errMessage } from '@/api/client';

type Period = { periodKey: string; label?: string | null };

type Props = {
  value?: string;
  onChange: (period: string | undefined) => void;
  style?: React.CSSProperties;
  allowClear?: boolean;
};

export default function PeriodSelect({
  value,
  onChange,
  style,
  allowClear = false,
}: Props) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<Period[]>('/periods');
        if (cancelled) return;
        setPeriods(data);
        if (!valueRef.current && data.length) {
          onChangeRef.current(data[data.length - 1].periodKey);
        }
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

  if (loading) return <Spin size="small" />;
  if (error) return <span style={{ color: '#DC2626' }}>{error}</span>;

  return (
    <Select
      style={{ minWidth: 160, ...style }}
      placeholder="Period"
      value={value}
      allowClear={allowClear}
      onChange={(v) => onChange(v)}
      options={periods.map((p) => ({
        value: p.periodKey,
        label: p.label || p.periodKey,
      }))}
    />
  );
}
