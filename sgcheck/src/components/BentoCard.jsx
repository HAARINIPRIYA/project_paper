import { motion } from 'framer-motion'

function BentoCard({
  children,
  className = '',
  span = 'col-span-1 row-span-1',
  delay = 0
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`
        bg-card rounded-portis shadow-portis-card p-6 md:p-8 border-2 border-primary
        ${span} ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

export default BentoCard
