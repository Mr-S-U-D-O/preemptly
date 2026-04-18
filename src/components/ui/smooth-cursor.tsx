import React, { FC, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { motion, useSpring } from "motion/react"
import { Search, Loader2, MousePointer2, Move, Copy, HelpCircle, XCircle, Hand, Grab, Monitor, Type, ChevronsLeftRight, ChevronsUpDown, Spline } from "lucide-react"

interface Position {
  x: number
  y: number
}

export interface SmoothCursorProps {
  cursor?: React.ReactNode
  springConfig?: {
    damping: number
    stiffness: number
    mass: number
    restDelta: number
  }
}

const DESKTOP_POINTER_QUERY = "(any-hover: hover) and (any-pointer: fine)"

function isTrackablePointer(pointerType: string) {
  return pointerType !== "touch"
}

// 1. Default Arrow
const DefaultCursorSVG: FC = () => (
  <svg width={50} height={54} viewBox="0 0 50 54" fill="none" style={{ scale: 0.5 }}>
    <g filter="url(#filter0_d_91_7928)">
      <path d="M42.6817 41.1495L27.5103 6.79925C26.7269 5.02557 24.2082 5.02558 23.3927 6.79925L7.59814 41.1495C6.75833 42.9759 8.52712 44.8902 10.4125 44.1954L24.3757 39.0496C24.8829 38.8627 25.4385 38.8627 25.9422 39.0496L39.8121 44.1954C41.6849 44.8902 43.4884 42.9759 42.6817 41.1495Z" fill="black" />
      <path d="M43.7146 40.6933L28.5431 6.34306C27.3556 3.65428 23.5772 3.69516 22.3668 6.32755L6.57226 40.6778C5.3134 43.4156 7.97238 46.298 10.803 45.2549L24.7662 40.109C25.0221 40.0147 25.2999 40.0156 25.5494 40.1082L39.4193 45.254C42.2261 46.2953 44.9254 43.4347 43.7146 40.6933Z" stroke="white" strokeWidth={2.25825} />
    </g>
    <defs>
      <filter id="filter0_d_91_7928" x={0.6} y={0.9} width={49} height={52} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
        <feOffset dy={2.25} /><feGaussianBlur stdDeviation={2.25} /><feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0" />
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
      </filter>
    </defs>
  </svg>
)

// 2. Text / Beam
const TextCursorSVG: FC = () => (
  <div className="flex flex-col items-center justify-center">
    <div className="w-[3px] h-6 bg-black rounded-full border border-white/50 shadow-sm" />
  </div>
)

// 3. Pointer
const PointerCursorSVG: FC = () => (
  <div className="w-5 h-5 rounded-full bg-black border-[2px] border-white shadow-lg flex items-center justify-center">
    <div className="w-1.5 h-1.5 bg-white rounded-full" />
  </div>
)

// 4. Wait / Progress (Spinning Ring)
const WaitCursorSVG: FC = () => (
  <div className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center">
    <Loader2 size={16} className="text-black animate-spin" />
  </div>
)

// 5. Grab
const GrabCursorSVG: FC = () => (
  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-xl flex items-center justify-center scale-110">
    <Hand size={18} className="text-black" />
  </div>
)

// 6. Grabbing
const GrabbingCursorSVG: FC = () => (
  <div className="w-8 h-8 rounded-full bg-black border-2 border-white shadow-xl flex items-center justify-center scale-95">
    <Grab size={18} className="text-white" />
  </div>
)

// 7. Not Allowed / No Drop
const NotAllowedCursorSVG: FC = () => (
  <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 shadow-lg flex items-center justify-center">
    <XCircle size={20} className="text-red-500" />
  </div>
)

// 8. Zoom In
const ZoomInCursorSVG: FC = () => (
  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-black font-black text-xs">
    <Search size={14} className="absolute inline" />
    <span className="absolute ml-5 text-[10px] font-black">+</span>
  </div>
)

// 9. Zoom Out
const ZoomOutCursorSVG: FC = () => (
  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-black font-black text-xs">
    <Search size={14} className="absolute inline" />
    <span className="absolute ml-5 text-[10px] font-black">-</span>
  </div>
)

// 10. Crosshair / Cell
const CrosshairCursorSVG: FC = () => (
  <div className="relative w-6 h-6 flex items-center justify-center">
    <div className="absolute w-full h-[2px] bg-black shadow-[0_0_2px_white]" />
    <div className="absolute h-full w-[2px] bg-black shadow-[0_0_2px_white]" />
  </div>
)

// 11. Move / All-Scroll
const MoveCursorSVG: FC = () => (
  <div className="w-8 h-8 rounded-full bg-black border-2 border-white shadow-lg flex items-center justify-center">
    <Move size={18} className="text-white" />
  </div>
)

// 12. Copy / Alias
const CopyCursorSVG: FC = () => (
  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center">
    <Copy size={16} className="text-[#5a8c12]" />
  </div>
)

// 13. Help
const HelpCursorSVG: FC = () => (
  <div className="w-8 h-8 rounded-full bg-black border-2 border-white shadow-lg flex items-center justify-center">
    <HelpCircle size={18} className="text-white" />
  </div>
)

// 14. Col-Resize (EW, W, E)
const ColResizeCursorSVG: FC = () => (
  <div className="w-8 h-8 rounded-full bg-black border-2 border-white shadow-lg flex items-center justify-center">
    <ChevronsLeftRight size={18} className="text-white" />
  </div>
)

// 15. Row-Resize (NS, N, S)
const RowResizeCursorSVG: FC = () => (
  <div className="w-8 h-8 rounded-full bg-black border-2 border-white shadow-lg flex items-center justify-center">
    <ChevronsUpDown size={18} className="text-white" />
  </div>
)

// Advanced State Grouper Helper
function mapCssCursorToLogicalState(rawCursor: string): string {
  // Extract main intent if trailing fallbacks exist (e.g. `zoom-in, auto`)
  const cursor = rawCursor.split(',')[0].trim().toLowerCase();

  switch (cursor) {
    case 'text':
    case 'vertical-text':
      return 'text';
    case 'pointer':
      return 'pointer';
    case 'wait':
    case 'progress':
      return 'wait';
    case 'help':
      return 'help';
    case 'crosshair':
    case 'cell':
      return 'crosshair';
    case 'alias':
    case 'copy':
      return 'copy';
    case 'move':
    case 'all-scroll':
      return 'move';
    case 'no-drop':
    case 'not-allowed':
      return 'not-allowed';
    case 'col-resize':
    case 'ew-resize':
    case 'e-resize':
    case 'w-resize':
      return 'col-resize';
    case 'row-resize':
    case 'ns-resize':
    case 'n-resize':
    case 's-resize':
      return 'row-resize';
    case 'nesw-resize':
    case 'ne-resize':
    case 'sw-resize':
    case 'nwse-resize':
    case 'nw-resize':
    case 'se-resize':
      // Just fallback to move if diagonal (to save SVG bloat, it's very rare anyway)
      return 'move';
    case 'zoom-in':
      return 'zoom-in';
    case 'zoom-out':
      return 'zoom-out';
    case 'grab':
      return 'grab';
    case 'grabbing':
      return 'grabbing';
    case 'none':
      return 'none';
    case 'auto':
    case 'default':
    case 'context-menu':
    case 'initial':
    case 'inherit':
    default:
      return 'default';
  }
}


export function SmoothCursor({
  cursor: customCursor,
  springConfig = {
    damping: 45,
    stiffness: 300,
    mass: 1,
    restDelta: 0.001,
  },
}: SmoothCursorProps) {
  const lastMousePos = useRef<Position>({ x: 0, y: 0 })
  const velocity = useRef<Position>({ x: 0, y: 0 })
  const lastUpdateTime = useRef(Date.now())
  const previousAngle = useRef(0)
  const accumulatedRotation = useRef(0)
  
  const [isEnabled, setIsEnabled] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [cursorState, setCursorState] = useState<string>('default')

  const cursorX = useSpring(0, springConfig)
  const cursorY = useSpring(0, springConfig)
  const rotation = useSpring(0, {
    ...springConfig,
    damping: 60,
    stiffness: 300,
  })
  const scale = useSpring(1, {
    ...springConfig,
    stiffness: 500,
    damping: 35,
  })

  // Global Style to force hide ALL system cursors
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      * { cursor: none !important; }
      input, textarea, button, a, [role="button"], select { cursor: none !important; }
    `;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_POINTER_QUERY)
    const updateEnabled = () => {
      const nextIsEnabled = mediaQuery.matches
      setIsEnabled(nextIsEnabled)
      if (!nextIsEnabled) setIsVisible(false)
    }
    updateEnabled()
    mediaQuery.addEventListener("change", updateEnabled)
    return () => mediaQuery.removeEventListener("change", updateEnabled)
  }, [])

  useEffect(() => {
    if (!isEnabled) return

    let timeout: ReturnType<typeof setTimeout> | null = null

    const updateVelocity = (currentPos: Position) => {
      const currentTime = Date.now()
      const deltaTime = currentTime - lastUpdateTime.current

      if (deltaTime > 0) {
        velocity.current = {
          x: (currentPos.x - lastMousePos.current.x) / deltaTime,
          y: (currentPos.y - lastMousePos.current.y) / deltaTime,
        }
      }

      lastUpdateTime.current = currentTime
      lastMousePos.current = currentPos
    }

    const smoothPointerMove = (e: PointerEvent) => {
      if (!isTrackablePointer(e.pointerType)) return

      setIsVisible(true)

      const currentPos = { x: e.clientX, y: e.clientY }
      updateVelocity(currentPos)

      // Detect cursor state dynamically based on what the browser intended to render
      let detectedState = 'default';
      const target = e.target as HTMLElement;
      
      if (target) {
        const computedStyle = window.getComputedStyle(target);
        
        // Browsers hide text cursor under complex DOM trees sometimes, enforce fallback check
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          detectedState = 'text';
        } else {
          detectedState = mapCssCursorToLogicalState(computedStyle.cursor);
        }
      }
      
      setCursorState(detectedState);

      const speed = Math.sqrt(Math.pow(velocity.current.x, 2) + Math.pow(velocity.current.y, 2))

      cursorX.set(currentPos.x)
      cursorY.set(currentPos.y)

      if (speed > 0.1) {
        const currentAngle = Math.atan2(velocity.current.y, velocity.current.x) * (180 / Math.PI) + 90
        let angleDiff = currentAngle - previousAngle.current
        
        if (angleDiff > 180) angleDiff -= 360
        if (angleDiff < -180) angleDiff += 360
        
        accumulatedRotation.current += angleDiff
        rotation.set(accumulatedRotation.current)
        previousAngle.current = currentAngle

        scale.set(0.95)

        if (timeout !== null) clearTimeout(timeout)
        timeout = setTimeout(() => scale.set(1), 150)
      }
    }

    let rafId = 0
    const throttledPointerMove = (e: PointerEvent) => {
      if (!isTrackablePointer(e.pointerType)) return
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        smoothPointerMove(e)
        rafId = 0
      })
    }

    window.addEventListener("pointermove", throttledPointerMove, { passive: true })

    return () => {
      window.removeEventListener("pointermove", throttledPointerMove)
      if (rafId) cancelAnimationFrame(rafId)
      if (timeout !== null) clearTimeout(timeout)
    }
  }, [cursorX, cursorY, rotation, scale, isEnabled])

  if (!isEnabled || cursorState === 'none') {
    return null
  }

  const renderCursor = () => {
    if (customCursor) return customCursor;
    switch (cursorState) {
      case 'text': return <TextCursorSVG />
      case 'pointer': return <PointerCursorSVG />
      case 'wait': return <WaitCursorSVG />
      case 'grab': return <GrabCursorSVG />
      case 'grabbing': return <GrabbingCursorSVG />
      case 'not-allowed': return <NotAllowedCursorSVG />
      case 'zoom-in': return <ZoomInCursorSVG />
      case 'zoom-out': return <ZoomOutCursorSVG />
      case 'crosshair': return <CrosshairCursorSVG />
      case 'move': return <MoveCursorSVG />
      case 'copy': return <CopyCursorSVG />
      case 'help': return <HelpCursorSVG />
      case 'col-resize': return <ColResizeCursorSVG />
      case 'row-resize': return <RowResizeCursorSVG />
      case 'default':
      default: return <DefaultCursorSVG />
    }
  }

  // Only rotate the arrow, nothing else makes sense to rotate violently with mouse movement
  const shouldRotate = cursorState === 'default';

  return createPortal(
    <motion.div
      style={{
        position: "fixed",
        left: cursorX,
        top: cursorY,
        translateX: "-50%",
        translateY: "-50%",
        rotate: shouldRotate ? rotation : 0,
        scale: scale,
        zIndex: 100000,
        pointerEvents: "none",
        willChange: "transform",
        opacity: isVisible ? 1 : 0,
      }}
      initial={false}
      animate={{ 
        opacity: isVisible ? 1 : 0
      }}
      transition={{
        duration: 0.15,
      }}
    >
      {renderCursor()}
    </motion.div>,
    document.body
  )
}
