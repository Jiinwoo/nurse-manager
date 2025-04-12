import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  return (
    <div className="container-fluid">
      <div className="row">
        {/* Sidebar */}
        <div className="col-md-3 col-lg-2 sidebar p-0">
          <div className="d-flex flex-column p-3">
            <h5 className="mb-4 text-center">간호사 관리 시스템</h5>
            <ul className="nav nav-pills flex-column mb-auto">
              <li className="nav-item">
                <NavLink to="/" className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                } end>
                  대시보드
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/nurses" className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                }>
                  간호사 관리
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/teams" className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                }>
                  팀 관리
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/shifts" className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                }>
                  근무 일정
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        {/* Main content */}
        <div className="col-md-9 col-lg-10 content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout; 