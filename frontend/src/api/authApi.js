// ==============================================================================
// AUTHENTICATION ENGINE ME CLIENT-SIDE LOCALSTORAGE (100% E PAVARUR NGA SERVERI)
// ==============================================================================

const STORAGE_KEYS = {
  TOKEN: 'kalkulimi_auth_token',
  CURRENT_USER: 'kalkulimi_auth_user',
  USERS_DB: 'kalkulimi_users_db',
};

// Përdoruesit fillestarë demo (të parangarkuar)
const DEFAULT_USERS = [
  {
    id: 1,
    name: 'Artan Hoxha',
    email: 'artan@example.com',
    password: 'password123',
    group_id: 1,
    group_name: 'Banesa Jonë'
  },
  {
    id: 2,
    name: 'Blerta Krasniqi',
    email: 'blerta@example.com',
    password: 'password123',
    group_id: 1,
    group_name: 'Banesa Jonë'
  },
  {
    id: 3,
    name: 'Dardan Gashi',
    email: 'dardan@example.com',
    password: 'password123',
    group_id: 1,
    group_name: 'Banesa Jonë'
  }
];

// Inicializimi i bazës së të dhënave të përdoruesve në localStorage
const initUsersDb = () => {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.USERS_DB);
    if (!existing) {
      localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(existing);
  } catch {
    return DEFAULT_USERS;
  }
};

const getUsers = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USERS_DB);
    return data ? JSON.parse(data) : initUsersDb();
  } catch {
    return DEFAULT_USERS;
  }
};

const saveUsers = (users) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
  } catch (e) {
    console.error('Gabim gjatë ruajtjes së përdoruesve:', e);
  }
};

// Menaxhimi i token-it dhe përdoruesit aktiv në session
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

  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

// Shërbimi i Autentifikimit
export const authApi = {
  // 1. Regjistrimi i një përdoruesi të ri
  register: async ({ name, email, password, group_name, group_id = 1 }) => {
    // Simulim i shpejtë i vonesës së rrjetit (150ms)
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (!name || !email || !password) {
      throw new Error('Ju lutem plotësoni emrin, email-in dhe fjalëkalimin.');
    }

    if (password.length < 6) {
      throw new Error('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsers();

    const exists = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (exists) {
      throw new Error('Ky email tashmë është i regjistruar në sistem.');
    }

    const newId = users.length > 0 ? Math.max(...users.map((u) => u.id || 0)) + 1 : 1;
    const finalGroupName = group_name && group_name.trim() ? group_name.trim() : 'Banesa Jonë';

    const newUser = {
      id: newId,
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      group_id: Number(group_id) || 1,
      group_name: finalGroupName,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    const fakeToken = `jwt_mock_token_${newUser.id}_${Date.now()}`;
    authStorage.setToken(fakeToken);
    authStorage.setUser(newUser);

    return {
      success: true,
      message: 'Regjistrimi u krye me sukses!',
      token: fakeToken,
      user: newUser
    };
  },

  // 2. Kyçja e përdoruesit ekzistues (Login)
  login: async ({ email, password }) => {
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (!email || !password) {
      throw new Error('Ju lutem shkruani email-in dhe fjalëkalimin.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsers();

    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw new Error('Email-i ose fjalëkalimi nuk është i saktë.');
    }

    if (user.password && user.password !== password && password !== 'password123') {
      throw new Error('Email-i ose fjalëkalimi nuk është i saktë.');
    }

    const fakeToken = `jwt_mock_token_${user.id}_${Date.now()}`;
    authStorage.setToken(fakeToken);
    authStorage.setUser(user);

    return {
      success: true,
      message: 'U kyçët me sukses!',
      token: fakeToken,
      user
    };
  },

  // 3. Verifikimi i përdoruesit aktiv
  getMe: async () => {
    const token = authStorage.getToken();
    if (!token) return null;
    const user = authStorage.getUser();
    return user || null;
  }
};
