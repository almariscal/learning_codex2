import { BrowserRouter, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeePortal from "./pages/EmployeePortal";
import LoginPage from "./pages/Login";

const App = (): JSX.Element => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LoginPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/employee" element={<EmployeePortal />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
