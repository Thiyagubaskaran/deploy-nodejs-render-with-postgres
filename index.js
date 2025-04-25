const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Render-hosted PostgreSQL
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// API Route: Fetch All Schemes
app.get("/schemes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Schemes");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching schemes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// app.get("/dynamicschemes", async (req, res) => {
//   const { benefits, age, income, state } = req.query;
//   let query = "SELECT * FROM Schemes WHERE 1=1";
//   let params = [];

//   if (benefits) {
//     query += " AND LOWER(benefits) = $1";
//     params.push(benefits.toLowerCase());
//   }
//   // Add other filters similarly...

//   try {
//     const result = await pool.query(query, params);
//     res.json(result.rows);
//   } catch (error) {
//     console.error("Error fetching schemes:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });
app.get("/dynamicschemes", async (req, res) => {
  const { age, gender, caste, occupation, residence,application_mode,scheme_category } = req.query;

  let query = "SELECT * FROM Schemes WHERE 1=1";
  const params = [];
  let i = 1;

  if (age) {
    query += ` AND $${i}::int BETWEEN 
                  CAST(SPLIT_PART(age, '-', 1) AS INT) AND 
                  CAST(SPLIT_PART(age, '-', 2) AS INT)`;
    params.push(age);
    i++;
  }

  if (gender) {
    query += ` AND gender = $${i}`;
    params.push(gender);
    i++;
  }

  if (caste) {
    query += ` AND caste = $${i}`;
    params.push(caste);
    i++;
  }

  if (occupation) {
    query += ` AND occupation = $${i}`;
    params.push(occupation);
    i++;
  }

  if (residence) {
    query += ` AND residence = $${i}`;
    params.push(residence);
    i++;
  }
  if (application_mode) {
    query += ` AND $${i} = ANY(application_mode)`;
    params.push(application_mode);
    i++;
  }

  if (scheme_category) {
    query += ` AND $${i} = ANY(scheme_category)`;
    params.push(scheme_category);
    i++;
  }
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// Signup API (by Username)
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if username already exists
    const userCheck = await pool.query(
      "SELECT * FROM Users WHERE username = $1",
      [username]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Insert into DB
    await pool.query(
      "INSERT INTO Users (username, email, password) VALUES ($1, $2, $3)",
      [username, email || null, password]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Signin API (using Username)
app.post("/signin", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM Users WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const user = result.rows[0];
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
