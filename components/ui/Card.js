export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white dark:bg-black border border-gray-200 dark:border-gray-800 ${className}`} {...props}>
      {children}
    </div>
  )
}
