const API = "https://projectfinal-production-49ed.up.railway.app"

const token = localStorage.getItem("token")
const role = localStorage.getItem("role")

if(!token){
window.location.href = "../login/login.html"
}

if(role !== "admin"){
window.location.href = "../main/main.html"
}

let machineIdToDelete = null
let machinesData = []
let currentFilter = "all"

let reportsData = []

// POPUPS
let deleteModal
let logoutPopup

document.addEventListener("DOMContentLoaded", () => {

loadMachines()
loadUsers()
loadReports()

setInterval(loadMachines,3000)
setInterval(loadReports,5000)

const addBtn = document.getElementById("addMachineBtn")
const addModal = document.getElementById("addModal")
const addConfirm = document.getElementById("addConfirm")
const addCancel = document.getElementById("addCancel")
const machineInput = document.getElementById("machineNumber")

deleteModal = document.getElementById("deleteModal")
const deleteConfirm = document.getElementById("deleteConfirm")
const deleteCancel = document.getElementById("deleteCancel")

logoutPopup = document.getElementById("logoutPopup")

setupLogout()

// ========================
// TABS FILTER
// ========================

const tabs = document.querySelectorAll(".tab")

tabs.forEach(tab => {

tab.addEventListener("click", () => {

tabs.forEach(t => t.classList.remove("active"))
tab.classList.add("active")

currentFilter = tab.dataset.filter

renderMachines()

})

})

// ========================
// ADD MACHINE
// ========================

addBtn?.addEventListener("click", () => {

addModal.style.display = "flex"
machineInput.value = ""

})

addCancel?.addEventListener("click", () => {

addModal.style.display = "none"

})

addConfirm?.addEventListener("click", async () => {

const value = machineInput.value.trim()
const machineNumber = parseInt(value)

if(value === "" || Number.isNaN(machineNumber)){
alert("กรุณาใส่เลขเครื่อง")
return
}

try{

const res = await fetch(API + "/machines/add",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
machine_number: machineNumber
})
})

if(!res.ok){
alert("เพิ่มเครื่องไม่สำเร็จ")
return
}

addModal.style.display = "none"
loadMachines()

}catch(err){

console.log("เพิ่มเครื่องไม่สำเร็จ",err)

}

})

// ========================
// DELETE MACHINE
// ========================

deleteCancel?.addEventListener("click",()=>{

deleteModal.style.display="none"
machineIdToDelete = null

})

deleteConfirm?.addEventListener("click", async ()=>{

if(machineIdToDelete === null) return

try{

const res = await fetch(`${API}/machines/${machineIdToDelete}`,{
method:"DELETE"
})

if(!res.ok){
alert("ลบเครื่องไม่สำเร็จ")
return
}

deleteModal.style.display="none"
loadMachines()

}catch(err){

console.log("ลบเครื่องไม่สำเร็จ",err)

}

})

})

// ========================
// LOAD MACHINES
// ========================

async function loadMachines(){

try{

const res = await fetch(API + "/machines")

machinesData = await res.json()

renderMachines()

}catch(err){

console.log("โหลดเครื่องไม่สำเร็จ", err)

}

}

// ========================
// RENDER MACHINES
// ========================

function renderMachines(){

const list = document.getElementById("machineList")

if(!list) return

list.innerHTML = ""

let filtered = machinesData

if(currentFilter === "free"){
filtered = machinesData.filter(m => m.status === "available")
}

if(currentFilter === "using"){
filtered = machinesData.filter(m =>
m.status === "reserved" || m.status === "in_use"
)
}

if(currentFilter === "broken"){
filtered = machinesData.filter(m => m.status === "broken")
}

filtered.forEach(machine => {

const div = document.createElement("div")
div.className = "machine"

let statusText = "ไม่ทราบ"
let statusClass = ""

if(machine.status === "available"){
statusText = "ว่าง"
statusClass = "free"
}

if(machine.status === "reserved"){
statusText = "จองแล้ว"
statusClass = "using"
}

if(machine.status === "in_use"){
statusText = "กำลังใช้งาน"
statusClass = "using"
}

if(machine.status === "broken"){
statusText = "เสีย"
statusClass = "broken"
}

let room = "-"

if(machine.current_user_name){
room = machine.current_user_name
}

div.innerHTML = `

<h4>Machine ${machine.machine_number}</h4>

<p>สถานะ : <span class="status ${statusClass}">
${statusText}
</span></p>

<p>ห้องที่กำลังใช้ : ${room}</p>

<p>จำนวนคิว : ${machine.queue_count || 0}</p>

<div class="actions-buttons">

<button class="report">แจ้งเสีย</button>
<button class="reset">รีเซ็ต</button>
<button class="delete">ลบ</button>

</div>

`

div.querySelector(".report").addEventListener("click", async ()=>{

await fetch(`${API}/machines/${machine.id}`,{
method:"PUT",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({ status:"broken" })
})

loadMachines()

})

div.querySelector(".reset").addEventListener("click", async ()=>{

if(!confirm("ต้องการรีเซ็ตเครื่องนี้หรือไม่")) return

try{

const res = await fetch(API + "/admin/reset",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
machine_number: machine.machine_number
})
})

if(!res.ok){
alert("รีเซ็ตเครื่องไม่สำเร็จ")
return
}

await loadMachines()

}catch(err){

console.log("รีเซ็ตเครื่องไม่สำเร็จ",err)

}

})

