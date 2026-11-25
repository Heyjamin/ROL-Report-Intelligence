import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Layout,
  Menu,
  Typography,
  Avatar,
  Dropdown,
  theme,
  Space,
  Button,
} from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  AlertOutlined,
  RobotOutlined,
  FileTextOutlined,
  CloudSyncOutlined,
  UserOutlined,
  TeamOutlined,
  AuditOutlined,
  SettingOutlined,
  LineChartOutlined,
  SearchOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/auth/AuthContext';
import { NAVY } from '@/theme';

const { Header, Sider, Content } = Layout;

type MenuDef = {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  roles?: string[];
  permissions?: string[];
};

const MENU: MenuDef[] = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: 'Executive Dashboard',
    path: '/',
    permissions: ['dashboard:read'],
  },
  {
    key: 'monthly',
    icon: <FileTextOutlined />,
    label: 'Monthly Stock Insight',
    path: '/reports/monthly-insight',
    permissions: ['reports:read'],
  },
  {
    key: 'explorer',
    icon: <SearchOutlined />,
    label: 'Inventory Explorer',
    path: '/inventory',
    permissions: ['inventory:read'],
  },
  {
    key: 'predictive',
    icon: <LineChartOutlined />,
    label: 'Predictive Analytics',
    path: '/forecasts',
    permissions: ['forecasts:read'],
  },
  {
    key: 'risk',
    icon: <AlertOutlined />,
    label: 'Risk & Attention',
    path: '/risk',
    permissions: ['dashboard:read'],
  },
  {
    key: 'assistant',
    icon: <RobotOutlined />,
    label: 'AI Assistant',
    path: '/assistant',
    permissions: ['assistant:query'],
  },
  {
    key: 'reports',
    icon: <DatabaseOutlined />,
    label: 'Report Repository',
    path: '/reports/repository',
    permissions: ['ingestion:read'],
  },
  {
    key: 'monitor',
    icon: <CloudSyncOutlined />,
    label: 'Processing Monitor',
    path: '/ingestion',
    permissions: ['ingestion:read'],
  },
  {
    key: 'users',
    icon: <UserOutlined />,
    label: 'User Management',
    path: '/admin/users',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    permissions: ['users:read'],
  },
  {
    key: 'roles',
    icon: <TeamOutlined />,
    label: 'Role Management',
    path: '/admin/roles',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    permissions: ['roles:read'],
  },
  {
    key: 'audit',
    icon: <AuditOutlined />,
    label: 'Audit Logs',
    path: '/admin/audit',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    permissions: ['audit:read'],
  },
  {
    key: 'config',
    icon: <SettingOutlined />,
    label: 'System Configuration',
    path: '/admin/config',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    permissions: ['config:read'],
  },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasRole, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const items = useMemo(() => {
    return MENU.filter((m) => {
      if (m.roles && !hasRole(...m.roles)) return false;
      if (m.permissions && !hasPermission(...m.permissions)) {
        // VIEWER may lack some perms — hide those items
        return false;
      }
      return true;
    }).map((m) => ({
      key: m.path,
      icon: m.icon,
      label: <Link to={m.path}>{m.label}</Link>,
    }));
  }, [hasRole, hasPermission]);

  const selected = useMemo(() => {
    const match = [...MENU]
      .sort((a, b) => b.path.length - a.path.length)
      .find(
        (m) =>
          location.pathname === m.path ||
          (m.path !== '/' && location.pathname.startsWith(m.path)),
      );
    return match ? [match.path] : ['/'];
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={248}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 20px',
            gap: 10,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <BarChartOutlined style={{ color: '#7DD3FC', fontSize: 22 }} />
          {!collapsed && (
            <div>
              <Typography.Text
                strong
                style={{ color: '#fff', display: 'block', lineHeight: 1.2 }}
              >
                ROL Intelligence
              </Typography.Text>
              <Typography.Text
                style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}
              >
                LECO Inventory
              </Typography.Text>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selected}
          items={items}
          style={{ borderInlineEnd: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 20px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((c) => !c)}
            />
            <Typography.Text type="secondary">
              Re-Order Report Platform
            </Typography.Text>
          </Space>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Sign out',
                  onClick: () => {
                    logout();
                    navigate('/login');
                  },
                },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                style={{ background: NAVY }}
                icon={<UserOutlined />}
                size="small"
              />
              <div style={{ lineHeight: 1.2 }}>
                <Typography.Text strong>
                  {user?.displayName || user?.username}
                </Typography.Text>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {(user?.roles || []).join(', ')}
                </Typography.Text>
              </div>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 20 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
