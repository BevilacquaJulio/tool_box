import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
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
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route
                path="hash"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <HashToolPage />
                  </Suspense>
                }
              />
              <Route
                path="jwt"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <JwtToolPage />
                  </Suspense>
                }
              />
              <Route
                path="converter"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <FileConvertToolPage />
                  </Suspense>
                }
              />
              <Route
                path="qrcode"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <QrCodeToolPage />
                  </Suspense>
                }
              />
              <Route
                path="json"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <JsonFormatterToolPage />
                  </Suspense>
                }
              />
              <Route
                path="diff"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <TextDiffToolPage />
                  </Suspense>
                }
              />
              <Route
                path="colors"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <ColorConvertToolPage />
                  </Suspense>
                }
              />
              <Route
                path="db-verify"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <DbVerifyToolPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
