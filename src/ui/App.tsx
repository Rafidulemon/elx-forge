import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/Toaster';
import { useStorageSync } from './hooks/useStorageSync';
import { startConsoleStream } from './lib/consoleStream';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ExperimentEditorPage } from './pages/ExperimentEditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConsolePage } from './pages/ConsolePage';

export default function App() {
  useStorageSync();
  startConsoleStream();

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/project/:projectId" element={<ProjectDetailPage />} />
          <Route path="/project/:projectId/experiment/:experimentId" element={<ExperimentEditorPage />} />
          <Route path="/console" element={<ConsolePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </HashRouter>
  );
}