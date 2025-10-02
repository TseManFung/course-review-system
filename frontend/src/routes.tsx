import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Profile from './pages/Profile.tsx';
import SearchResults from './pages/SearchResults.tsx';
import CourseDetail from './pages/CourseDetail.tsx';
import CourseCreate from './pages/CourseCreate.tsx';
import ReviewCreate from './pages/ReviewCreate.tsx';
import InstructorCreate from './pages/InstructorCreate.tsx';
import Admin from './pages/Admin.tsx';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/search" element={<SearchResults />} />
    <Route path="/course/create" element={<CourseCreate />} />
    <Route path="/course/:courseId" element={<CourseDetail />} />
    <Route path="/course/:courseId/review/create" element={<ReviewCreate />} />
    <Route path="/instructor/create" element={<InstructorCreate />} />
    <Route path="/admin" element={<Admin />} />
  </Routes>
);

export default AppRoutes;
