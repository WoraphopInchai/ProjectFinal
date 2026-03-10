document.addEventListener("DOMContentLoaded", () => {

loadUserInfo()

loadMachines()

setupLogout()

setupReservePopup()
setupReportPopup()
setupCancelPopup()

setInterval(loadMachines,3000)

})

function loadUserInfo(){

const room = localStorage.getItem("room_number")
const email = localStorage.getItem("email")

const username = document.getElementById("username")
const useremail = document.getElementById("useremail")

if(username && room){
username.innerText = "Room " + room
}

if(useremail && email){
useremail.innerText = email
}

}

let selectedMachine = null
let cancelMachineNumber = null
let reservedMachine = null
let reportMachineNumber = null
let isLoading = false

// ดึงเลขห้องจาก login
const currentUser = localStorage.getItem("room_number")

async function loadMachines(){

if(isLoading) return
isLoading = true

const container = document.getElementById("machineContainer")
container.innerHTML = ""

try{

const res = await fetch("http://localhost:3000/machines")
const machines = await res.json()

const myReserved = machines.find(
m => m.current_user_name == currentUser && m.status === "reserved"
)

reservedMachine = myReserved ? myReserved.machine_number : null

machines.forEach(machine => {

let statusClass = machine.status
let statusText = "Unknown"

if(machine.status === "available") statusText = "Available"
else if(machine.status === "reserved") statusText = "Reserved"
else if(machine.status === "in_use") statusText = "In Use"
else if(machine.status === "broken") statusText = "Broken"

const card = document.createElement("div")
card.className = "machine-card"

if(
(reservedMachine && reservedMachine !== machine.machine_number) ||
machine.status === "broken"
){
card.classList.add("locked-machine")
}

card.innerHTML = `

<img class="machine-img" src="../images/Logo.png"/>

<h3>Machine ${machine.machine_number}</h3>

<p>Status :
<span class="status ${statusClass}">
${statusText}
</span>
</p>

<div class="machine-buttons">

<button 
class="reserve-btn"
onclick="openReservePopup(${machine.machine_number})"
${machine.status !== "available" || reservedMachine ? "disabled" : ""}
>
Reserve
</button>

<button 
class="cancel-btn"
onclick="openCancelPopup(${machine.machine_number})"
${machine.current_user_name != currentUser ? "disabled" : ""}
>
Cancel
</button>

<button 
class="report-btn"
onclick="openReportPopup(${machine.machine_number})"
${machine.status === "broken" ? "disabled" : ""}
>
Report
</button>

</div>

`

container.appendChild(card)

})

}catch(err){

console.log("Load machine error:",err)

}

isLoading = false

}

function openReservePopup(machineNumber){

if(reservedMachine) return

selectedMachine = machineNumber

const popup = document.getElementById("reservePopup")
popup.style.display = "flex"

}

function setupReservePopup(){

const confirmBtn = document.getElementById("confirmReserve")
const cancelBtn = document.getElementById("cancelReserve")
const popup = document.getElementById("reservePopup")

cancelBtn.onclick = () => popup.style.display = "none"

confirmBtn.onclick = () => {

popup.style.display = "none"

reserveMachine(selectedMachine)

}

}

async function reserveMachine(machineNumber){

if(reservedMachine) return

await fetch("http://localhost:3000/reserve",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
machine_number:machineNumber,
user:currentUser,
room_number:currentUser
})

})

loadMachines()

}

function openCancelPopup(machineNumber){

if(machineNumber !== reservedMachine) return

cancelMachineNumber = machineNumber

const popup = document.getElementById("cancelPopup")

if(popup){
popup.style.display = "flex"
}

}

function setupCancelPopup(){

const popup = document.getElementById("cancelPopup")

if(!popup) return

const confirmBtn = document.getElementById("confirmCancel")
const cancelBtn = document.getElementById("cancelCancel")

cancelBtn.onclick = () => {
popup.style.display = "none"
}

confirmBtn.onclick = () => {

popup.style.display = "none"

cancelReservation(cancelMachineNumber)

}

}

async function cancelReservation(machineNumber){

await fetch("http://localhost:3000/cancel",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
machine_number:machineNumber
})

})

reservedMachine = null

loadMachines()

}

function openReportPopup(machineNumber){

reportMachineNumber = machineNumber

const popup = document.getElementById("reportPopup")
popup.style.display = "flex"

}

function setupReportPopup(){

const sendBtn = document.getElementById("sendReport")
const cancelBtn = document.getElementById("cancelReport")
const popup = document.getElementById("reportPopup")

cancelBtn.onclick = () => popup.style.display = "none"

sendBtn.onclick = async () => {

const selected = document.querySelector('input[name="problem"]:checked')

if(!selected){
alert("Please select a problem")
return
}

await fetch("http://localhost:3000/report",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
machine_number:reportMachineNumber,
message:selected.value
})

})

alert("Report sent to admin")

popup.style.display = "none"

}

}

function setupLogout(){

const logoutBtn = document.getElementById("logoutBtn")
const popup = document.getElementById("logoutPopup")
const confirmBtn = document.getElementById("confirmLogout")
const cancelBtn = document.getElementById("cancelLogout")

logoutBtn.onclick = () => popup.style.display = "flex"

cancelBtn.onclick = () => popup.style.display = "none"

confirmBtn.onclick = () => {

localStorage.removeItem("token")
localStorage.removeItem("role")
localStorage.removeItem("room_number")
localStorage.removeItem("email")

window.location.href = "../login/login.html"

}

}