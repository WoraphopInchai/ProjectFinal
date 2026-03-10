const token = localStorage.getItem("token")

if(!token){
    window.location.href = "../login/login.html"
}

function logout(){
    localStorage.removeItem("token")
    localStorage.removeItem("role")
    window.location.href = "../login/login.html"
}


// โหลด users
async function loadUsers(){

try{

const response = await fetch("http://localhost:3000/users")

const data = await response.json()

const table = document.getElementById("userTable")

table.innerHTML = ""

data.forEach(user => {

table.innerHTML += `
<tr>
<td>${user.room}</td>
<td>${user.email}</td>
<td>${user.role}</td>
<td>
<button onclick="editUser('${user.id}','${user.room}','${user.email}')">Edit</button>
<button onclick="deleteUser('${user.id}')">Delete</button>
</td>
</tr>
`

})

}catch(err){

alert("Cannot load users")

}

}


// เพิ่ม user
async function addUser(){

const room = document.getElementById("room").value.trim()
const email = document.getElementById("email").value.trim()
const password = document.getElementById("password").value.trim()

if(!room || !email || !password){
alert("Please fill all fields")
return
}

await fetch("http://localhost:3000/register",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
room,
email,
password
})
})

document.getElementById("room").value=""
document.getElementById("email").value=""
document.getElementById("password").value=""

loadUsers()

}


// ลบ user
async function deleteUser(id){

if(!confirm("Delete this user?")) return

await fetch("http://localhost:3000/users/"+id,{
method:"DELETE"
})

loadUsers()

}


// แก้ไข user
async function editUser(id,room,email){

const newRoom = prompt("Edit room",room)
if(newRoom === null) return

const newEmail = prompt("Edit email",email)
if(newEmail === null) return

const newPassword = prompt("Edit password")
if(newPassword === null) return

await fetch("http://localhost:3000/users/"+id,{
method:"PUT",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
room:newRoom.trim(),
email:newEmail.trim(),
password:newPassword.trim()
})
})

loadUsers()

}

loadUsers()