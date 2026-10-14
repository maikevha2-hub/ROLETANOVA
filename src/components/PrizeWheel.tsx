import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";

const WHEEL_COLORS = [
  "#6C757D", // Tente Outra Vez
  "#9B59B6", // 5% Desconto
  "#E63946", // Pix de R$20,00
  "#F4A261", // Vale R$50
  "#2A9D8F", // Refrigerante
  "#E9C46A", // Upgrade Batata
  "#457B9D", // Batata
  "#E76F51", // Hot Dog
  "#8B4513", // Cheese Salada
  "#D4AF37", // R$200 no Pix - Dourado Bilhete Willy Wonka
];

const PRIZES = [
  "Tente Outra Vez",
  "5% Desconto",
  "Pix de R$20,00",
  "Vale R$50",
  "Refrigerante Lata",
  "Upgrade Batata P→G",
  "Batata P Grátis",
  "Hot Dog Grátis",
  "Cheese Salada",
  "R$200 no Pix",
];

// PIX logo URL
const PIX_LOGO_URL = "https://customer-assets.emergentagent.com/job_spin-rewards-40/artifacts/706hhwmd_logo-pix.png";

interface PrizeWheelProps {
  key?: any;
  isSpinning: boolean;
  rotationAngle: number;
  onSpinComplete?: () => void;
}

export default function PrizeWheel({ isSpinning, rotationAngle, onSpinComplete }: PrizeWheelProps) {
  const [displayRotation, setDisplayRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const hasTriggeredComplete = useRef(false);

  // Start animation when component mounts with isSpinning=true
  useEffect(() => {
    if (isSpinning && rotationAngle > 0) {
      hasTriggeredComplete.current = false;
      
      // Small delay to ensure DOM is ready for animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
          setDisplayRotation(rotationAngle);
        });
      });
    }
  }, [isSpinning, rotationAngle]); // React to changes

  // Handle completion
  useEffect(() => {
    if (!isAnimating || hasTriggeredComplete.current) return;

    const timer = setTimeout(() => {
      hasTriggeredComplete.current = true;
      setIsAnimating(false);
      if (onSpinComplete) {
        onSpinComplete();
      }
    }, 5200);

    return () => clearTimeout(timer);
  }, [isAnimating, onSpinComplete]);

  const numSlices = 10;
  const sliceAngle = 360 / numSlices;

  return (
    <div className="relative" data-testid="wheel-container">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
        <div
          className="w-0 h-0 wheel-pointer"
          style={{
            borderLeft: "20px solid transparent",
            borderRight: "20px solid transparent",
            borderTop: "40px solid #E63946",
            filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))",
          }}
        />
      </div>

      {/* Wheel */}
      <div
        className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] md:w-[420px] md:h-[420px] rounded-full shadow-2xl"
        style={{
          transform: `rotate(${displayRotation}deg)`,
          transition: isAnimating
            ? "transform 5000ms cubic-bezier(0.1, 0.9, 0.2, 1)"
            : "none",
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Outer ring */}
          <circle
            cx="50"
            cy="50"
            r="49"
            fill="none"
            stroke="#264653"
            strokeWidth="2"
          />

          {/* Prize slices */}
          {PRIZES.map((prize, index) => {
            const startAngle = index * sliceAngle - 90;
            const endAngle = (index + 1) * sliceAngle - 90;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = 50 + 48 * Math.cos(startRad);
            const y1 = 50 + 48 * Math.sin(startRad);
            const x2 = 50 + 48 * Math.cos(endRad);
            const y2 = 50 + 48 * Math.sin(endRad);

            const largeArc = sliceAngle > 180 ? 1 : 0;

            const pathD = `M 50 50 L ${x1} ${y1} A 48 48 0 ${largeArc} 1 ${x2} ${y2} Z`;

            // Text position - moved closer to outer edge (radius 38 instead of 28)
            const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
            const textRadius = 38;
            const textX = 50 + textRadius * Math.cos(midAngle);
            const textY = 50 + textRadius * Math.sin(midAngle);
            const textRotation = (startAngle + endAngle) / 2 + 90;

            // Split text into two lines if needed
            const words = prize.split(' ');
            const line1 = words.length > 1 ? words[0] : prize;
            const line2 = words.length > 1 ? words.slice(1).join(' ') : '';

            // Check if this is the PIX prize (index 9)
            const isPix = index === 9;

            return (
              <g key={index}>
                {/* Slice background - gradient for PIX (Golden Ticket style) */}
                {isPix ? (
                  <>
                    <defs>
                      <linearGradient id="pixGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFD700" />
                        <stop offset="25%" stopColor="#D4AF37" />
                        <stop offset="50%" stopColor="#FFD700" />
                        <stop offset="75%" stopColor="#B8860B" />
                        <stop offset="100%" stopColor="#FFD700" />
                      </linearGradient>
                    </defs>
                    <path d={pathD} fill="url(#pixGradient)" stroke="#B8860B" strokeWidth="1" />
                  </>
                ) : (
                  <path d={pathD} fill={WHEEL_COLORS[index]} stroke="#fff" strokeWidth="0.5" />
                )}
                
                {/* PIX slice with logo */}
                {isPix ? (
                  <>
                    {/* PIX Logo */}
                    <image
                      href={PIX_LOGO_URL}
                      x={textX - 3}
                      y={textY - 5}
                      width="6"
                      height="6"
                      transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                      preserveAspectRatio="xMidYMid meet"
                    />
                    <text
                      x={textX}
                      y={textY + 3.5}
                      fill="#000"
                      fontSize="2.8"
                      fontWeight="bold"
                      fontFamily="Fredoka, sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                    >
                      R$200,00
                    </text>
                  </>
                ) : words.length > 1 ? (
                  <>
                    <text
                      x={textX}
                      y={textY - 1.5}
                      fill="#fff"
                      fontSize="3.5"
                      fontWeight="bold"
                      fontFamily="Fredoka, sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                    >
                      {line1}
                    </text>
                    <text
                      x={textX}
                      y={textY + 2}
                      fill="#fff"
                      fontSize="3.5"
                      fontWeight="bold"
                      fontFamily="Fredoka, sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                    >
                      {line2}
                    </text>
                  </>
                ) : (
                  <text
                    x={textX}
                    y={textY}
                    fill="#fff"
                    fontSize="3.5"
                    fontWeight="bold"
                    fontFamily="Fredoka, sans-serif"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                  >
                    {prize}
                  </text>
                )}
              </g>
            );
          })}

          {/* Center circle with logo */}
          <circle cx="50" cy="50" r="14" fill="#1a1a1a" />
          <clipPath id="logoClip">
            <circle cx="50" cy="50" r="13" />
          </clipPath>
          <image
            href="https://customer-assets.emergentagent.com/job_spin-rewards-40/artifacts/x2gha05h_ChatGPT%20Image%2021%20de%20mar.%20de%202026%2C%2021_09_14.png"
            x="37"
            y="37"
            width="26"
            height="26"
            clipPath="url(#logoClip)"
            preserveAspectRatio="xMidYMid slice"
          />
        </svg>
      </div>

      {/* Decorative dots around wheel */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(16)].map((_, i) => {
          const angle = (i * 22.5 * Math.PI) / 180;
          const x = 50 + 52 * Math.cos(angle);
          const y = 50 + 52 * Math.sin(angle);
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-[#F4A261]"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function triggerConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      particleCount: Math.floor(count * particleRatio),
      spread: 26,
      startVelocity: 55,
      ...opts,
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}
