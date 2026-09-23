import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  minLength?: number
  autoComplete?: string
  name?: string
  label?: string
  disabled?: boolean
}

/**
 * A password input with an accessible show/hide "eye" toggle rendered inside the
 * field. It renders ONLY the control (input + button) so it drops into any
 * existing label layout and inherits that label's input styling via descendant
 * selectors. The value stays type="password" unless explicitly revealed; no
 * password is ever stored or fetched from the database here.
 */
export function PasswordField({
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete = 'current-password',
  name,
  label,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  const toggleLabel = visible ? 'Hide password' : 'Show password'

  return (
    <span className="pw-control">
      <input
        id={id}
        name={name}
        className="pw-input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-label={label}
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setVisible(v => !v)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setVisible(v => !v)
          }
        }}
        aria-label={toggleLabel}
        aria-pressed={visible}
        aria-controls={id}
        title={toggleLabel}
        tabIndex={0}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </span>
  )
}

export default PasswordField
