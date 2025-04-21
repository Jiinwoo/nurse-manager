import React, { useState, useEffect } from 'react';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    nurseCount: 0,
    teamCount: 0,
    shiftCount: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get nurse count
        const nurseResponse = await window.api.nurses.getAll();
        const nurseCount = nurseResponse.success ? (nurseResponse.data?.length || 0) : 0;

        // Get team count
        const teamResponse = await window.api.teams.getAll();
        const teamCount = teamResponse.success ? (teamResponse.data?.length || 0) : 0;

        // Get shift count
        const shiftResponse = await window.api.shifts.getAll();
        const shiftCount = shiftResponse.success ? (shiftResponse.data?.length || 0) : 0;

        setStats({
          nurseCount,
          teamCount,
          shiftCount
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <h2 className="page-title">대시보드</h2>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card text-white bg-primary">
            <div className="card-body">
              <h5 className="card-title">간호사</h5>
              <p className="card-text display-4">{stats.nurseCount}</p>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-4">
          <div className="card text-white bg-success">
            <div className="card-body">
              <h5 className="card-title">팀</h5>
              <p className="card-text display-4">{stats.teamCount}</p>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-4">
          <div className="card text-white bg-info">
            <div className="card-body">
              <h5 className="card-title">근무</h5>
              <p className="card-text display-4">{stats.shiftCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-body">
          <h5 className="card-title">시스템 정보</h5>
          <p className="card-text">간호사 관리 시스템에 오신 것을 환영합니다. 이 시스템은 간호사 정보, 팀, 그리고 근무 일정을 관리하는 기능을 제공합니다.</p>
          <ul>
            <li>간호사 관리: 간호사 정보를 추가, 편집, 삭제할 수 있습니다.</li>
            <li>팀 관리: 팀을 생성하고 간호사를 팀에 배정할 수 있습니다.</li>
            <li>근무 일정: 간호사의 근무 일정을 계획하고 관리할 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 