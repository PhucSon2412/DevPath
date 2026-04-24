import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LocaleProvider } from './contexts/LocaleContext'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage/HomePage'
import RoadmapPage from './pages/RoadmapPage/RoadmapPage'
import LoginPage from './pages/LoginPage/LoginPage'
import RegisterPage from './pages/RegisterPage/RegisterPage'
import FavoritesPage from './pages/FavoritesPage/FavoritesPage'
import InProgressPage from './pages/InProgressPage/InProgressPage'
import QaPage from './pages/QaPage/QaPage'

function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/in-progress" element={<InProgressPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/qa" element={<QaPage />} />
            <Route path="/roadmap/:id" element={<RoadmapPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </LocaleProvider>
  )
}

export default App
