// Tema: aplikacioni është gjithmonë i çelët; tema e errët është opsion që përdoruesi e ndez vetë
// nga menuja e profilit. Zgjedhja ruhet te localStorage (vetëm në këtë shfletues) dhe aplikohet si
// html[data-theme="dark"]. index.html e aplikon edhe para se të ngarkohet React (pa "blic" të bardhë).
const KEY = 'kalkulimi-theme';

export const isDarkTheme = () => {
  try {
    return localStorage.getItem(KEY) === 'dark';
  } catch {
    return false;
  }
};

export const setDarkTheme = (enabled) => {
  try {
    if (enabled) localStorage.setItem(KEY, 'dark');
    else localStorage.removeItem(KEY);
  } catch {
    /* localStorage i bllokuar: tema vlen vetëm për këtë seancë */
  }
  if (enabled) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
};
