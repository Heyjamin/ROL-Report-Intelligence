import { Tag } from 'antd';
import { STATUS_COLORS } from '@/theme';

export default function StatusTag({ status }: { status?: string | null }) {
  if (!status) return <Tag>—</Tag>;
  const color = STATUS_COLORS[status] || '#64748B';
  return (
    <Tag
      style={{
        color: '#fff',
        background: color,
        border: 'none',
        fontWeight: 600,
        borderRadius: 4,
      }}
    >
      {status.replace(/_/g, ' ')}
    </Tag>
  );
}
