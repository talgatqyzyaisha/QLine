const USERS_KEY = "qlineUsers";
const CURRENT_USER_KEY = "currentUser";

function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function registerUser(name, email, password) {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    
    const existingUser = users.find((user) => user.email === normalizedEmail);

    if (existingUser) {
        return {
            success: false,
            message: "Пользователь с таким email уже существует."
        };
    }

    const user = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        password
    };

    users.push(user);
    saveUsers(users);

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email
    }));

    return {
        success: true
    };
}

function loginUser(email, password) {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();

    const user = users.find(
        (user) =>
            user.email === normalizedEmail &&
            user.password === password
    );

    if (!user) {
        return {
            success: false,
            message: "Неверный email или пароль."
        };
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email
    }));

    return {
        success: true
    };
}

function logoutUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
}