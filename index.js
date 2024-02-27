const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3786;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://balu_ak8j_user:Wb9xsSsDqnUOPvcQCtD8t1ms1PPUwnwk@dpg-cmktmm2cn0vc73fs14vg-a.oregon-postgres.render.com/balu_ak8j',
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());

// Your CRUD routes go here
// GET all items
app.get('/items', async (req, res) => {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM your_table');
    res.json(result.rows);
    client.release();
  });
  
  // POST a new item
  app.post('/items', async (req, res) => {
    const { name, description } = req.body;
    const client = await pool.connect();
    const result = await client.query('INSERT INTO your_table (name, description) VALUES ($1, $2) RETURNING *', [name, description]);
    res.json(result.rows[0]);
    client.release();
  });
  
  // Update an item
  app.put('/items/:id', async (req, res) => {
    const id = req.params.id;
    const { name, description } = req.body;
    const client = await pool.connect();
    const result = await client.query('UPDATE your_table SET name = $1, description = $2 WHERE id = $3 RETURNING *', [name, description, id]);
    res.json(result.rows[0]);
    client.release();
  });
  
  // Delete an item
  app.delete('/items/:id', async (req, res) => {
    const id = req.params.id;
    const client = await pool.connect();
    const result = await client.query('DELETE FROM your_table WHERE id = $1 RETURNING *', [id]);
    res.json(result.rows[0]);
    client.release();
  });
  
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
