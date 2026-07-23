import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:5000";
const ROWS_PER_PAGE = 50;

const chartColors = [
  "#244a79",
  "#8a4b13",
  "#2f6f4e",
  "#7a3e8a",
  "#a43f3f",
  "#4d6f8f",
  "#b88724",
  "#3f3f3f"
];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [needsSupport, setNeedsSupport] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortStack, setSortStack] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const summaryResponse = await fetch(`${API_BASE_URL}/api/reports/summary`);
        const studentsResponse = await fetch(`${API_BASE_URL}/api/students`);
        const supportResponse = await fetch(`${API_BASE_URL}/api/reports/needs-support`);

        const summaryData = await summaryResponse.json();
        const studentsData = await studentsResponse.json();
        const supportData = await supportResponse.json();

        setSummary(summaryData);
        setStudents(studentsData);
        setNeedsSupport(supportData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeView, sortStack]);

  function handleLogin(event) {
    event.preventDefault();

    if (loginUsername === "admin" && loginPassword === "admin") {
      setIsLoggedIn(true);
      setUserRole("admin");
      setActiveView("all");
      setLoginError("");
      return;
    }

    if (loginUsername === "parent" && loginPassword === "parent") {
      setIsLoggedIn(true);
      setUserRole("parent");
      setActiveView("parent");
      setLoginError("");
      return;
    }

    setLoginError("Incorrect username or password.");
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setUserRole("");
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
    setNotificationsOpen(false);
    setAccountMenuOpen(false);
    setFilterMenuOpen(false);
    setActiveView("all");
  }

  function handleStackableSortClick(key) {
    setSortStack((currentStack) => {
      const existingFilter = currentStack.find((filter) => filter.key === key);

      if (!existingFilter) {
        return [...currentStack, { key, direction: "asc" }];
      }

      if (existingFilter.direction === "asc") {
        return currentStack.map((filter) =>
          filter.key === key ? { ...filter, direction: "desc" } : filter
        );
      }

      return currentStack.filter((filter) => filter.key !== key);
    });
  }

  function clearAllFilters() {
    setSortStack([]);
  }

  function getSortLabel(key, label) {
    const activeFilter = sortStack.find((filter) => filter.key === key);

    if (!activeFilter) {
      return label;
    }

    if (activeFilter.direction === "asc") {
      return `${label} ↑`;
    }

    return `${label} ↓`;
  }

  function getFilterOrderNumber(key) {
    const index = sortStack.findIndex((filter) => filter.key === key);
    return index === -1 ? "" : ` (${index + 1})`;
  }

  function compareValues(valueA, valueB, direction) {
    if (valueA === undefined || valueA === null) return 1;
    if (valueB === undefined || valueB === null) return -1;

    const numberA = Number(valueA);
    const numberB = Number(valueB);

    if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) {
      return direction === "asc" ? numberB - numberA : numberA - numberB;
    }

    return direction === "asc"
      ? String(valueB).localeCompare(String(valueA))
      : String(valueA).localeCompare(String(valueB));
  }

  const displayedData = useMemo(() => {
    const baseData = activeView === "support" ? needsSupport : students;
    const copiedData = [...baseData];

    if (sortStack.length === 0) {
      return copiedData;
    }

    copiedData.sort((a, b) => {
      for (const filter of sortStack) {
        const comparison = compareValues(
          a[filter.key],
          b[filter.key],
          filter.direction
        );

        if (comparison !== 0) {
          return comparison;
        }
      }

      return 0;
    });

    return copiedData;
  }, [students, needsSupport, activeView, sortStack]);

  const totalPages = Math.max(1, Math.ceil(displayedData.length / ROWS_PER_PAGE));

  const currentPageData = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;

    return displayedData.slice(startIndex, endIndex);
  }, [displayedData, currentPage]);

  const startRow =
    displayedData.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;

  const endRow = Math.min(currentPage * ROWS_PER_PAGE, displayedData.length);

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(page - 1, 1));
  }

  function goToNextPage() {
    setCurrentPage((page) => Math.min(page + 1, totalPages));
  }

  function goToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  const pieChartKey =
    sortStack.length > 0 ? sortStack[sortStack.length - 1].key : "final_result";

  const pieChartTitle =
    sortStack.length > 0
      ? `Pie Chart by ${formatColumnName(pieChartKey)}`
      : "Pie Chart by Pass / Fail";

  const pieChartData = useMemo(() => {
    return buildPieChartData(displayedData, pieChartKey);
  }, [displayedData, pieChartKey]);

  const parentStudent =
    students.find((student) => String(student.student_id).toUpperCase() === "S1") ||
    students[0];

  if (!isLoggedIn) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Student Data Demo</h1>
          <h2>Login</h2>

          <form onSubmit={handleLogin}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={loginUsername}
              onChange={(event) => setLoginUsername(event.target.value)}
              placeholder="Enter username"
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="Enter password"
            />

            {loginError && <p className="login-error">{loginError}</p>}

            <button type="submit">Sign In</button>
          </form>

          <p className="login-hint">Admin login: admin / admin</p>
          <p className="login-hint">Parent login: parent / parent</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-page">Loading student dashboard...</div>;
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">STUDENT DATA DEMO</div>

        <div className="top-actions">
          <div className="top-action-wrapper">
            <button
              className="top-action-button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setAccountMenuOpen(false);
              }}
              aria-label="Notifications"
            >
              🔔
            </button>

            {notificationsOpen && (
              <div className="top-popup notifications-popup">
                <h3>Notifications</h3>
                <p>No notifications.</p>
              </div>
            )}
          </div>

          <div className="top-action-wrapper">
            <button
              className="top-action-button dots-button"
              onClick={() => {
                setAccountMenuOpen(!accountMenuOpen);
                setNotificationsOpen(false);
              }}
              aria-label="Account menu"
            >
              ⋮
            </button>

            {accountMenuOpen && (
              <div className="top-popup account-popup">
                <h3>Account</h3>
                <p>{userRole === "admin" ? "Admin User" : "Parent User"}</p>
                <button className="popup-logout-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="page-title-bar">
        <div className="title-row">
          <h1>{userRole === "admin" ? "Admin Self Service" : "Parent Self Service"}</h1>
        </div>
      </div>

      <div className="main-layout">
        <aside className="side-menu">
          {userRole === "admin" ? (
            <>
              <button
                className={activeView === "all" ? "side-item selected" : "side-item"}
                onClick={() => setActiveView("all")}
              >
                <span className="side-icon">✣</span>
                Student Center
              </button>

              <button
                className={activeView === "support" ? "side-item selected" : "side-item"}
                onClick={() => setActiveView("support")}
              >
                <span className="side-icon">▦</span>
                Needs Support
              </button>
            </>
          ) : (
            <>
              <button
                className={activeView === "parent" ? "side-item selected" : "side-item"}
                onClick={() => setActiveView("parent")}
              >
                <span className="side-icon">✣</span>
                Student Overview
              </button>

              <button
                className={activeView === "resources" ? "side-item selected" : "side-item"}
                onClick={() => setActiveView("resources")}
              >
                <span className="side-icon">▦</span>
                Resources
              </button>
            </>
          )}
        </aside>

        <main className="content">
          {userRole === "admin" ? (
            <AdminDashboard
              activeView={activeView}
              summary={summary}
              sortStack={sortStack}
              filterMenuOpen={filterMenuOpen}
              setFilterMenuOpen={setFilterMenuOpen}
              handleStackableSortClick={handleStackableSortClick}
              clearAllFilters={clearAllFilters}
              getSortLabel={getSortLabel}
              getFilterOrderNumber={getFilterOrderNumber}
              pieChartTitle={pieChartTitle}
              pieChartData={pieChartData}
              currentPageData={currentPageData}
              currentPage={currentPage}
              totalPages={totalPages}
              startRow={startRow}
              endRow={endRow}
              displayedData={displayedData}
              goToPreviousPage={goToPreviousPage}
              goToNextPage={goToNextPage}
              goToTop={goToTop}
            />
          ) : (
            <ParentDashboard
              activeView={activeView}
              student={parentStudent}
              goToTop={goToTop}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function AdminDashboard({
  activeView,
  summary,
  sortStack,
  filterMenuOpen,
  setFilterMenuOpen,
  handleStackableSortClick,
  clearAllFilters,
  getSortLabel,
  getFilterOrderNumber,
  pieChartTitle,
  pieChartData,
  currentPageData,
  currentPage,
  totalPages,
  startRow,
  endRow,
  displayedData,
  goToPreviousPage,
  goToNextPage,
  goToTop
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{activeView === "all" ? "All Data" : "Students Needing Support"}</h2>

        <div className="filter-container">
          <button
            className="filter-button"
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            aria-label="Open filter menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {filterMenuOpen && (
            <div className="filter-popup">
              <h3>Organize Data</h3>

              <button onClick={() => handleStackableSortClick("student_id")}>
                {getSortLabel("student_id", "Student ID")}
                {getFilterOrderNumber("student_id")}
              </button>

              <button onClick={() => handleStackableSortClick("grade_level")}>
                {getSortLabel("grade_level", "Grade")}
                {getFilterOrderNumber("grade_level")}
              </button>

              <button onClick={() => handleStackableSortClick("gender")}>
                {getSortLabel("gender", "Gender")}
                {getFilterOrderNumber("gender")}
              </button>

              <button onClick={() => handleStackableSortClick("attendance_rate")}>
                {getSortLabel("attendance_rate", "Attendance")}
                {getFilterOrderNumber("attendance_rate")}
              </button>

              <button onClick={() => handleStackableSortClick("math_score")}>
                {getSortLabel("math_score", "Math Score")}
                {getFilterOrderNumber("math_score")}
              </button>

              <button onClick={() => handleStackableSortClick("reading_score")}>
                {getSortLabel("reading_score", "Reading Score")}
                {getFilterOrderNumber("reading_score")}
              </button>

              <button onClick={() => handleStackableSortClick("writing_score")}>
                {getSortLabel("writing_score", "Writing Score")}
                {getFilterOrderNumber("writing_score")}
              </button>

              <button onClick={() => handleStackableSortClick("study_time_weekly")}>
                {getSortLabel("study_time_weekly", "Study Hours")}
                {getFilterOrderNumber("study_time_weekly")}
              </button>

              <button onClick={() => handleStackableSortClick("final_result")}>
                {getSortLabel("final_result", "Result")}
                {getFilterOrderNumber("final_result")}
              </button>

              <button className="clear-filter-button" onClick={clearAllFilters}>
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {sortStack.length > 0 && (
        <div className="active-filter-line">
          Active filters:{" "}
          {sortStack.map((filter, index) => (
            <span key={filter.key}>
              {index + 1}. {formatColumnName(filter.key)}{" "}
              {filter.direction === "asc" ? "↑" : "↓"}
            </span>
          ))}
        </div>
      )}

      <div className="summary-line">
        <span>Total Students: <strong>{summary?.total_students ?? "--"}</strong></span>
        <span>Average Attendance: <strong>{summary?.average_attendance_rate ?? "--"}%</strong></span>
        <span>Average Math: <strong>{summary?.average_math_score ?? "--"}</strong></span>
        <span>Average Reading: <strong>{summary?.average_reading_score ?? "--"}</strong></span>
      </div>

      <PieChart title={pieChartTitle} data={pieChartData} />

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Grade</th>
              <th>Gender</th>
              <th>Math</th>
              <th>Reading</th>
              <th>Writing</th>
              <th>Attendance</th>
              <th>Study Hours</th>
              <th>Result</th>
            </tr>
          </thead>

          <tbody>
            {currentPageData.map((student) => (
              <tr key={student.student_id}>
                <td>{student.student_id}</td>
                <td>{student.grade_level ?? "N/A"}</td>
                <td>{student.gender ?? "N/A"}</td>
                <td>{student.math_score ?? "N/A"}</td>
                <td>{student.reading_score ?? "N/A"}</td>
                <td>{student.writing_score ?? "N/A"}</td>
                <td>
                  {student.attendance_rate !== undefined
                    ? `${Number(student.attendance_rate).toFixed(2)}%`
                    : "N/A"}
                </td>
                <td>
                  {student.study_time_weekly !== undefined
                    ? Number(student.study_time_weekly).toFixed(2)
                    : "N/A"}
                </td>
                <td>{student.final_result ?? "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <button onClick={goToPreviousPage} disabled={currentPage === 1}>
          ← Previous 50
        </button>

        <span>
          Showing {startRow} - {endRow} of {displayedData.length}
        </span>

        <button onClick={goToNextPage} disabled={currentPage === totalPages}>
          Next 50 →
        </button>
      </div>

      <button className="bottom-link" onClick={goToTop}>
        ▴ Go to top
      </button>
    </section>
  );
}

function ParentDashboard({ activeView, student, goToTop }) {
  if (!student) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <h2>Student Overview</h2>
        </div>

        <p className="empty-message">Student S1 could not be found.</p>
      </section>
    );
  }

  if (activeView === "resources") {
    return (
      <section className="panel">
        <div className="panel-heading">
          <h2>Resources</h2>
        </div>

        <div className="resources-grid">
          <div className="resource-card">
            <h3>Academic Support</h3>
            <p>Contact school staff if your student needs help with assignments, grades, or attendance.</p>
          </div>

          <div className="resource-card">
            <h3>Attendance Help</h3>
            <p>Review attendance regularly and reach out when absences need to be corrected.</p>
          </div>

          <div className="resource-card">
            <h3>Parent Communication</h3>
            <p>Use this page to review student progress before contacting the school.</p>
          </div>
        </div>

        <button className="bottom-link" onClick={goToTop}>
          ▴ Go to top
        </button>
      </section>
    );
  }

  const resultText = student.final_result ?? "N/A";
  const isPassing = String(resultText).toLowerCase().includes("pass");
  const attendanceRate = Number(student.attendance_rate) || 0;
  const absentRate = Math.max(0, 100 - attendanceRate);

  const attendanceData = [
    { label: "Present", value: attendanceRate },
    { label: "Absent", value: absentRate }
  ];

  const gradeData = [
    { label: "Math", value: Number(student.math_score) || 0 },
    { label: "Reading", value: Number(student.reading_score) || 0 },
    { label: "Writing", value: Number(student.writing_score) || 0 }
  ];

  return (
    <section className="panel">
      <div className="panel-heading parent-heading">
        <h2>Student Overview</h2>

        <div className={isPassing ? "result-badge passing" : "result-badge failing"}>
          {resultText}
        </div>
      </div>

      <div className="parent-student-header">
        <div>
          <h3>{student.student_name ?? `Student ${student.student_id}`}</h3>
          <p>Student ID: {student.student_id ?? "N/A"}</p>
        </div>
      </div>

      <div className="parent-info-grid">
        <InfoCard label="Grade Level" value={student.grade_level} />
        <InfoCard label="Gender" value={student.gender} />
        <InfoCard label="Age" value={student.age} />
        <InfoCard label="Attendance Rate" value={formatPercent(student.attendance_rate)} />
        <InfoCard label="Math Score" value={student.math_score} />
        <InfoCard label="Reading Score" value={student.reading_score} />
        <InfoCard label="Writing Score" value={student.writing_score} />
        <InfoCard label="Study Hours" value={student.study_time_weekly} />
        <InfoCard label="Internet Access" value={student.internet_access} />
        <InfoCard label="Lunch Type" value={student.lunch_type} />
        <InfoCard label="Parent Education" value={student.parental_education} />
        <InfoCard label="Activities" value={student.extracurricular} />
      </div>

      <div className="parent-chart-grid">
        <div className="parent-chart-card">
          <h3>Student Grades</h3>
          <BarGraph data={gradeData} />
        </div>

        <div className="parent-chart-card">
          <PieChart title="Attendance" data={attendanceData} />
        </div>
      </div>

      <button className="bottom-link" onClick={goToTop}>
        ▴ Go to top
      </button>
    </section>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="info-card">
      <span>{label}</span>
      <strong>{value === undefined || value === null || value === "" ? "N/A" : value}</strong>
    </div>
  );
}

function BarGraph({ data }) {
  return (
    <div className="bar-graph">
      {data.map((item) => (
        <div className="bar-row" key={item.label}>
          <span className="bar-label">{item.label}</span>

          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${Math.min(item.value, 100)}%` }}
            ></div>
          </div>

          <span className="bar-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function PieChart({ title, data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let runningPercent = 0;

  const gradientParts = data.map((item, index) => {
    const percent = total === 0 ? 0 : (item.value / total) * 100;
    const start = runningPercent;
    const end = runningPercent + percent;
    runningPercent = end;

    return `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
  });

  const pieBackground =
    gradientParts.length > 0
      ? `conic-gradient(${gradientParts.join(", ")})`
      : "#dddddd";

  return (
    <div className="pie-section">
      <div className="pie-chart" style={{ background: pieBackground }}></div>

      <div className="pie-info">
        <h3>{title}</h3>

        <div className="pie-legend">
          {data.map((item, index) => {
            const percent =
              total === 0 ? 0 : ((item.value / total) * 100).toFixed(1);

            return (
              <div className="legend-item" key={item.label}>
                <span
                  className="legend-color"
                  style={{
                    backgroundColor: chartColors[index % chartColors.length]
                  }}
                ></span>

                <span>
                  {item.label}: <strong>{Number(item.value).toFixed(1)}</strong> ({percent}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function buildPieChartData(data, key) {
  const counts = {};

  data.forEach((student) => {
    const label = getChartLabel(student, key);
    counts[label] = (counts[label] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function getChartLabel(student, key) {
  const value = student[key];

  if (key === "math_score" || key === "reading_score" || key === "writing_score") {
    return getScoreRange(value);
  }

  if (key === "attendance_rate") {
    return getAttendanceRange(value);
  }

  if (key === "study_time_weekly") {
    return getStudyHourRange(value);
  }

  if (key === "student_id") {
    return getStudentIdRange(value);
  }

  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  return String(value);
}

function getScoreRange(value) {
  const number = Number(value);

  if (Number.isNaN(number)) return "N/A";
  if (number >= 90) return "90-100";
  if (number >= 80) return "80-89";
  if (number >= 70) return "70-79";
  if (number >= 60) return "60-69";
  return "Below 60";
}

function getAttendanceRange(value) {
  const number = Number(value);

  if (Number.isNaN(number)) return "N/A";
  if (number >= 95) return "95-100%";
  if (number >= 90) return "90-94%";
  if (number >= 85) return "85-89%";
  if (number >= 80) return "80-84%";
  return "Below 80%";
}

function getStudyHourRange(value) {
  const number = Number(value);

  if (Number.isNaN(number)) return "N/A";
  if (number >= 4) return "4+ hours";
  if (number >= 3) return "3-3.99 hours";
  if (number >= 2) return "2-2.99 hours";
  if (number >= 1) return "1-1.99 hours";
  return "Below 1 hour";
}

function getStudentIdRange(value) {
  const match = String(value).match(/\d+/);
  const number = match ? Number(match[0]) : NaN;

  if (Number.isNaN(number)) return "N/A";
  if (number <= 250) return "S1-S250";
  if (number <= 500) return "S251-S500";
  if (number <= 750) return "S501-S750";
  return "S751-S1000";
}

function formatColumnName(key) {
  const names = {
    student_id: "Student ID",
    grade_level: "Grade",
    gender: "Gender",
    attendance_rate: "Attendance",
    math_score: "Math Score",
    reading_score: "Reading Score",
    writing_score: "Writing Score",
    study_time_weekly: "Study Hours",
    final_result: "Result"
  };

  return names[key] || key;
}

function formatPercent(value) {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  return `${Number(value).toFixed(2)}%`;
}

export default App;