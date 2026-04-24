import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { t } = useLocale()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!identifier.trim() || !password) {
      setError(t('authLogin.errors.fillAll'))
      return
    }

    setLoading(true)
    try {
      await login(identifier.trim(), password)
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
              <LogIn size={24} />
            </div>
            <h1 className={styles.title}>{t('authLogin.title')}</h1>
            <p className={styles.subtitle}>{t('authLogin.subtitle')}</p>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.error} id="login-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form} id="login-form">
            <div className={styles.field}>
              <label className={styles.label} htmlFor="identifier">
                {t('authLogin.identifierLabel')}
              </label>
              <input
                id="identifier"
                type="text"
                className={styles.input}
                placeholder={t('authLogin.identifierPlaceholder')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                {t('authLogin.passwordLabel')}
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  placeholder={t('authLogin.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
              id="login-submit"
            >
              {loading ? t('authLogin.signingIn') : t('authLogin.signIn')}
            </button>
          </form>

          {/* Footer */}
          <div className={styles.footer}>
            <span className={styles.footerText}>{t('authLogin.noAccount')}</span>
            <Link to="/register" className={styles.footerLink}>
              {t('authLogin.createAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
