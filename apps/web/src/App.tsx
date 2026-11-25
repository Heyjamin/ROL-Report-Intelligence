import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import ProtectedRoute from '@/auth/ProtectedRoute';
import AppLayout from '@/layout/AppLayout';
import Login from '@/pages/Login';
import ExecutiveDashboard from '@/pages/ExecutiveDashboard';
import MonthlyStockInsight from '@/pages/MonthlyStockInsight';
import ItemIntelligence from '@/pages/ItemIntelligence';
import InventoryExplorer from '@/pages/InventoryExplorer';
import PredictiveAnalytics from '@/pages/PredictiveAnalytics';
import RiskAttention from '@/pages/RiskAttention';
import AiAssistant from '@/pages/AiAssistant';
import ReportRepository from '@/pages/ReportRepository';
import ProcessingMonitor from '@/pages/ProcessingMonitor';
import UserManagement from '@/pages/UserManagement';
import RoleManagement from '@/pages/RoleManagement';
import AuditLogs from '@/pages/AuditLogs';
import SystemConfiguration from '@/pages/SystemConfiguration';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<ExecutiveDashboard />} />
          <Route path="/reports/monthly-insight" element={<MonthlyStockInsight />} />
          <Route path="/inventory" element={<InventoryExplorer />} />
          <Route path="/inventory/:itemCode" element={<ItemIntelligence />} />
          <Route path="/forecasts" element={<PredictiveAnalytics />} />
          <Route path="/risk" element={<RiskAttention />} />
          <Route path="/assistant" element={<AiAssistant />} />
          <Route path="/reports/repository" element={<ReportRepository />} />
          <Route path="/ingestion" element={<ProcessingMonitor />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/roles" element={<RoleManagement />} />
          <Route path="/admin/audit" element={<AuditLogs />} />
          <Route path="/admin/config" element={<SystemConfiguration />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
