import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
export default function ThemeToggle() {
 const [theme,setTheme]=useState(()=>document.documentElement.dataset.theme || 'light');
 function toggle(){const next=theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;setTheme(next);try{localStorage.setItem('skillfy-theme',next);}catch{ /* Theme still works without storage. */ }}
 return <button type="button" className="skillfy-theme-toggle" onClick={toggle} aria-label={`Switch to ${theme==='dark'?'light':'dark'} theme`} title={`Switch to ${theme==='dark'?'light':'dark'} theme`}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}<span>{theme==='dark'?'Light':'Dark'} theme</span></button>;
}
