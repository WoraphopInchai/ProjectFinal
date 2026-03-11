document.getElementById("loginForm").addEventListener("submit", async function(e){

e.preventDefault()

const email = document.getElementById("email").value.trim()
const password = document.getElementById("password").value.trim()
const result = document.getElementById("result")

result.innerText = "Checking..."

try{

const response = await fetch("http://localhost:3000/login",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
email: email,
password: password
})
})

const data = await response.json()

console.log("LOGIN RESPONSE:", data)

if(response.ok && data.token){

// เก็บข้อมูล login
localStorage.setItem("token", data.token)
localStorage.setItem("role", data.role || "")
localStorage.setItem("room_number", data.room_number || "")
localStorage.setItem("email", data.email || "")
localStorage.setItem("user_id", data.user_id || "") // ⭐ เพิ่มบรรทัดนี้

if(data.role && data.role.toLowerCase() === "admin"){

window.location.href = "../admin/admin-dashboard.html"

}else{

window.location.href = "../main/main.html"

}

}else{

result.innerText = data.message || "Login failed"

}

}catch(error){

console.error("LOGIN ERROR:", error)
result.innerText = "Cannot connect to server"

}

})