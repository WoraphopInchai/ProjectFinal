import jwt from 'jsonwebtoken'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import mysql from 'mysql2/promise'

const app = new Hono()

app.use('*', cors())

// =====================
// MYSQL CONNECTION
// =====================

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Root12345678",
  database: "laundry_system"
})

// =====================
// LOGIN
// =====================

app.post('/login', async (c) => {

  const body = await c.req.json()
  let { email, password } = body

  email = email.trim()
  password = password.trim()

  const [rows]: any = await pool.query(
    "SELECT id,room,email,password,role FROM users WHERE email=? LIMIT 1",
    [email]
  )

  const user = rows[0]

  if (!user) {
    return c.json({ message: 'User not found' }, 404)
  }

  if (user.password !== password) {
    return c.json({ message: 'Invalid password' }, 401)
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    "mysecretkey",
    { expiresIn: "1h" }
  )

  return c.json({
    message: "Login success",
    token,
    role: user.role,
    email: user.email,
    room_number: user.room
  })

})

// =====================
// REGISTER USER
// =====================

app.post('/register', async (c) => {

  const body = await c.req.json()
  let { room, email, password } = body

  room = room.trim()
  email = email.trim()
  password = password.trim()

  const [exist]: any = await pool.query(
    "SELECT id FROM users WHERE email=?",
    [email]
  )

  if (exist.length > 0) {
    return c.json({ message: "Email already exists" }, 400)
  }

  await pool.query(
    "INSERT INTO users (room,email,password,role) VALUES (?,?,?,?)",
    [room, email, password, "user"]
  )

  return c.json({ message: "User created" })

})

// =====================
// GET USERS
// =====================

app.get('/users', async (c) => {

  const [rows]: any = await pool.query(
    "SELECT id,room,email,role FROM users ORDER BY room ASC"
  )

  return c.json(rows)

})

// =====================
// ADD USER
// =====================

app.post('/users', async (c) => {

  const body = await c.req.json()
  let { room, email, password } = body

  room = room.trim()
  email = email.trim()
  password = password.trim()

  const [exist]: any = await pool.query(
    "SELECT id FROM users WHERE email=?",
    [email]
  )

  if (exist.length > 0) {
    return c.json({ message: "Email already exists" }, 400)
  }

  await pool.query(
    "INSERT INTO users (room,email,password,role) VALUES (?,?,?,?)",
    [room, email, password, "user"]
  )

  return c.json({ message: "User added" })

})

// =====================
// UPDATE USER
// =====================

app.put('/users/:id', async (c) => {

  const id = c.req.param("id")
  const body = await c.req.json()

  let { room, email, password } = body

  room = room.trim()
  email = email.trim()

  if (password && password.trim() !== "") {

    password = password.trim()

    await pool.query(
      "UPDATE users SET room=?, email=?, password=? WHERE id=?",
      [room, email, password, id]
    )

  } else {

    await pool.query(
      "UPDATE users SET room=?, email=? WHERE id=?",
      [room, email, id]
    )

  }

  return c.json({ message: "User updated" })

})

// =====================
// DELETE USER
// =====================

app.delete('/users/:id', async (c) => {

  const id = c.req.param("id")

  await pool.query(
    "DELETE FROM users WHERE id=?",
    [id]
  )

  return c.json({ message: "User deleted" })

})

// =====================
// GET MACHINES
// =====================

app.get('/machines', async (c) => {

  const [rows]: any = await pool.query(
    "SELECT id, machine_number, status, current_user_name, queue_count FROM machines ORDER BY machine_number ASC"
  )

  return c.json(rows)

})

// =====================
// ADD MACHINE
// =====================

app.post('/machines/add', async (c) => {

  const body = await c.req.json()
  const { machine_number } = body

  const [exist]: any = await pool.query(
    "SELECT id FROM machines WHERE machine_number=?",
    [machine_number]
  )

  if (exist.length > 0) {
    return c.json({ message: "Machine number already exists" }, 400)
  }

  await pool.query(
    "INSERT INTO machines (machine_number,status,current_user_name,queue_count) VALUES (?,?,?,?)",
    [machine_number, "available", null, 0]
  )

  return c.json({ message: "Machine added" })

})

// =====================
// DELETE MACHINE
// =====================

app.delete('/machines/:id', async (c) => {

  const id = c.req.param("id")

  await pool.query(
    "DELETE FROM machines WHERE id=?",
    [id]
  )

  return c.json({ message: "Machine deleted" })

})

// =====================
// UPDATE MACHINE (FIX BUG)
// =====================

app.put('/machines/:id', async (c) => {

  const id = c.req.param("id")
  const body = await c.req.json()

  const fields: string[] = []
  const values: any[] = []

  if (body.status !== undefined) {
    fields.push("status=?")
    values.push(body.status)
  }

  if (body.current_user_name !== undefined) {
    fields.push("current_user_name=?")
    values.push(body.current_user_name)
  }

  if (body.queue_count !== undefined) {
    fields.push("queue_count=?")
    values.push(body.queue_count)
  }

  if (fields.length === 0) {
    return c.json({ message: "Nothing to update" })
  }

  values.push(id)

  await pool.query(
    `UPDATE machines SET ${fields.join(",")} WHERE id=?`,
    values
  )

  return c.json({ message: "Machine updated" })

})

// =====================
// RESERVE MACHINE
// =====================

app.post("/reserve", async (c) => {

  const body = await c.req.json()
  const { machine_number, room_number } = body

  const [machines]: any = await pool.query(
    "SELECT * FROM machines WHERE machine_number=?",
    [machine_number]
  )

  if (machines.length === 0) {
    return c.json({ error: "Machine not found" }, 404)
  }

  const m = machines[0]

  if (m.status === "available") {

    await pool.query(
      `UPDATE machines 
       SET status='reserved',
       current_user_name=?,
       queue_count=1
       WHERE machine_number=?`,
      [room_number, machine_number]
    )

  } else {

    await pool.query(
      `UPDATE machines 
       SET queue_count = IFNULL(queue_count,0) + 1
       WHERE machine_number=?`,
      [machine_number]
    )

  }

  return c.json({ message: "reserved success" })

})

// =====================
// CANCEL RESERVATION
// =====================

app.post('/cancel', async (c) => {

  const body = await c.req.json()
  const { machine_number } = body

  await pool.query(
    `UPDATE machines 
     SET status='available',
     current_user_name=NULL,
     queue_count=0
     WHERE machine_number=?`,
    [machine_number]
  )

  return c.json({ message: "Reservation cancelled" })

})

// =====================
// REPORT MACHINE
// =====================

app.post('/report', async (c) => {

  const body = await c.req.json()
  const { machine_number } = body

  await pool.query(
    "UPDATE machines SET status='broken' WHERE machine_number=?",
    [machine_number]
  )

  return c.json({ message: "Report received" })

})

// =====================
// HOME
// =====================

app.get('/', (c) => {
  return c.text('Laundry API')
})

// =====================
// START SERVER
// =====================

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {

  console.log(`Server running http://localhost:${info.port}`)

})