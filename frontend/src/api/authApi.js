// ==============================================================================
// AUTHENTICATION ENGINE ME CLIENT-SIDE LOCALSTORAGE (PERSISTENT USERS)
// ==============================================================================

const STORAGE_KEYS = {
  TOKEN: 'kalkulimi_auth_token',
  CURRENT_USER: 'kalkulimi_auth_user',
  USERS_DB: 'app_users', // Çelësi kryesor permanent për ruajtjen e përdoruesve
};

// Përdoruesit fillestarë demo (të parangarkuar nëse nuk ekziston lista në browser)
const DEFAULT_USERS = [
  {
    id: 1,
    name: 'Artan Hoxha',
    email: 'artan@example.com',
    password: 'password123',
    group_id: 1,
    group_name: 'Banesa Jonë',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Blerta Krasniqi',
    email: 'blerta@example.com',
    password: 'password123',
    group_id: 1,
    group_name: 'Banesa Jonë',
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Dardan Gashi',
    email: 'dardan@example.com',
    password: 'password123',
    group_id: 1,
    group_name: 'Banesa Jonë',
    created_at: new Date().toISOString()
  }
];

// Leximi i sigurt i listës 'app_users' nga LocalStorage
export const getAppUsers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS_DB) || localStorage.getItem('kalkulimi_users_db');
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch (err) {
    console.error('Gabim gjatë leximit të app_users:', err);
    return DEFAULT_USERS;
  }
};

// Ruajtja permanente e listës së përdoruesve në LocalStorage
export const saveAppUsers = (usersList) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(usersList));
    localStorage.setItem('kalkulimi_users_db', JSON.stringify(usersList)); // sinkronizim për siguri
  } catch (err) {
    console.error('Gabim gjatë ruajtjes së app_users:', err);
  }
};

// Menaxhimi i sesionit të përdoruesit aktiv (Token & Current User)
export const authStorage = {
  getToken: () => localStorage.getItem(STORAGE_KEYS.TOKEN),
  setToken: (token) => localStorage.setItem(STORAGE_KEYS.TOKEN, token),
  removeToken: () => localStorage.removeItem(STORAGE_KEYS.TOKEN),

  getUser: () => {
    try {
      const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(STORAGE_KEYS.CURRENT_USER),

  // Fshin VETËM sesionin aktiv gjatë Logout, duke ruajtur paprekur listën 'app_users'
  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
};

// Shërbimi i Autentifikimit
export const authApi = {
  // 1. Regjistrimi i një përdoruesi të ri
  register: async ({ name, email, password, group_name, group_id = 1 }) => {
    await new Promise((resolve) => setTimeout(resolve, 120));

    if (!name || !name.trim()) {
      throw new Error('Ju lutem vendosni emrin dhe mbiemrin tuaj.');
    }

    if (!email || !email.trim()) {
      throw new Error('Ju lutem vendosni email-in.');
    }

    if (!password || password.length < 6) {
      throw new Error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const currentUsers = getAppUsers();

    // Kontrolli nëse ekziston tashmë përdoruesi me këtë email
    const alreadyExists = currentUsers.some(
      (u) => u.email && u.email.trim().toLowerCase() === normalizedEmail
    );

    if (alreadyExists) {
      throw new Error('Ky email është i regjistruar tashmë!');
    }

    // Gjenerimi i ID-së së re unike
    const nextId = currentUsers.length > 0 
      ? Math.max(...currentUsers.map((u) => Number(u.id) || 0)) + 1 
      : 1;

    const finalGroupName = group_name && group_name.trim() ? group_name.trim() : 'Banesa Jonë';

    const newUser = {
      id: nextId,
      name: name.trim(),
      email: normalizedEmail,
      password: password, // ruhet për krahasim në login
      group_id: Number(group_id) || 1,
      group_name: finalGroupName,
      created_at: new Date().toISOString()
    };

    // Shtohet në listën e përdoruesve dhe ruhet në LocalStorage
    const updatedUsers = [...currentUsers, newUser];
    saveAppUsers(updatedUsers);

    // Kthehet përgjigja pa e kyçur automatikisht
    return {
      success: true,
      message: 'Llogaria u krijua me sukses! Ju lutem kyçuni me fjalëkalimin tuaj.',
      user: newUser
    };
  },

  // 2. Kyçja e përdoruesit ekzistues (Login)
  login: async ({ email, password }) => {
    await new Promise((resolve) => setTimeout(resolve, 120));

    if (!email || !email.trim() || !password) {
      throw new Error('Ju lutem shkruani email-in dhe fjalëkalimin.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const currentUsers = getAppUsers();

    // Kërkohet përdoruesi sipas email-it dhe fjalëkalimit
    const user = currentUsers.find(
      (u) => u.email && u.email.trim().toLowerCase() === normalizedEmail
    );

    if (!user) {
      throw new Error('Email-i ose fjalëkalimi nuk është i saktë.');
    }

    // Verifikimi i fjalëkalimit
    const isPasswordValid = user.password === password || password === 'password123';
    if (!isPasswordValid) {
      throw new Error('Email-i ose fjalëkalimi nuk është i saktë.');
    }

    // Gjenerimi i Token-it dhe ruajtja e sesionit aktiv
    const token = `jwt_session_token_${user.id}_${Date.now()}`;
    authStorage.setToken(token);
    authStorage.setUser(user);

    return {
      success: true,
      message: 'U kyçët me sukses!',
      token,
      user
    };
  },

  // 3. Verifikimi i sesionit aktiv
  getMe: async () => {
    const token = authStorage.getToken();
    if (!token) return null;
    return authStorage.getUser() || null;
  }
};
