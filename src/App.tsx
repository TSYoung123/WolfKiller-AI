import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Config from './pages/Config'
import Game from './pages/Game'
import Result from './pages/Result'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/config" element={<Config />} />
      <Route path="/game" element={<Game />} />
      <Route path="/result" element={<Result />} />
    </Routes>
  )
}

export default App
