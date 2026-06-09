import { useThemeContext } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeContext();
  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="p-2 rounded-xl transition-all duration-150 text-white/50 hover:text-white/90 hover:bg-white/10"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
