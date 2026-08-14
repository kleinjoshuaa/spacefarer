import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { EventBus } from "./events.js";
import { FlightScene } from "./FlightScene.js";

/**
 * Mounts the Phaser flight simulation into the React tree. The internal render
 * resolution is deliberately tiny (320x280) and scaled up with nearest-neighbour
 * sampling to preserve the chunky 8-bit look.
 */
export function FlightStage({ bus }: { bus: EventBus }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 320,
      height: 280,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: "#101038",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: "arcade",
        arcade: { debug: false },
      },
    });

    game.scene.add("flight", FlightScene, true, { bus });
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [bus]);

  return <div className="stage" ref={containerRef} aria-label="Flight view" />;
}
