import Phaser from "phaser";
import { planetColor, starColor } from "../palette.js";
import type { EventBus, FlightConfig } from "./events.js";
import { createGameTextures } from "./textures.js";

const WORLD_W = 2400;
const WORLD_H = 2000;
const PLAYER_THRUST = 260;
const PLAYER_MAX_SPEED = 320;
const PLAYER_TURN = 220; // degrees / second
const BULLET_SPEED = 520;
const FIRE_COOLDOWN = 240; // ms
const DOCK_RANGE = 110;
const DOCK_SPEED = 110;
// The player starts a short hop from the station so docking is achievable
// within the enemy-spawn grace period, keeping the opening approachable.
const STATION_X = 1200;
const STATION_Y = 760;
const PLAYER_X = 1200;
const PLAYER_Y = 1080;

type Ship = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

/**
 * Top-down arcade rendition of Elite-style flight. The player drifts through a
 * system, dodges or destroys hostiles, and docks at the station. All heavier
 * economy/persistence logic lives on the backend; this scene only simulates the
 * moment-to-moment action and reports outcomes over the event bus.
 */
export class FlightScene extends Phaser.Scene {
  private bus!: EventBus;
  private config?: FlightConfig;

  private player!: Ship;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private station!: Phaser.GameObjects.Image;
  private decor!: Phaser.GameObjects.Group;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyFire!: Phaser.Input.Keyboard.Key;
  private keyDock!: Phaser.Input.Keyboard.Key;

  private starsFar!: Phaser.GameObjects.TileSprite;
  private starsNear!: Phaser.GameObjects.TileSprite;

  private hull = 100;
  private lastFire = 0;
  private lastSpawn = 0;
  private spawnGraceUntil = 0;
  private dockable = false;
  private alive = true;

  constructor() {
    super("flight");
  }

  init(data: { bus: EventBus }): void {
    this.bus = data.bus;
  }

  preload(): void {
    createGameTextures(this);
    this.buildStarTexture();
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor("#101038");

    const view = this.scale;
    this.starsFar = this.add
      .tileSprite(0, 0, view.width, view.height, "star-tile")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(0.5)
      .setDepth(-20);
    this.starsNear = this.add
      .tileSprite(0, 0, view.width, view.height, "star-tile")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-19);

    this.decor = this.add.group();

    this.playerBullets = this.physics.add.group({ defaultKey: "bullet", maxSize: 40 });
    this.enemyBullets = this.physics.add.group({ defaultKey: "enemy-bullet", maxSize: 60 });
    this.enemies = this.physics.add.group();

