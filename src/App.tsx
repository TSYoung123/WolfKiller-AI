import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const Home = lazy(() => import('./pages/Home'))
const Config = lazy(() => import('./pages/Config'))
const Game = lazy(() => import('./pages/Game'))
const Result = lazy(() => import('./pages/Result'))
const Settings = lazy(() => import('./pages/Settings'))

/** 路由切换时的加载过渡 */
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="w-10 h-10 rounded-full border-2 border-gold/30 border-t-gold animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/config" element={<Config />} />
        <Route path="/game" element={<Game />} />
        <Route path="/result" element={<Result />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  )
}

export default App
