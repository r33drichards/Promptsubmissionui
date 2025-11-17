import { motion } from 'framer-motion';

interface LatticeLoadingAnimationProps {
  className?: string;
}

/**
 * A lattice/grid loading animation using Framer Motion
 * Displays a 3x3 grid of dots that pulse in a wave pattern
 */
export function LatticeLoadingAnimation({
  className = '',
}: LatticeLoadingAnimationProps) {
  // Create a 3x3 grid of dots
  const gridSize = 3;
  const dots = Array.from({ length: gridSize * gridSize });

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      aria-label="Loading"
    >
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {dots.map((_, index) => {
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          // Calculate delay based on position for a diagonal wave effect
          const delay = (row + col) * 0.15;

          return (
            <motion.div
              key={index}
              className="w-1.5 h-1.5 bg-blue-500 rounded-full"
              initial={{ opacity: 0.3, scale: 0.8 }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
