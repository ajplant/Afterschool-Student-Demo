const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.get("/", (req, res) => {
  res.send("Student Academic Dashboard API is running.");
});

// Sends the entire dataset to the frontend.
// The frontend will only show 50 rows at a time.
app.get("/api/students", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM student_academic_view
      ORDER BY CAST(REGEXP_REPLACE(student_id, '[^0-9]', '', 'g') AS INTEGER);
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// Summary report from the full dataset.
app.get("/api/reports/summary", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_students,
        ROUND(AVG(math_score)::numeric, 2) AS average_math_score,
        ROUND(AVG(reading_score)::numeric, 2) AS average_reading_score,
        ROUND(AVG(writing_score)::numeric, 2) AS average_writing_score,
        ROUND(AVG(attendance_rate)::numeric, 2) AS average_attendance_rate,
        ROUND(AVG(study_time_weekly)::numeric, 2) AS average_study_hours
      FROM student_academic_view;
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// Sends all students who may need support.
// No LIMIT here so the admin can access the full support dataset.
app.get("/api/reports/needs-support", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        student_id,
        gender,
        math_score,
        reading_score,
        writing_score,
        attendance_rate,
        study_time_weekly,
        final_result
      FROM student_academic_view
      WHERE attendance_rate < 75
         OR math_score < 70
         OR reading_score < 70
         OR writing_score < 70
      ORDER BY CAST(REGEXP_REPLACE(student_id, '[^0-9]', '', 'g') AS INTEGER);
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching support report:", error);
    res.status(500).json({ error: "Failed to fetch support report" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});