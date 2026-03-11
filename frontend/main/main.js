document.addEventListener("DOMContentLoaded", () => {

loadUserInfo()
loadMachines()

setupLogout()
setupReservePopup()
setupReportPopup()
setupCancelPopup()
setupCountdownPopup()
setupQueuePopup()

setInterval(loadMachines,10000)
setInterval(updateLiveTimers,1000)

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

let myQueuePosition = null

const currentUser = localStorage.getItem("room_number")

let machineEndTimes = {}

let countdownInterval = null
let countdownSeconds = 30
let countdownMachine = null

let qrScanner = null

let queueMachine = null
let queuePopupShown = false
let queueTimeout = null
let queueConfirmedMachine = null

async function stopCamera(){
if(qrScanner){
try{
await qrScanner.stop()
}catch(e){}
qrScanner = null
}
}

function showQueueNotification(machineNumber){

if(queuePopupShown) return

queuePopupShown = true
queueMachine = machineNumber

const popup = document.getElementById("queuePopup")
const machineText = document.getElementById("queueMachine")

if(!popup || !machineText) return

machineText.innerText = machineNumber

popup.style.display = "flex"

playNotificationSound()

queueTimeout = setTimeout(async () => {

popup.style.display = "none"
queuePopupShown = false

alert("You missed your turn")

await fetch("http://localhost:3000/cancel",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
machine_number:machineNumber,
room_number:currentUser
})
})

loadMachines()

},120000)

}

function playNotificationSound(){

const sound = document.getElementById("notifySound")

if(sound){
sound.play().catch(()=>{})
}

}

function setupQueuePopup(){

const confirmBtn = document.getElementById("confirmQueueBtn")
const cancelBtn = document.getElementById("cancelQueueBtn")
const popup = document.getElementById("queuePopup")

if(confirmBtn){

confirmBtn.onclick = () => {

clearTimeout(queueTimeout)

popup.style.display = "none"

queuePopupShown = false

queueConfirmedMachine = queueMachine

startCountdown(queueMachine)

}

}

if(cancelBtn){

cancelBtn.onclick = () => {

clearTimeout(queueTimeout)

popup.style.display = "none"

queuePopupShown = false

}

}

}

function setupCountdownPopup(){

const cancelBtn = document.getElementById("cancelCountdownBtn")
const scanBtn = document.getElementById("scanQRBtn")

if(cancelBtn){

cancelBtn.onclick = async () => {

clearInterval(countdownInterval)
countdownInterval = null

await stopCamera()

document.getElementById("countdownPopup").style.display = "none"

if(countdownMachine){

await fetch("http://localhost:3000/cancel",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
machine_number:countdownMachine,
room_number:currentUser
})
})

reservedMachine = null
loadMachines()
queueConfirmedMachine = null

}

}

}

if(scanBtn){

scanBtn.onclick = async () => {

if(qrScanner) return

qrScanner = new Html5Qrcode("qr-reader")

qrScanner.start(
{ facingMode: "environment" },
{ fps:10, qrbox:250 },
async (decodedText) => {

if(decodedText !== "machine_" + countdownMachine){
alert("Wrong machine")
return
}

await fetch("http://localhost:3000/confirm-machine",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
machine_number: countdownMachine,
room_number: currentUser
})
})

await stopCamera()

clearInterval(countdownInterval)
countdownInterval = null

document.getElementById("countdownPopup").style.display = "none"

alert("Machine confirmed. Washing started")

queueConfirmedMachine = null

loadMachines()

}
)

}

}

}

function startCountdown(machineNumber){

if(countdownInterval) return

const popup = document.getElementById("countdownPopup")
const timer = document.getElementById("countdownTimer")

if(!popup || !timer) return

popup.style.display = "flex"

countdownMachine = machineNumber
countdownSeconds = 30

updateTimer(timer)

countdownInterval = setInterval(async () => {

countdownSeconds--

updateTimer(timer)

if(countdownSeconds <= 0){

clearInterval(countdownInterval)
countdownInterval = null

await stopCamera()

popup.style.display = "none"

alert("Reservation expired")

await fetch("http://localhost:3000/cancel",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
machine_number:machineNumber,
room_number:currentUser
})
})

reservedMachine = null

loadMachines()

}

},1000)

}

