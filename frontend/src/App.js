import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/store';

// Components
import Navigation from './components/Navigation';
import PrivateRoute from './components/PrivateRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CasesPage from './pages/CasesPage';
import ComplaintsPage from './pages/ComplaintsPage';
import SuspectPage from './pages/SuspectPage';
import DetectiveBoardPage from './pages/DetectiveBoardPage';
import MostWantedPage from './pages/MostWantedPage';
import AdminPage from './pages/AdminPage';
import CaseCreatePage from './pages/CaseCreatePage';
import CaseDetailPage from './pages/CaseDetailPage';
import ComplaintCreatePage from './pages/ComplaintCreatePage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import SuspectDetailPage from './pages/SuspectDetailPage';
import EvidencePage from './pages/EvidencePage';
import EvidenceDetailPage from './pages/EvidenceDetailPage';
import TrialsListPage from './pages/TrialsListPage';
import TrialDetailPage from './pages/TrialDetailPage';
import TipsPage from './pages/TipsPage';
import TipSubmitPage from './pages/TipSubmitPage';
import TipDetailPage from './pages/TipDetailPage';
import RewardLookupPage from './pages/RewardLookupPage';
import BailPage from './pages/BailPage';
import BailReturnPage from './pages/BailReturnPage';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-100">
          <Navigation />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/most-wanted" element={<MostWantedPage />} />
            <Route path="/bail" element={<BailPage />} />
            <Route path="/bail/return" element={<BailReturnPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/cases"
              element={
                <PrivateRoute>
                  <CasesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/cases/new"
              element={
                <PrivateRoute>
                  <CaseCreatePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/cases/:caseId"
              element={
                <PrivateRoute>
                  <CaseDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/detective-board"
              element={
                <PrivateRoute>
                  <DetectiveBoardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/detective-board/:caseId"
              element={
                <PrivateRoute>
                  <DetectiveBoardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/complaints"
              element={
                <PrivateRoute>
                  <ComplaintsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/complaints/new"
              element={
                <PrivateRoute>
                  <ComplaintCreatePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/complaints/:complaintId"
              element={
                <PrivateRoute>
                  <ComplaintDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/suspects"
              element={
                <PrivateRoute>
                  <SuspectPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/suspects/:suspectId"
              element={
                <PrivateRoute>
                  <SuspectDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/evidence"
              element={
                <PrivateRoute>
                  <EvidencePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/evidence/new"
              element={
                <PrivateRoute>
                  <EvidencePage />
                </PrivateRoute>
              }
            />
            <Route path="/evidence/:id" element={<EvidenceDetailPage />} />
            <Route
              path="/judiciary"
              element={
                <PrivateRoute>
                  <TrialsListPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/trials/:trialId"
              element={
                <PrivateRoute>
                  <TrialDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <AdminPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/tips"
              element={
                <PrivateRoute>
                  <TipsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/tips/new"
              element={
                <PrivateRoute>
                  <TipSubmitPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/tips/:tipId"
              element={
                <PrivateRoute>
                  <TipDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/reward-lookup"
              element={
                <PrivateRoute>
                  <RewardLookupPage />
                </PrivateRoute>
              }
            />

            {/* 404 Page */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-5xl font-bold text-gray-900">404</h1>
                    <p className="text-gray-600 mt-4">Page not found</p>
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
