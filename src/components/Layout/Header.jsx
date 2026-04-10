import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Map, GitFork, BookOpen, LogIn, User, LogOut, ChevronDown, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Header.module.css'

const THEME_STORAGE_KEY = 'devpath_theme'

function getInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme

  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
  return prefersLight ? 'light' : 'dark'
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [theme, setTheme] = useState('dark')
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()
  const userMenuRef = useRef(null)
  const themeTransitionTimerRef = useRef(null)

  useEffect(() => {
    const initialTheme = getInitialTheme()
    setTheme(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)

    return () => {
      if (themeTransitionTimerRef.current) {
        window.clearTimeout(themeTransitionTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
  }

  const toggleTheme = () => {
    const root = document.documentElement

    if (themeTransitionTimerRef.current) {
      window.clearTimeout(themeTransitionTimerRef.current)
    }

    root.classList.add('theme-transition')

    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    root.setAttribute('data-theme', nextTheme)

    themeTransitionTimerRef.current = window.setTimeout(() => {
      root.classList.remove('theme-transition')
      themeTransitionTimerRef.current = null
    }, 260)
  }

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`} id="main-header">
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo} id="logo-link">
            <div className={styles.logoIcon}>
              <Map size={20} />
            </div>
            <span className={styles.logoText}>DevPath</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className={styles.nav} id="desktop-nav">
            <Link
              to="/"
              className={`${styles.navLink} ${location.pathname === '/' ? styles.active : ''}`}
              id="nav-roadmaps"
            >
              <BookOpen size={16} className={styles.navLinkIcon} />
              Roadmaps
            </Link>
            <a
              href="https://github.com/kamranahmedse/developer-roadmap"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.githubBtn}
              id="nav-github"
            >
              <GitFork size={16} />
              GitHub
            </a>

            <button
              type="button"
              className={styles.themeBtn}
              onClick={toggleTheme}
              id="theme-toggle-btn"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className={styles.userMenu} ref={userMenuRef}>
                <button
                  className={styles.userBtn}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  id="user-menu-btn"
                >
                  <div className={styles.userAvatar}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className={styles.userName}>{user.username}</span>
                  <ChevronDown size={14} className={`${styles.chevron} ${userMenuOpen ? styles.chevronOpen : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className={styles.dropdown} id="user-dropdown">
                    <div className={styles.dropdownHeader}>
                      <div className={styles.dropdownName}>{user.username}</div>
                      <div className={styles.dropdownEmail}>{user.email}</div>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button className={styles.dropdownItem} onClick={handleLogout} id="logout-btn">
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className={styles.loginBtn} id="nav-login">
                <LogIn size={16} />
                Sign In
              </Link>
            )}
          </nav>

          {/* Hamburger */}
          <button
            className={`${styles.hamburger} ${mobileOpen ? styles.open : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            id="hamburger-btn"
          >
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <div className={`${styles.mobileNav} ${mobileOpen ? styles.open : ''}`} id="mobile-nav">
        <Link to="/" className={styles.mobileNavLink} id="mobile-nav-roadmaps">
          <BookOpen size={20} />
          Roadmaps
        </Link>
        <a
          href="https://github.com/kamranahmedse/developer-roadmap"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.mobileNavLink}
          id="mobile-nav-github"
        >
          <GitFork size={20} />
          GitHub
        </a>

        <button
          type="button"
          className={styles.mobileNavLink}
          onClick={toggleTheme}
          id="mobile-theme-toggle"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </button>

        <div className={styles.mobileNavDivider} />

        {isAuthenticated ? (
          <>
            <div className={styles.mobileUserInfo}>
              <div className={styles.userAvatar}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className={styles.mobileUserName}>{user.username}</div>
                <div className={styles.mobileUserEmail}>{user.email}</div>
              </div>
            </div>
            <button className={styles.mobileNavLink} onClick={handleLogout} id="mobile-logout">
              <LogOut size={20} />
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.mobileNavLink} id="mobile-nav-login">
              <LogIn size={20} />
              Sign In
            </Link>
            <Link to="/register" className={styles.mobileNavLink} id="mobile-nav-register">
              <User size={20} />
              Create Account
            </Link>
          </>
        )}
      </div>
    </>
  )
}