function updateTimer(timer){

const minutes = Math.floor(countdownSeconds / 60)
const seconds = countdownSeconds % 60

timer.innerText =
String(minutes).padStart(2,"0")
+
":"
+
String(seconds).padStart(2,"0")

}

function updateLiveTimers(){

for(const machineNumber in machineEndTimes){

const end = machineEndTimes[machineNumber]
const el = document.getElementById("time-"+machineNumber)

if(!el) continue

const now = Date.now()
const diff = end - now

if(diff <= 0){
el.innerText = "Finished"
continue
}

const minutes = Math.floor(diff/60000)
const seconds = Math.floor((diff%60000)/1000)

el.innerText =
String(minutes).padStart(2,"0")
+
":"
+
String(seconds).padStart(2,"0")

}

}

async function loadMachines(){

if(isLoading) return
isLoading = true

const container = document.getElementById("machineContainer")
container.innerHTML = ""

machineEndTimes = {}
myQueuePosition = null
reservedMachine = null

try{

const res = await fetch("http://localhost:3000/machines")
const machines = await res.json()

for(const machine of machines){

const queueRes = await fetch(`http://localhost:3000/queue/${machine.machine_number}`)
const queue = await queueRes.json()

machine.queue_count = queue.length

const myQueueIndex = queue.findIndex(q => String(q.room_number) === String(currentUser))

if(myQueueIndex !== -1){

reservedMachine = machine.machine_number
myQueuePosition = myQueueIndex + 1

if(myQueueIndex === 0 && machine.status === "available"){

if(queueConfirmedMachine !== machine.machine_number){
showQueueNotification(machine.machine_number)
}

}

if(machine.status === "reserved" && String(machine.current_user_name) === String(currentUser)){

if(!countdownInterval){
startCountdown(machine.machine_number)
}

}

}

}

machines.forEach(machine => {

let statusClass = machine.status
let statusText = "Unknown"

if(machine.status === "available") statusText = "Available"
else if(machine.status === "reserved") statusText = "Reserved"
else if(machine.status === "in_use") statusText = "In Use"
else if(machine.status === "broken") statusText = "Broken"

let reserveDisabled = ""

if(reservedMachine && reservedMachine !== machine.machine_number){
reserveDisabled = "disabled"
}

if(machine.status === "broken"){
reserveDisabled = "disabled"
}

let cancelDisabled = ""

if(reservedMachine !== machine.machine_number){
cancelDisabled = "disabled"
}

if(machine.status === "in_use" && myQueuePosition === 1){
cancelDisabled = "disabled"
}

if(machine.status === "in_use" && machine.end_time){
machineEndTimes[machine.machine_number] =
new Date(machine.end_time).getTime()
}

const card = document.createElement("div")
card.className = "machine-card"

if(machine.status === "broken"){
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

<p>Current User : ${machine.current_user_name || "-"}</p>

<p>Queue : ${machine.queue_count}</p>

<p>Time Left :
<span id="time-${machine.machine_number}">
-
</span>
</p>

<div class="machine-buttons">

<button
class="reserve-btn"
onclick="openReservePopup(${machine.machine_number})"
${reserveDisabled}
>
Reserve
</button>

<button
class="cancel-btn"
onclick="openCancelPopup(${machine.machine_number})"
${cancelDisabled}
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

if(reservedMachine && reservedMachine !== machineNumber){
alert("You already reserved another machine")
return
}

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

try{

const res = await fetch("http://localhost:3000/reserve",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
machine_number:machineNumber,
room_number:currentUser
})
})

const data = await res.json()

if(!res.ok){
alert(data.message || "Reserve failed")
return
}

if(data.queue_position === 1){
startCountdown(machineNumber)
}

loadMachines()

}catch(err){

console.log("Reserve error:",err)

}

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

try{

await fetch("http://localhost:3000/cancel",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
machine_number:machineNumber,
room_number:currentUser
})
})

reservedMachine = null
myQueuePosition = null

clearInterval(countdownInterval)
countdownInterval = null

await stopCamera()

document.getElementById("countdownPopup").style.display = "none"

await loadMachines()

}catch(err){

console.log("Cancel error:",err)

}

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
headers:{ "Content-Type":"application/json" },
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