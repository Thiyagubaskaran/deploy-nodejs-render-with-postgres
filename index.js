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
// app.get("/dynamicschemes", async (req, res) => {
//   const { age, gender, caste, occupation, residence,application_mode,scheme_category } = req.query;

//   let query = "SELECT * FROM Schemes WHERE 1=1";
//   const params = [];
//   let i = 1;

//   if (age) {
//     query += ` AND $${i}::int BETWEEN 
//                   CAST(SPLIT_PART(age, '-', 1) AS INT) AND 
//                   CAST(SPLIT_PART(age, '-', 2) AS INT)`;
//     params.push(age);
//     i++;
//   }

//   if (gender) {
//     query += ` AND gender = $${i}`;
//     params.push(gender);
//     i++;
//   }

//   if (caste) {
//     query += ` AND caste = $${i}`;
//     params.push(caste);
//     i++;
//   }

//   if (occupation) {
//     query += ` AND occupation = $${i}`;
//     params.push(occupation);
//     i++;
//   }

//   if (residence) {
//     query += ` AND residence = $${i}`;
//     params.push(residence);
//     i++;
//   }
//   if (application_mode) {
//     query += ` AND $${i} = ANY(application_mode)`;
//     params.push(application_mode);
//     i++;
//   }

//   if (scheme_category) {
//     query += ` AND $${i} = ANY(scheme_category)`;
//     params.push(scheme_category);
//     i++;
//   }
//   try {
//     const result = await pool.query(query, params);
//     res.json(result.rows);
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

app.get("/dynamicschemes", async (req, res) => {
  // Extract filter parameters
  const { 
    age, 
    gender, 
    caste, 
    occupation, 
    residence, 
    application_mode, 
    scheme_category,
    page = 1,
    limit = 10 
  } = req.query;

  // Convert page and limit to integers
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  
  // Validate pagination parameters
  if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
    return res.status(400).json({ 
      error: "Invalid pagination parameters. Page and limit must be positive integers." 
    });
  }

  // Calculate offset
  const offset = (pageNum - 1) * limitNum;

  // Build the base query
  let countQuery = "SELECT COUNT(*) FROM Schemes WHERE 1=1";
  let dataQuery = "SELECT * FROM Schemes WHERE 1=1";
  const params = [];
  let i = 1;

  // Add filter conditions
  if (age) {
    const condition = ` AND $${i}::int BETWEEN 
      CAST(SPLIT_PART(age, '-', 1) AS INT) AND 
      CAST(SPLIT_PART(age, '-', 2) AS INT)`;
    countQuery += condition;
    dataQuery += condition;
    params.push(age);
    i++;
  }

  if (gender) {
    const condition = ` AND gender = $${i}`;
    countQuery += condition;
    dataQuery += condition;
    params.push(gender);
    i++;
  }

  if (caste) {
    const condition = ` AND caste = $${i}`;
    countQuery += condition;
    dataQuery += condition;
    params.push(caste);
    i++;
  }

  if (occupation) {
    const condition = ` AND occupation = $${i}`;
    countQuery += condition;
    dataQuery += condition;
    params.push(occupation);
    i++;
  }

  if (residence) {
    const condition = ` AND residence = $${i}`;
    countQuery += condition;
    dataQuery += condition;
    params.push(residence);
    i++;
  }
  
  if (application_mode) {
    const condition = ` AND $${i} = ANY(application_mode)`;
    countQuery += condition;
    dataQuery += condition;
    params.push(application_mode);
    i++;
  }

  if (scheme_category) {
    const condition = ` AND $${i} = ANY(scheme_category)`;
    countQuery += condition;
    dataQuery += condition;
    params.push(scheme_category);
    i++;
  }

  // Add pagination to data query only
  dataQuery += ` ORDER BY scheme_id LIMIT $${i} OFFSET $${i+1}`;
  const dataParams = [...params, limitNum, offset];

  try {
    // Execute count query first to get total items
    const countResult = await pool.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limitNum);

    // Execute data query with pagination
    const dataResult = await pool.query(dataQuery, dataParams);
    
    // Return paginated response
    res.json({
      currentPage: pageNum,
      totalPages: totalPages,
      totalItems: totalItems,
      itemsPerPage: limitNum,
      schemes: dataResult.rows
    });
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
