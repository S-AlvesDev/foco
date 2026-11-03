const KEY = "theme";

/** Roda no <head>, antes de pintar: evita piscar o tema errado. */
export const themeScript = `(function(){try{var p=localStorage.getItem("${KEY}")||"dark";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.classList.toggle("light",!d);e.style.colorScheme=d?"dark":"light"}catch(_){}})();`;
