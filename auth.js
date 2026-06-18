// =======================
// REGISTER
// =======================
function registerUser() {

    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const photoInput = document.getElementById("registerPhoto");

    if (!nameInput || !emailInput || !passwordInput) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (name === "" || email === "" || password === "") {
        alert("Please fill all fields");
        return;
    }

    const file = photoInput.files[0];

    if (!file) {
        alert("Please select profile photo");
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {

        const user = {
            name: name,
            email: email,
            password: password,
            photo: reader.result
        };

        localStorage.setItem("golden_user", JSON.stringify(user));

        alert("Account Created Successfully");

        window.location.href = "login.html";
    };

    reader.readAsDataURL(file);
}