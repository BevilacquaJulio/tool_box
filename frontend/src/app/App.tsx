import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { BootLoader } from '../components/BootLoader';
import { RouteLoadingFallback } from '../components/RouteLoadingFallback';
import { ThemeProvider } from '../hooks/useTheme';
import { HomePage } from '../pages/HomePage';

const HashToolPage = lazy(() =>
  import('../pages/HashToolPage').then((module) => ({ default: module.HashToolPage })),
);
const FileConvertToolPage = lazy(() =>
  import('../pages/FileConvertToolPage').then((module) => ({
    default: module.FileConvertToolPage,
  })),
);
const JwtToolPage = lazy(() =>
  import('../pages/JwtToolPage').then((module) => ({ default: module.JwtToolPage })),
);
const JsonFormatterToolPage = lazy(() =>
  import('../pages/JsonFormatterToolPage').then((module) => ({
    default: module.JsonFormatterToolPage,
  })),
);
const QrCodeToolPage = lazy(() =>
  import('../pages/QrCodeToolPage').then((module) => ({ default: module.QrCodeToolPage })),
);
const ColorConvertToolPage = lazy(() =>
  import('../pages/ColorConvertToolPage').then((module) => ({
    default: module.ColorConvertToolPage,
  })),
);
const TextDiffToolPage = lazy(() =>
  import('../pages/TextDiffToolPage').then((module) => ({
    default: module.TextDiffToolPage,
  })),
);
const DbVerifyToolPage = lazy(() =>
  import('../pages/DbVerifyToolPage').then((module) => ({
    default: module.DbVerifyToolPage,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: 0 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BootLoader />
        <BrowserRouter>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="hash" element={<HashToolPage />} />
                <Route path="jwt" element={<JwtToolPage />} />
                <Route path="converter" element={<FileConvertToolPage />} />
                <Route path="qrcode" element={<QrCodeToolPage />} />
                <Route path="json" element={<JsonFormatterToolPage />} />
                <Route path="diff" element={<TextDiffToolPage />} />
                <Route path="colors" element={<ColorConvertToolPage />} />
                <Route path="db-verify" element={<DbVerifyToolPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
