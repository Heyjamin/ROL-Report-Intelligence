import { useMemo, useState } from 'react';
import { Input, Space, Table, Typography } from 'antd';
import type { ColumnsType, ColumnType, TableProps } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';

type DataTableProps<T extends object> = Omit<
  TableProps<T>,
  'pagination' | 'dataSource' | 'columns'
> & {
  columns: ColumnsType<T>;
  dataSource?: T[];
  /** Show keyword search box (default true) */
  searchable?: boolean;
  /** Page size when rows > 10 (default 10) */
  pageSize?: number;
  searchPlaceholder?: string;
};

function cellText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const sa = cellText(a).toLowerCase();
  const sb = cellText(b).toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

function getByPath(record: object, path?: string | number | readonly (string | number)[]) {
  if (path == null) return undefined;
  if (typeof path === 'number') return (record as Record<string, unknown>)[String(path)];
  if (typeof path === 'string') {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc == null || typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[key];
    }, record);
  }
  return path.reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[String(key)];
  }, record);
}

function withSorters<T extends object>(columns: ColumnsType<T>): ColumnsType<T> {
  return columns.map((col) => {
    const c = col as ColumnType<T>;
    if (c.sorter != null || c.children) return col;
    const dataIndex = c.dataIndex;
    if (dataIndex == null && !c.key) return col;
    return {
      ...c,
      sorter: (a: T, b: T) =>
        compareValues(
          getByPath(a as object, dataIndex ?? (c.key as string)),
          getByPath(b as object, dataIndex ?? (c.key as string)),
        ),
      showSorterTooltip: true,
    };
  });
}

function rowMatches<T extends object>(row: T, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  const walk = (val: unknown): boolean => {
    if (val == null) return false;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return String(val).toLowerCase().includes(q);
    }
    if (Array.isArray(val)) return val.some(walk);
    if (typeof val === 'object') {
      return Object.values(val as Record<string, unknown>).some(walk);
    }
    return cellText(val).toLowerCase().includes(q);
  };
  return walk(row);
}

export default function DataTable<T extends object>({
  columns,
  dataSource = [],
  searchable = true,
  pageSize = 10,
  searchPlaceholder = 'Search any keyword…',
  ...rest
}: DataTableProps<T>) {
  const [keyword, setKeyword] = useState('');

  const sortableColumns = useMemo(() => withSorters(columns), [columns]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return dataSource;
    return dataSource.filter((row) => rowMatches(row, keyword));
  }, [dataSource, keyword]);

  const pagination =
    filtered.length > pageSize
      ? {
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total: number, range: [number, number]) =>
            `${range[0]}–${range[1]} of ${total}`,
        }
      : false;

  return (
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      {searchable && (
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={searchPlaceholder}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ maxWidth: 360 }}
          />
          <Typography.Text type="secondary">
            {filtered.length === dataSource.length
              ? `${dataSource.length} row(s)`
              : `${filtered.length} of ${dataSource.length} row(s)`}
          </Typography.Text>
        </Space>
      )}
      <Table<T>
        {...rest}
        columns={sortableColumns}
        dataSource={filtered}
        pagination={pagination}
      />
    </Space>
  );
}
