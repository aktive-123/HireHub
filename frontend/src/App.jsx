import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SavedJobsProvider } from './context/SavedJobsContext'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'
import SeekerLayout from './layouts/SeekerLayout'
import EmployerLayout from './layouts/EmployerLayout'
import AdminLayout from './layouts/AdminLayout'

// Public Pages
import HomePage from './pages/public/HomePage'
import JobListPage from './pages/public/JobListPage'
import JobDetailsPage from './pages/public/JobDetailsPage'
import CompaniesPage from './pages/public/CompaniesPage'
import CompanyDetailsPage from './pages/public/CompanyDetailsPage'
import AboutPage from './pages/public/AboutPage'
import ContactPage from './pages/public/ContactPage'
import CareerResourcesPage from './pages/public/CareerResourcesPage'
import CareerArticlePage from './pages/public/CareerArticlePage'
import FaqPage from './pages/public/FaqPage'
import NotFoundPage from './pages/public/NotFoundPage'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterJobSeekerPage from './pages/auth/RegisterJobSeekerPage'
import RegisterEmployerPage from './pages/auth/RegisterEmployerPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'

// Job Seeker Pages
import SeekerDashboardPage from './pages/seeker/SeekerDashboardPage'
import SeekerProfilePage from './pages/seeker/SeekerProfilePage'
import SeekerEditProfilePage from './pages/seeker/SeekerEditProfilePage'
import SeekerApplicationsPage from './pages/seeker/SeekerApplicationsPage'
import SeekerApplicationDetailsPage from './pages/seeker/SeekerApplicationDetailsPage'
import SeekerSavedJobsPage from './pages/seeker/SeekerSavedJobsPage'
import SeekerBrowseJobsPage from './pages/seeker/SeekerBrowseJobsPage'
import SeekerResumePage from './pages/seeker/SeekerResumePage'
import SeekerNotificationsPage from './pages/seeker/SeekerNotificationsPage'
import SeekerSettingsPage from './pages/seeker/SeekerSettingsPage'

// Employer Pages
import EmployerDashboardPage from './pages/employer/EmployerDashboardPage'
import EmployerCompanyProfilePage from './pages/employer/EmployerCompanyProfilePage'
import EmployerEditCompanyPage from './pages/employer/EmployerEditCompanyPage'
import EmployerJobsPage from './pages/employer/EmployerJobsPage'
import EmployerCreateJobPage from './pages/employer/EmployerCreateJobPage'
import EmployerEditJobPage from './pages/employer/EmployerEditJobPage'
import EmployerJobDetailsPage from './pages/employer/EmployerJobDetailsPage'
import EmployerApplicantsPage from './pages/employer/EmployerApplicantsPage'
import EmployerApplicantDetailsPage from './pages/employer/EmployerApplicantDetailsPage'
import EmployerTrackingPage from './pages/employer/EmployerTrackingPage'
import EmployerInterviewsPage from './pages/employer/EmployerInterviewsPage'
import EmployerNotificationsPage from './pages/employer/EmployerNotificationsPage'
import EmployerSettingsPage from './pages/employer/EmployerSettingsPage'

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminJobSeekersPage from './pages/admin/AdminJobSeekersPage'
import AdminEmployersPage from './pages/admin/AdminEmployersPage'
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage'
import AdminJobsPage from './pages/admin/AdminJobsPage'
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage'
import AdminSkillsPage from './pages/admin/AdminSkillsPage'
import AdminActivityLogsPage from './pages/admin/AdminActivityLogsPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'

export default function App() {
  return (
    <AuthProvider>
      <SavedJobsProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/jobs" element={<JobListPage />} />
            <Route path="/jobs/:id" element={<JobDetailsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:id" element={<CompanyDetailsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/resources" element={<CareerResourcesPage />} />
          <Route path="/resources/:slug" element={<CareerArticlePage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/job-seeker" element={<RegisterJobSeekerPage />} />
          <Route path="/register/employer" element={<RegisterEmployerPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        {/* Job Seeker Dashboard Routes */}
        <Route path="/seeker" element={<SeekerLayout />}>
          <Route index element={<SeekerDashboardPage />} />
          <Route path="profile" element={<SeekerProfilePage />} />
          <Route path="profile/edit" element={<SeekerEditProfilePage />} />
          <Route path="applications" element={<SeekerApplicationsPage />} />
          <Route path="applications/:id" element={<SeekerApplicationDetailsPage />} />
          <Route path="saved-jobs" element={<SeekerSavedJobsPage />} />
          <Route path="browse-jobs" element={<SeekerBrowseJobsPage />} />
          <Route path="resume" element={<SeekerResumePage />} />
          <Route path="notifications" element={<SeekerNotificationsPage />} />
          <Route path="settings" element={<SeekerSettingsPage />} />
        </Route>

        {/* Employer Dashboard Routes */}
        <Route path="/employer" element={<EmployerLayout />}>
          <Route index element={<EmployerDashboardPage />} />
          <Route path="company" element={<EmployerCompanyProfilePage />} />
          <Route path="company/edit" element={<EmployerEditCompanyPage />} />
          <Route path="jobs" element={<EmployerJobsPage />} />
          <Route path="jobs/create" element={<EmployerCreateJobPage />} />
          <Route path="jobs/:id/edit" element={<EmployerEditJobPage />} />
          <Route path="jobs/:id" element={<EmployerJobDetailsPage />} />
          <Route path="applicants" element={<EmployerApplicantsPage />} />
          <Route path="applicants/:id" element={<EmployerApplicantDetailsPage />} />
          <Route path="tracking" element={<EmployerTrackingPage />} />
          <Route path="interviews" element={<EmployerInterviewsPage />} />
          <Route path="notifications" element={<EmployerNotificationsPage />} />
          <Route path="settings" element={<EmployerSettingsPage />} />
        </Route>

        {/* Admin Dashboard Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="job-seekers" element={<AdminJobSeekersPage />} />
          <Route path="employers" element={<AdminEmployersPage />} />
          <Route path="companies" element={<AdminCompaniesPage />} />
          <Route path="jobs" element={<AdminJobsPage />} />
          <Route path="applications" element={<AdminApplicationsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="skills" element={<AdminSkillsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="activity-logs" element={<AdminActivityLogsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
      </BrowserRouter>
      </SavedJobsProvider>
    </AuthProvider>
  )
}