div.querySelector(".delete").addEventListener("click",()=>{

machineIdToDelete = machine.id
deleteModal.style.display="flex"

})

list.appendChild(div)

})

}

// ========================
// REPORT SYSTEM
// ========================

async function loadReports(){

try{

const res = await fetch(API + "/reports")
reportsData = await res.json()

renderReports()

}catch(err){

console.log("โหลด report ไม่สำเร็จ",err)

}

}

function renderReports(){

const list = document.getElementById("reportList")
if(!list) return

list.innerHTML = ""

reportsData.forEach(r => {

const div = document.createElement("div")
div.className = "report-card"

const time = new Date(r.created_at).toLocaleString()

div.innerHTML = `

<div class="report-header">
<b>Machine #${r.machine_number}</b>
<span class="report-room">${r.report_by}</span>
</div>

<div class="report-message">
${r.problem}
</div>

<div class="report-time">
${time}
</div>

<div class="report-actions">
<button class="delete-btn">Delete</button>
</div>

`

div.querySelector(".delete-btn").onclick = async ()=>{

if(!confirm("ต้องการลบ report นี้หรือไม่")) return

await fetch(`${API}/reports/${r.id}`,{
method:"DELETE"
})

loadReports()

}

list.appendChild(div)

})

}

// ========================
// USER SYSTEM
// ========================

async function loadUsers(){

try{

const res = await fetch(API + "/users")
const users = await res.json()

const table = document.getElementById("userTable")

if(!table) return

table.innerHTML = ""

users.forEach(user => {

const tr = document.createElement("tr")

tr.innerHTML = `
<td>${user.room}</td>
<td>${user.email}</td>
<td>${user.role}</td>

<td>
<button onclick="editUser(${user.id},'${user.room}','${user.email}')">Edit</button>
<button onclick="deleteUser(${user.id})">Delete</button>
</td>
`

table.appendChild(tr)

})

}catch(err){

console.log("โหลด user ไม่สำเร็จ",err)

}

}

// ========================
// USER CRUD
// ========================

async function addUser(){

const room = document.getElementById("room").value
const email = document.getElementById("email").value
const password = document.getElementById("password").value

if(!room || !email || !password){
alert("กรอกข้อมูลให้ครบ")
return
}

// 🔧 แก้ตรงนี้
await fetch(API + "/register",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({ room,email,password })
})

loadUsers()

}

async function deleteUser(id){

if(!confirm("ต้องการลบ user หรือไม่")) return

await fetch(`${API}/users/${id}`,{
method:"DELETE"
})

loadUsers()

}

async function editUser(id,room,email){

const newRoom = prompt("Room",room)
const newEmail = prompt("Email",email)
const newPassword = prompt("Password (เว้นว่างถ้าไม่ต้องการเปลี่ยน)")

if(!newRoom || !newEmail) return

const bodyData = {
room:newRoom,
email:newEmail,
role:"user"
}

if(newPassword && newPassword.trim() !== ""){
bodyData.password = newPassword
}

await fetch(`${API}/users/${id}`,{
method:"PUT",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify(bodyData)
})

loadUsers()

}

// ========================
// LOGOUT
// ========================

function setupLogout(){

const logoutBtn = document.getElementById("logoutBtn")
const confirmBtn = document.getElementById("confirmLogout")
const cancelBtn = document.getElementById("cancelLogout")

logoutBtn?.addEventListener("click", () => {
logoutPopup.style.display = "flex"
})

cancelBtn?.addEventListener("click", () => {
logoutPopup.style.display = "none"
})

confirmBtn?.addEventListener("click", () => {
window.location.href = "../login/login.html"
})

}

// ========================
// PAGE SWITCH
// ========================

const machinePage = document.getElementById("machinePage")
const userPage = document.getElementById("userPage")
const notificationPage = document.getElementById("notificationPage")

document.getElementById("homeBtn").onclick = () =>{
machinePage.style.display="block"
userPage.style.display="none"
notificationPage.style.display="none"
}

document.getElementById("userBtn").onclick = () =>{
machinePage.style.display="none"
userPage.style.display="block"
notificationPage.style.display="none"
loadUsers()
}

document.getElementById("notiBtn").onclick = () =>{
machinePage.style.display="none"
userPage.style.display="none"
notificationPage.style.display="block"
loadReports()
}

const navItems = document.querySelectorAll(".nav-item")

navItems.forEach(item => {

item.addEventListener("click", () => {

navItems.forEach(nav => nav.classList.remove("active"))
item.classList.add("active")

})

})