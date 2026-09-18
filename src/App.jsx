import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ClaimDetail from './pages/ClaimDetail'
import Landing from './pages/Landing'
import Legal from './pages/Legal'
import Login from './pages/Login'
import MyClaims from './pages/MyClaims'
import MyReports from './pages/MyReports'
import NotFound from './pages/NotFound'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import Register from './pages/Register'
import ReportDetail from './pages/ReportDetail'
import ReportForm from './pages/ReportForm'
import ReportList from './pages/ReportList'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/hilang" element={<ReportList key="lost" type="lost" />} />
        <Route path="/ditemukan" element={<ReportList key="found" type="found" />} />
        <Route path="/laporan/:id" element={<ReportDetail />} />
        <Route path="/masuk" element={<Login />} />
        <Route path="/daftar" element={<Register />} />
        <Route path="/syarat" element={<Legal kind="syarat" />} />
        <Route path="/privasi" element={<Legal kind="privasi" />} />

        <Route path="/buat" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
        <Route path="/edit/:id" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
        <Route path="/klaim/:id" element={<ProtectedRoute><ClaimDetail /></ProtectedRoute>} />
        <Route path="/saya/laporan" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
        <Route path="/saya/klaim" element={<ProtectedRoute><MyClaims /></ProtectedRoute>} />
        <Route path="/notifikasi" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
