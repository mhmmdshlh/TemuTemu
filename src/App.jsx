import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import ClaimDetail from './pages/ClaimDetail'
import Landing from './pages/Landing'
import Legal from './pages/Legal'
import Masuk from './pages/Masuk'
import NotFound from './pages/NotFound'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import ReportDetail from './pages/ReportDetail'
import ReportForm from './pages/ReportForm'
import ReportList from './pages/ReportList'
import Saya from './pages/Saya'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/laporan" element={<ReportList />} />
      <Route path="/laporan/:id" element={<ReportDetail />} />
      <Route path="/masuk" element={<Masuk />} />
      <Route path="/syarat" element={<Legal kind="syarat" />} />
      <Route path="/privasi" element={<Legal kind="privasi" />} />

      <Route path="/buat/hilang" element={<ProtectedRoute><ReportForm side="hilang" /></ProtectedRoute>} />
      <Route path="/buat/temuan" element={<ProtectedRoute><ReportForm side="temuan" /></ProtectedRoute>} />
      <Route path="/edit/:id" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
      <Route path="/klaim/:id" element={<ProtectedRoute><ClaimDetail /></ProtectedRoute>} />
      <Route path="/notifikasi" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/saya" element={<ProtectedRoute><Saya /></ProtectedRoute>} />
      <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* Kompatibilitas rute lama */}
      <Route path="/hilang" element={<Navigate to="/laporan?jenis=lost" replace />} />
      <Route path="/ditemukan" element={<Navigate to="/laporan?jenis=found" replace />} />
      <Route path="/profile" element={<Navigate to="/profil" replace />} />
      <Route path="/buat" element={<Navigate to="/buat/hilang" replace />} />
      <Route path="/daftar" element={<Navigate to="/masuk" replace />} />
      <Route path="/saya/laporan" element={<Navigate to="/saya" replace />} />
      <Route path="/saya/klaim" element={<Navigate to="/saya" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
