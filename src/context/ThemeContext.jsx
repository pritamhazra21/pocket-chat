import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'amoled', label: 'AMOLED' },
]

export const CHAT_BGS = [
  { id: 'default', label: 'Default' },
  { id: 'plain', label: 'Plain' },
  { id: 'teal', label: 'Teal' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'ocean', label: 'Ocean' },
]

const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('pc_theme') || 'dark')
  const [chatBg, setChatBg] = useState(() => localStorage.getItem('pc_chatbg') || 'default')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pc_theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-chat-bg', chatBg)
    localStorage.setItem('pc_chatbg', chatBg)
  }, [chatBg])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, chatBg, setChatBg }}>
      {children}
    </ThemeContext.Provider>
  )
}
