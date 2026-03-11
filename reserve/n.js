document.addEventListener("DOMContentLoaded", () => {

loadNotifications()

// โหลดทุก 5 วินาที
setInterval(loadNotifications, 5000)

// ======================
// NAVIGATION BUTTON
// ======================

const homeBtn = document.getElementById("homeBtn")
const notiBtn = document.getElementById("notiBtn")

if(homeBtn){
homeBtn.onclick = () => {
window.location.href = "../main/main.html"
}
}

if(notiBtn){
notiBtn.onclick = () => {
window.location.href = "noti.html"
}
}

})

async function loadNotifications(){

try{

const roomNumber = localStorage.getItem("room_number")

if(!roomNumber){
console.log("ไม่พบ room_number")
return
}

const res = await fetch(`http://localhost:3000/notifications/${roomNumber}`)

if(!res.ok){
console.log("API error")
return
}

const notifications = await res.json()

const container = document.querySelector(".queue-card")

if(!container) return

// ลบ noti เก่า
container.querySelectorAll(".noti-box").forEach(n => n.remove())

notifications.forEach(noti => {

const div = document.createElement("div")

div.className = "noti-box"

div.innerHTML = `
<img src="https://cdn-icons-png.flaticon.com/512/1827/1827349.png">
<div>
<h4>ADMIN</h4>
<p>${noti.message}</p>
</div>
`

container.appendChild(div)

})

}catch(err){

console.log("โหลด notification ไม่สำเร็จ", err)

}

}