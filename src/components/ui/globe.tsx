import React, { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

interface GlobeProps {
  className?: string;
  config?: any;
}

export function Globe({ className, config }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    
    if (!canvasRef.current) return;
    
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600,
      height: 600,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 5,
      baseColor: [0.1, 0.1, 0.1], 
      markerColor: [0.1, 0.5, 1], 
      glowColor: [0.05, 0.1, 0.2], 
      scale: 1.1,
      markers: [
        { location: [37.7595, -122.4367], size: 0.05 },
        { location: [51.5072, -0.1276], size: 0.05 },
        { location: [35.6895, 139.6917], size: 0.05 },
        { location: [-33.8688, 151.2093], size: 0.04 },
        { location: [40.7128, -74.0060], size: 0.07 },
        { location: [48.8566, 2.3522], size: 0.04 },
        { location: [1.3521, 103.8198], size: 0.04 },
        { location: [-23.5505, -46.6333], size: 0.04 },
      ],
      ...config,
      // @ts-ignore
      onRender: (state) => {
        state.phi = phi;
        phi += 0.003;
        if (config?.onRender) config.onRender(state);
      },
    });

    return () => {
      globe.destroy();
    };
  }, [config]);

  return (
    <div className={`w-full flex justify-center items-center h-full relative isolate pointer-events-none ${className}`}>
      <canvas
        ref={canvasRef}
        style={{
          width: 600,
          height: 600,
          maxWidth: "100%",
          aspectRatio: 1,
          opacity: 0.85,
        }}
        className="scale-[1.2]"
      />
    </div>
  );
}
