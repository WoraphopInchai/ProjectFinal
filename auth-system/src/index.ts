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
// REGISTER
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
// GET MACHINES
// =====================

app.get('/machines', async (c) => {

const [rows]: any = await pool.query(`
SELECT 
m.id,
m.machine_number,
m.status,
m.current_user_name,
m.start_time,
m.end_time,
COUNT(q.id) as queue_count
FROM machines m
LEFT JOIN machine_queue q
ON m.machine_number = q.machine_number
GROUP BY 
m.id,
m.machine_number,
m.status,
m.current_user_name,
m.start_time,
m.end_time
ORDER BY m.machine_number ASC
`)

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
"INSERT INTO machines (machine_number,status,current_user_name) VALUES (?,?,?)",
[machine_number, "available", null]
)

return c.json({ message: "Machine added" })

})

// =====================
// UPDATE MACHINE
// =====================

app.put('/machines/:id', async (c) => {

const id = c.req.param("id")
const body = await c.req.json()
const { status } = body

const [rows]: any = await pool.query(
"SELECT machine_number FROM machines WHERE id=?",
[id]
)

if(rows.length === 0){
return c.json({message:"Machine not found"},404)
}

const machineNumber = rows[0].machine_number

if(status === "available"){

await pool.query(
`DELETE FROM machine_queue WHERE machine_number=?`,
[machineNumber]
)

await pool.query(
`UPDATE machines
SET status='available',
current_user_name=NULL,
start_time=NULL,
end_time=NULL
WHERE id=?`,
[id]
)

return c.json({message:"Machine fully reset"})
}

if(status === "broken"){

await pool.query(
`UPDATE machines
SET status='broken'
WHERE id=?`,
[id]
)

return c.json({message:"Machine reported broken"})
}

return c.json({message:"Updated"})

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
// ADMIN RESET MACHINE
// =====================

app.post('/admin/reset', async (c) => {

const body = await c.req.json()
const { machine_number } = body

if(!machine_number){
return c.json({message:"machine_number required"},400)
}

// ลบคิวทั้งหมด
await pool.query(
`DELETE FROM machine_queue WHERE machine_number=?`,
[machine_number]
)

// รีเซ็ตเครื่อง
await pool.query(
`UPDATE machines
SET status='available',
current_user_name=NULL,
start_time=NULL,
end_time=NULL
WHERE machine_number=?`,
[machine_number]
)

return c.json({message:"Machine reset success"})

})

// =====================
// RESERVE MACHINE
// =====================

app.post("/reserve", async (c) => {

const body = await c.req.json()
const { machine_number, room_number } = body

const [exist]: any = await pool.query(
`SELECT id FROM machine_queue WHERE room_number=? LIMIT 1`,
[room_number]
)

if(exist.length > 0){
return c.json({message:"You already have a queue"},400)
}

const [rows]: any = await pool.query(
"SELECT MAX(position) as maxPos FROM machine_queue WHERE machine_number=?",
[machine_number]
)

const nextPos = (rows[0].maxPos || 0) + 1

await pool.query(
`INSERT INTO machine_queue (machine_number,room_number,position)
VALUES (?,?,?)`,
[machine_number,room_number,nextPos]
)

const queue_position = nextPos

const [machines]: any = await pool.query(
"SELECT * FROM machines WHERE machine_number=? LIMIT 1",
[machine_number]
)

if(machines.length && machines[0].status === "available"){

await pool.query(
`UPDATE machines
SET status='reserved',
current_user_name=?
WHERE machine_number=?`,
[room_number,machine_number]
)

}

return c.json({
message:"Reserve success",
queue_position
})

})

// =====================
// CONFIRM MACHINE (QR)
// =====================

app.post('/confirm-machine', async (c) => {

const body = await c.req.json()
const { machine_number, room_number } = body

const [rows]: any = await pool.query(
`SELECT current_user_name FROM machines WHERE machine_number=?`,
[machine_number]
)

if(rows.length === 0){
return c.json({message:"Machine not found"},404)
}

if(String(rows[0].current_user_name) !== String(room_number)){
return c.json({message:"Not your reservation"},403)
}

const startTime = new Date()
const endTime = new Date(startTime.getTime() + 30 * 1000)

await pool.query(
`UPDATE machines
SET status='in_use',
start_time=?,
end_time=?
WHERE machine_number=?`,
[startTime,endTime,machine_number]
)

return c.json({message:"Machine confirmed. Washing started"})

})

// =====================
// CANCEL RESERVATION
// =====================

app.post('/cancel', async (c) => {

const body = await c.req.json()
const { machine_number, room_number } = body

const [machineRows]: any = await pool.query(
`SELECT current_user_name FROM machines WHERE machine_number=?`,
[machine_number]
)

if(machineRows.length === 0){
return c.json({message:"Machine not found"},404)
}

const currentUser = machineRows[0].current_user_name

await pool.query(
`DELETE FROM machine_queue
WHERE machine_number=? AND room_number=?`,
[machine_number,room_number]
)

await pool.query(`SET @pos := 0`)

await pool.query(
`UPDATE machine_queue
SET position = (@pos := @pos + 1)
WHERE machine_number=?
ORDER BY position ASC`,
[machine_number]
)

if(String(currentUser) === String(room_number)){

const [next]: any = await pool.query(
`SELECT room_number FROM machine_queue
WHERE machine_number=?
ORDER BY position ASC
LIMIT 1`,
[machine_number]
)

if(next.length > 0){

await pool.query(
`UPDATE machines
SET status='reserved',
current_user_name=?,
start_time=NULL,
end_time=NULL
WHERE machine_number=?`,
[next[0].room_number,machine_number]
)

}else{

await pool.query(
`UPDATE machines
SET status='available',
current_user_name=NULL,
start_time=NULL,
end_time=NULL
WHERE machine_number=?`,
[machine_number]
)

}

}

return c.json({ message: "Reservation cancelled" })

})

// =====================
// VIEW QUEUE
// =====================

app.get("/queue/:machine_number", async (c)=>{

const machine = c.req.param("machine_number")

const [rows]:any = await pool.query(
`SELECT room_number,position
FROM machine_queue
WHERE machine_number=?
ORDER BY position ASC`,
[machine]
)

return c.json(rows)

})

// =====================
// AUTO FINISH MACHINE
// =====================

async function autoFinishMachines(){

const [machines]: any = await pool.query(
`SELECT machine_number,end_time
FROM machines
WHERE status='in_use'`
)

const now = new Date()

for(const machine of machines){

if(!machine.end_time) continue

const end = new Date(machine.end_time)

if(now >= end){

await pool.query(
`DELETE FROM machine_queue
WHERE machine_number=?
ORDER BY position ASC
LIMIT 1`,
[machine.machine_number]
)

await pool.query(`SET @pos := 0`)

await pool.query(
`UPDATE machine_queue
SET position = (@pos := @pos + 1)
WHERE machine_number=?
ORDER BY position ASC`,
[machine.machine_number]
)

const [next]: any = await pool.query(
`SELECT room_number
FROM machine_queue
WHERE machine_number=?
ORDER BY position ASC
LIMIT 1`,
[machine.machine_number]
)

if(next.length > 0){

await pool.query(
`UPDATE machines
SET status='available',
current_user_name=?,
start_time=NULL,
end_time=NULL
WHERE machine_number=?`,
[next[0].room_number,machine.machine_number]
)

}else{

await pool.query(
`UPDATE machines
SET status='available',
current_user_name=NULL,
start_time=NULL,
end_time=NULL
WHERE machine_number=?`,
[machine.machine_number]
)

}

}

}

}

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

setInterval(autoFinishMachines,5000)

})