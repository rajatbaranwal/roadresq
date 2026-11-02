import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'btn-primary',
  dark: 'btn-dark',
  success: 'btn-success',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  glass: 'btn-glass',
};
const SIZES = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' };

// One button for the whole app. Pass `to` for router links, `href` for external links.
const Button = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  full = false,
  className = '',
  to,
  href,
  children,
  ...props
}) => {
  const classes = `btn ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`;
  const iconSize = size === 'sm' ? 16 : 18;
  const content = (
    <>
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : Icon && <Icon size={iconSize} aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight size={iconSize} aria-hidden />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" {...props} className={classes} disabled={loading || props.disabled}>
      {content}
    </button>
  );
};

export default Button;
