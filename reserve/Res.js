const API = "http://localhost:3000"

let machineNumber = null
let queuePosition = null

document.addEventListener("DOMContentLoaded", () => {

loadQueue()

setInterval(loadQueue,3000)

})

async function loadQueue(){

const res = await fetch(`${API}/machines`)

const machines = await res.json()

// ตัวอย่างเครื่อง 1
const machine = machines[0]

machineNumber = machine.machine_number

document.getElementById("machineNumber").innerText =
`Machine #${machine.machine_number}`

document.getElementById("waitingQueue").innerText =
machine.queue_count

// สมมุติ queue user = 1
queuePosition = 1

document.getElementById("yourQueue").innerText =
queuePosition

// ถ้าถึงคิว
if(queuePosition === 1){

document.getElementById("openQR").style.display = "block"

}else{

document.getElementById("openQR").style.display = "none"

}

}


document.getElementById("openQR").onclick = () => {

document.getElementById("qrPopup").style.display = "flex"

startCountdown()

startScanner()

}


document.getElementById("closePopup").onclick = () => {

document.getElementById("qrPopup").style.display = "none"

}


document.getElementById("cancelQueue").onclick = async () => {

await fetch(`${API}/cancel`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
machine_number:machineNumber
})

})

alert("Queue cancelled")

location.reload()

}


function startCountdown(){

let time = 300

const timer = setInterval(()=>{

let minutes = Math.floor(time / 60)

let seconds = time % 60

if(seconds < 10) seconds = "0"+seconds

document.getElementById("countdown").innerText =
`${minutes}:${seconds}`

time--

if(time < 0){

clearInterval(timer)

alert("Time expired")

cancelQueue()

}

},1000)

}


function startScanner(){

const qr = new Html5Qrcode("qr-reader")

qr.start(
{ facingMode:"environment" },
{ fps:10, qrbox:250 },

(message)=>{

alert("Machine Verified")

document.getElementById("qrPopup").style.display = "none"

qr.stop()

}

)

}