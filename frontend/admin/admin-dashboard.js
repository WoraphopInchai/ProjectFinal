let machineIdToDelete = null
let machinesData = []
let currentFilter = "all"

// POPUPS
let deleteModal
let logoutPopup

document.addEventListener("DOMContentLoaded", () => {

loadMachines()
loadUsers()

// รีโหลดข้อมูลทุก 3 วินาที
setInterval(loadMachines, 3000)

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

document.getElementById("machineList").scrollIntoView({
behavior:"smooth"
})

})

})

// ========================
// ADD MACHINE
// ========================

addBtn.addEventListener("click", () => {

addModal.style.display = "flex"
machineInput.value = ""

})

addCancel.addEventListener("click", () => {

addModal.style.display = "none"

})

addConfirm.addEventListener("click", async () => {

const value = machineInput.value.trim()
const machineNumber = parseInt(value)

if(value === "" || Number.isNaN(machineNumber)){
alert("กรุณาใส่เลขเครื่อง")
return
}

try{

const res = await fetch("http://localhost:3000/machines/add",{
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

deleteCancel.addEventListener("click",()=>{

deleteModal.style.display="none"
machineIdToDelete = null

})

deleteConfirm.addEventListener("click", async ()=>{

if(machineIdToDelete === null) return

try{

const res = await fetch(`http://localhost:3000/machines/${machineIdToDelete}`,{
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

const res = await fetch("http://localhost:3000/machines")

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

div.innerHTML = `

<h4>Machine ${machine.machine_number}</h4>

<p>สถานะ : <span class="status ${statusClass}">
${statusText}
</span></p>

<p>ห้องที่กำลังใช้ : ${
machine.current_user_name
? machine.current_user_name
: machine.room_number
? machine.room_number
: "-"
}</p>

<div class="actions-buttons">

<button class="report">แจ้งเสีย</button>
<button class="reset">รีเซ็ต</button>
<button class="delete">ลบ</button>

</div>

`

// แจ้งเสีย
div.querySelector(".report").addEventListener("click", async ()=>{

await fetch(`http://localhost:3000/machines/${machine.id}`,{
method:"PUT",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({ status:"broken" })
})

loadMachines()

})

// รีเซ็ต
div.querySelector(".reset").addEventListener("click", async ()=>{

await fetch(`http://localhost:3000/machines/${machine.id}`,{
method:"PUT",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({ status:"available" })
})

loadMachines()

})

// ลบ
div.querySelector(".delete").addEventListener("click",()=>{

machineIdToDelete = machine.id
deleteModal.style.display="flex"

})

list.appendChild(div)

})

}

// ========================
// USER SYSTEM
// ========================

async function loadUsers(){

try{

const res = await fetch("http://localhost:3000/users")
const users = await res.json()

const table = document.getElementById("userTable")

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

async function addUser(){

const room = document.getElementById("room").value
const email = document.getElementById("email").value
const password = document.getElementById("password").value

if(!room || !email || !password){
alert("กรอกข้อมูลให้ครบ")
return
}

await fetch("http://localhost:3000/users",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({ room,email,password })
})

loadUsers()

}

async function deleteUser(id){

if(!confirm("ต้องการลบ user หรือไม่")) return

await fetch(`http://localhost:3000/users/${id}`,{
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
email:newEmail
}

if(newPassword && newPassword.trim() !== ""){
bodyData.password = newPassword
}

await fetch(`http://localhost:3000/users/${id}`,{
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

logoutBtn.addEventListener("click", () => {
logoutPopup.style.display = "flex"
})

cancelBtn.addEventListener("click", () => {
logoutPopup.style.display = "none"
})

confirmBtn.addEventListener("click", () => {
window.location.href = "../login/login.html"
})

}

// ========================
// PAGE SWITCH
// ========================

const machinePage = document.getElementById("machinePage")
const userPage = document.getElementById("userPage")

document.getElementById("homeBtn").onclick = () =>{
machinePage.style.display="block"
userPage.style.display="none"
}

document.getElementById("userBtn").onclick = () =>{
machinePage.style.display="none"
userPage.style.display="block"
loadUsers()
}

const navItems = document.querySelectorAll(".nav-item")

navItems.forEach(item => {

item.addEventListener("click", () => {

navItems.forEach(nav => nav.classList.remove("active"))
item.classList.add("active")

})

})