    this.player = this.physics.add.sprite(PLAYER_X, PLAYER_Y, "player-ship");
    this.player.setDamping(true).setDrag(0.7).setMaxVelocity(PLAYER_MAX_SPEED);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.station = this.add.image(STATION_X, STATION_Y, "station").setDepth(5);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyFire = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyDock = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    // Stop the browser scrolling when the player uses space/arrows.
    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    ]);

    this.physics.add.overlap(this.playerBullets, this.enemies, (bullet, enemy) => {
      this.onEnemyHit(bullet as Ship, enemy as Ship);
    });
    this.physics.add.overlap(this.enemyBullets, this.player, (_p, bullet) => {
      this.onPlayerHit(bullet as Ship, 6);
    });
    this.physics.add.overlap(this.enemies, this.player, (_p, enemy) => {
      this.onPlayerHit(enemy as Ship, 10, true);
    });

    // Track subscriptions so a destroyed scene (e.g. after docking, or React
    // 18 StrictMode's double-mount) does not leave stale listeners on the
    // long-lived bus, which would otherwise double-process spawns and hull.
    const offConfigure = this.bus.on("flight:configure", (cfg) => this.applyConfig(cfg));
    const offDock = this.bus.on("ui:requestDock", () => this.tryDock());
    const cleanup = () => {
      offConfigure();
      offDock();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    this.bus.emit("flight:message", "Flight systems online.");
  }

  private applyConfig(cfg: FlightConfig): void {
    this.config = cfg;
    this.hull = cfg.hull;
    this.alive = true;
    this.dockable = false;
    // Give the player a few seconds to orient before hostiles appear.
    this.spawnGraceUntil = this.time.now + 5000;
    this.lastSpawn = this.time.now;

    this.player.enableBody(true, PLAYER_X, PLAYER_Y, true, true);
    this.player.setVelocity(0, 0);
    this.player.setAngle(-90);
    this.player.setActive(true).setVisible(true);

    this.enemies.clear(true, true);
    this.playerBullets.clear(true, true);
    this.enemyBullets.clear(true, true);

    this.drawSystemBackdrop(cfg);
    this.bus.emit("flight:hull", this.hull);
    this.bus.emit("flight:dockable", false);
    this.bus.emit("flight:message", `Arrived at ${cfg.system.name}.`);
  }

  /** Paint the system's star and planets as static backdrop decoration. */
  private drawSystemBackdrop(cfg: FlightConfig): void {
    this.decor.clear(true, true);
    const g = this.add.graphics().setDepth(-10);

    // Star in the corner of the play area.
    const starHex = starColor(cfg.system.star.kind);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(starHex).color, 1);
    g.fillCircle(220, 200, cfg.system.star.radius * 1.6);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(220, 200, cfg.system.star.radius * 0.9);

    cfg.system.planets.forEach((planet, i) => {
      const px = 500 + i * 320 + (i % 2) * 90;
      const py = 380 + ((i * 137) % 900);
      const color = Phaser.Display.Color.HexStringToColor(
        planetColor(planet.kind, planet.hue),
      ).color;
      g.fillStyle(color, 1);
      g.fillCircle(px, py, planet.radius * 3);
      // A darker terminator crescent for a hint of shading.
      g.fillStyle(0x000000, 0.28);
      g.fillCircle(px + planet.radius, py + planet.radius, planet.radius * 2.4);
    });

    // Bake the backdrop into the decor group so it clears on reconfigure.
    this.decor.add(g);

    // Keep the station at its fixed home position near the player's spawn.
    this.station.setPosition(STATION_X, STATION_Y);
  }

  private tryDock(): void {
    if (!this.alive) return;
    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.station.x,
      this.station.y,
    );
    const speed = this.player.body.velocity.length();
    if (dist <= DOCK_RANGE && speed < DOCK_SPEED) {
      this.bus.emit("flight:dock", undefined);
      this.bus.emit("flight:message", "Docking clamps engaged.");
    } else if (dist <= DOCK_RANGE) {
      this.bus.emit("flight:message", "Slow down to dock.");
    } else {
      this.bus.emit("flight:message", "Move closer to the station to dock.");
    }
  }

  update(time: number, delta: number): void {
    if (!this.config) return;

    // Parallax starfields track the camera at different rates.
    const cam = this.cameras.main;
    this.starsFar.setTilePosition(cam.scrollX * 0.2, cam.scrollY * 0.2);
    this.starsNear.setTilePosition(cam.scrollX * 0.5, cam.scrollY * 0.5);

    if (this.alive) this.handlePlayer(time, delta);
    this.handleEnemies(time, delta);
    this.recycleBullets();

    // Docking availability feedback.
    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.station.x,
      this.station.y,
    );
    const canDock =
      this.alive && dist <= DOCK_RANGE && this.player.body.velocity.length() < DOCK_SPEED;
    if (canDock !== this.dockable) {
      this.dockable = canDock;
      this.bus.emit("flight:dockable", canDock);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyDock)) this.tryDock();
  }

  private handlePlayer(time: number, delta: number): void {
    const dt = delta / 1000;
    const turnLeft = this.cursors.left?.isDown || this.keyA.isDown;
    const turnRight = this.cursors.right?.isDown || this.keyD.isDown;
    if (turnLeft) this.player.angle -= PLAYER_TURN * dt;
    if (turnRight) this.player.angle += PLAYER_TURN * dt;

    const thrusting = this.cursors.up?.isDown || this.keyW.isDown;
    if (thrusting) {
      this.physics.velocityFromAngle(this.player.angle, PLAYER_THRUST, this.player.body.acceleration);
      this.spawnThrustSpark();
    } else {
      this.player.setAcceleration(0, 0);
    }

    if (this.keyFire.isDown && time > this.lastFire + FIRE_COOLDOWN) {
      this.firePlayerBullet();
      this.lastFire = time;
    }
  }

  private firePlayerBullet(): void {
    const bullet = this.playerBullets.get(this.player.x, this.player.y) as Ship | null;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true);
    bullet.body.reset(this.player.x, this.player.y);
    this.physics.velocityFromAngle(this.player.angle, BULLET_SPEED, bullet.body.velocity);
    this.time.delayedCall(1200, () => this.killBullet(bullet, this.playerBullets));
  }

  private spawnThrustSpark(): void {
    if (Math.random() > 0.4) return;
    const behind = Phaser.Math.DegToRad(this.player.angle + 180);
    const spark = this.add
      .image(this.player.x + Math.cos(behind) * 14, this.player.y + Math.sin(behind) * 14, "spark")
      .setTint(0x3ad1e0)
      .setDepth(9);
    this.tweens.add({
      targets: spark,
      alpha: 0,
      scale: 0.2,
      duration: 260,
      onComplete: () => spark.destroy(),
    });
  }

  private handleEnemies(time: number, delta: number): void {
    const danger = this.config?.danger ?? 0;
    const maxEnemies = danger >= 4 ? 3 : danger >= 2 ? 2 : danger >= 1 ? 1 : 0;
    if (
      this.alive &&
      maxEnemies > 0 &&
      time > this.spawnGraceUntil &&
      this.enemies.countActive(true) < maxEnemies &&
      time > this.lastSpawn + 3800
    ) {
      this.spawnEnemy();
      this.lastSpawn = time;
    }

    const dt = delta / 1000;
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Ship;
      if (!enemy.active) continue;
      const angleToPlayer = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        this.player.x,
        this.player.y,
      );
      // Sprite art points down, so offset by 90 degrees.
      enemy.rotation = Phaser.Math.Angle.RotateTo(
        enemy.rotation,
        angleToPlayer - Math.PI / 2,
        2.4 * dt,
      );
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const speed = dist > 260 ? 140 : 60;
      this.physics.velocityFromRotation(angleToPlayer, speed, enemy.body.velocity);

      const cooldown = enemy.getData("fireAt") as number | undefined;
      if (this.alive && dist < 420 && (cooldown === undefined || time > cooldown)) {
        this.fireEnemyBullet(enemy, angleToPlayer);
        enemy.setData("fireAt", time + Phaser.Math.Between(1100, 2000));
      }
    }
  }

  private spawnEnemy(): void {
    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * 520, 40, WORLD_W - 40);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * 520, 40, WORLD_H - 40);
    const enemy = this.enemies.create(x, y, "enemy-ship") as Ship;
    enemy.setData("hp", 3);
    enemy.setCollideWorldBounds(true);
    enemy.setDepth(8);
    this.bus.emit("flight:message", "Hostile contact detected!");
  }

  private fireEnemyBullet(enemy: Ship, angle: number): void {
    const bullet = this.enemyBullets.get(enemy.x, enemy.y) as Ship | null;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true);
    bullet.body.reset(enemy.x, enemy.y);
    this.physics.velocityFromRotation(angle, 340, bullet.body.velocity);
    this.time.delayedCall(2200, () => this.killBullet(bullet, this.enemyBullets));
  }

  private onEnemyHit(bullet: Ship, enemy: Ship): void {
    if (!bullet.active || !enemy.active) return;
    this.killBullet(bullet, this.playerBullets);
    const hp = ((enemy.getData("hp") as number) ?? 1) - 1;
    if (hp <= 0) {
      this.explode(enemy.x, enemy.y, 0xf7c948);
      enemy.destroy();
      this.bus.emit("flight:kill", 1);
      this.bus.emit("flight:message", "Hostile destroyed. Bounty credited.");
    } else {
      enemy.setData("hp", hp);
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(60, () => enemy.clearTint());
    }
  }

  private onPlayerHit(source: Ship, damage: number, isShip = false): void {
    if (!this.alive) return;
    if (isShip) {
      this.explode(source.x, source.y, 0xe5484d);
      source.destroy();
    } else {
      this.killBullet(source, this.enemyBullets);
    }
    this.hull = Math.max(0, this.hull - damage);
    this.cameras.main.shake(120, 0.006);
    this.bus.emit("flight:hull", this.hull);
    if (this.hull <= 0) this.destroyPlayer();
  }

  private destroyPlayer(): void {
    this.alive = false;
    this.explode(this.player.x, this.player.y, 0x3ad1e0);
    this.player.disableBody(true, true);
    this.bus.emit("flight:destroyed", undefined);
    this.bus.emit("flight:message", "Hull breach! Escape pod deployed.");
  }

  private explode(x: number, y: number, color: number): void {
    for (let i = 0; i < 12; i++) {
      const spark = this.add.image(x, y, "spark").setTint(color).setDepth(12);
      const a = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(40, 160);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(a) * speed,
        y: y + Math.sin(a) * speed,
        alpha: 0,
        duration: Phaser.Math.Between(260, 520),
        onComplete: () => spark.destroy(),
      });
    }
  }

  private killBullet(bullet: Ship, group: Phaser.Physics.Arcade.Group): void {
    if (!bullet) return;
    bullet.setActive(false).setVisible(false);
    bullet.body.stop();
    group.killAndHide(bullet);
  }

  private recycleBullets(): void {
    const cull = (group: Phaser.Physics.Arcade.Group) => {
      for (const obj of group.getChildren()) {
        const b = obj as Ship;
        if (!b.active) continue;
        if (b.x < -50 || b.x > WORLD_W + 50 || b.y < -50 || b.y > WORLD_H + 50) {
          this.killBullet(b, group);
        }
      }
    };
    cull(this.playerBullets);
    cull(this.enemyBullets);
  }

  /** Build a repeating star tile used by both parallax layers. */
  private buildStarTexture(): void {
    if (this.textures.exists("star-tile")) return;
    const size = 128;
    const canvas = this.textures.createCanvas("star-tile", size, size);
    if (!canvas) return;
    const ctx = canvas.context;
    ctx.clearRect(0, 0, size, size);
    const palette = ["#ffffff", "#9a92d8", "#3ad1e0", "#f7c948"];
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      const s = Math.random() > 0.85 ? 2 : 1;
      ctx.fillRect(x, y, s, s);
    }
    canvas.refresh();
  }
}
