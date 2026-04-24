import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Map, BookOpen, LogIn, User, LogOut, ChevronDown, Sun, Moon, Heart, Target, BrainCircuit } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
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
  const { language, setLanguage, t } = useLocale()
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

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ja' : 'en')
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
              {t('header.roadmaps')}
            </Link>

            <Link
              to="/in-progress"
              className={`${styles.navLink} ${location.pathname.startsWith('/in-progress') ? styles.active : ''}`}
              id="nav-in-progress"
            >
              <Target size={16} className={styles.navLinkIcon} />
              {t('header.inProgress')}
            </Link>

            <Link
              to="/favorites"
              className={`${styles.navLink} ${location.pathname.startsWith('/favorites') ? styles.active : ''}`}
              id="nav-favorites"
            >
              <Heart size={16} className={styles.navLinkIcon} />
              {t('header.favorites')}
            </Link>

            <Link
              to="/qa"
              className={`${styles.navLink} ${location.pathname.startsWith('/qa') ? styles.active : ''}`}
              id="nav-qa"
            >
              <BrainCircuit size={16} className={styles.navLinkIcon} />
              {t('header.qa')}
            </Link>

            <button
              type="button"
              className={styles.languageBtn}
              onClick={toggleLanguage}
              id="language-toggle-btn"
              aria-label={t('header.switchLanguage')}
              title={t('header.switchLanguage')}
            >
              <span className={styles.languageCode}>{language === 'en' ? t('header.enShort') : t('header.jaShort')}</span>
            </button>

            <button
              type="button"
              className={styles.themeBtn}
              onClick={toggleTheme}
              id="theme-toggle-btn"
              aria-label={theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
              title={theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? t('header.light') : t('header.dark')}</span>
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
                      {t('header.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className={styles.loginBtn} id="nav-login">
                <LogIn size={16} />
                {t('header.signIn')}
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
          {t('header.roadmaps')}
        </Link>

        <Link to="/in-progress" className={styles.mobileNavLink} id="mobile-nav-in-progress">
          <Target size={20} />
          {t('header.inProgress')}
        </Link>

        <Link to="/favorites" className={styles.mobileNavLink} id="mobile-nav-favorites">
          <Heart size={20} />
          {t('header.favorites')}
        </Link>

        <Link to="/qa" className={styles.mobileNavLink} id="mobile-nav-qa">
          <BrainCircuit size={20} />
          {t('header.qa')}
        </Link>

        <button
          type="button"
          className={styles.mobileNavLink}
          onClick={toggleLanguage}
          id="mobile-language-toggle"
        >
          <span className={styles.languageCode}>{language === 'en' ? t('header.enShort') : t('header.jaShort')}</span>
          {t('header.switchLanguage')}
        </button>

        <button
          type="button"
          className={styles.mobileNavLink}
          onClick={toggleTheme}
          id="mobile-theme-toggle"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          {theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
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
              {t('header.signOut')}
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.mobileNavLink} id="mobile-nav-login">
              <LogIn size={20} />
              {t('header.signIn')}
            </Link>
            <Link to="/register" className={styles.mobileNavLink} id="mobile-nav-register">
              <User size={20} />
              {t('header.createAccount')}
            </Link>
          </>
        )}
      </div>
    </>
  )
}
