import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import styles from './RegisterPage.module.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { t } = useLocale()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError(t('authRegister.errors.fillAll'))
      return
    }

    if (username.trim().length < 3) {
      setError(t('authRegister.errors.usernameMin'))
      return
    }

    if (password.length < 6) {
      setError(t('authRegister.errors.passwordMin'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('authRegister.errors.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      await register(username.trim(), email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.iconWrap}>
              <UserPlus size={24} />
            </div>
            <h1 className={styles.title}>{t('authRegister.title')}</h1>
            <p className={styles.subtitle}>{t('authRegister.subtitle')}</p>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.error} id="register-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form} id="register-form">
            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">
                {t('authRegister.usernameLabel')}
              </label>
              <input
                id="username"
                type="text"
                className={styles.input}
                placeholder={t('authRegister.usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                {t('authRegister.emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                {t('authRegister.passwordLabel')}
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  placeholder={t('authRegister.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">
                {t('authRegister.confirmPasswordLabel')}
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder={t('authRegister.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
              id="register-submit"
            >
              {loading ? t('authRegister.creating') : t('authRegister.createAccount')}
            </button>
          </form>

          {/* Footer */}
          <div className={styles.footer}>
            <span className={styles.footerText}>{t('authRegister.hasAccount')}</span>
            <Link to="/login" className={styles.footerLink}>
              {t('authRegister.signIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
