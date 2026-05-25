import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LocaleProvider } from './contexts/LocaleContext'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage/HomePage'
import RoadmapPage from './pages/RoadmapPage/RoadmapPage'
import FavoritesPage from './pages/FavoritesPage/FavoritesPage'
import InProgressPage from './pages/InProgressPage/InProgressPage'

function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/in-progress" element={<InProgressPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/roadmap/:id" element={<RoadmapPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </LocaleProvider>
  )
}

export default App
