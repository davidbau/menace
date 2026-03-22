// Turtle graphics — draws on a <canvas> behind the text terminal.
// Canvas is 280×192 logical pixels (Apple II hi-res resolution),
// scaled up with CSS image-rendering: pixelated.

// Apple II hi-res color palette
const COLORS = [
  '#000000', // 0 black
  '#ffffff', // 1 white
  '#00dd00', // 2 green
  '#dd00dd', // 3 violet/magenta
  '#ff8800', // 4 orange
  '#0000dd', // 5 blue
  '#00dddd', // 6 cyan (bonus)
  '#dddd00', // 7 yellow (bonus)
];

export class Turtle {
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');

    // Logical canvas size (320×200, period-appropriate retro resolution)
    this.WIDTH = 320;
    this.HEIGHT = 200;
    canvas.width = this.WIDTH;
    canvas.height = this.HEIGHT;

    // Turtle state
    this.x = 0;       // Logo coords: (0,0) = center
    this.y = 0;
    this.heading = 0;  // degrees, 0 = north, clockwise
    this.penIsDown = true;
    this.penColor = 2; // index into COLORS (2 = green)
    this.penWidth = 1;
    this.visible = true;

    // Save the drawing layer separately from turtle cursor
    this._drawCanvas = document.createElement('canvas');
    this._drawCanvas.width = this.WIDTH;
    this._drawCanvas.height = this.HEIGHT;
    this._drawCtx = this._drawCanvas.getContext('2d');
    this._drawCtx.imageSmoothingEnabled = false;

    this._ctx.imageSmoothingEnabled = false;
    this._render();
  }

  // Convert Logo coords to canvas pixels
  _toPixel(lx, ly) {
    return [
      Math.round(this.WIDTH / 2 + lx),
      Math.round(this.HEIGHT / 2 - ly),
    ];
  }

  // -- Movement --

  forward(dist) {
    const rad = (this.heading - 90) * Math.PI / 180;
    const dx = dist * Math.cos(rad);
    const dy = dist * Math.sin(rad);
    const nx = this.x + dx;
    const ny = this.y - dy; // Y inverted: heading 0 (north) = -dy in screen
    // Actually: heading 0 = north = +y in Logo.
    // rad for heading 0: (0-90)*pi/180 = -pi/2, cos=-0, sin=-1
    // Rethink: heading h means direction h degrees clockwise from north.
    // In Logo coords (math): angle from +y axis, clockwise.
    // dx = dist * sin(h), dy = dist * cos(h)
    const rad2 = this.heading * Math.PI / 180;
    const nx2 = this.x + dist * Math.sin(rad2);
    const ny2 = this.y + dist * Math.cos(rad2);
    this._moveTo(nx2, ny2);
  }

  back(dist) {
    this.forward(-dist);
  }

  right(angle) {
    this.heading = (this.heading + angle) % 360;
    if (this.heading < 0) this.heading += 360;
    this._render();
  }

  left(angle) {
    this.right(-angle);
  }

  _moveTo(nx, ny) {
    const halfW = this.WIDTH / 2;
    const halfH = this.HEIGHT / 2;
    const ctx = this._drawCtx;

    if (this.penIsDown) {
      ctx.strokeStyle = this.penColorCSS();
      ctx.lineWidth = this.penWidth;
      ctx.lineCap = 'square';
    }

    // Walk from current position to target, wrapping at edges
    let cx = this.x, cy = this.y;
    let dx = nx - cx, dy = ny - cy;
    let remaining = 1.0; // fraction of total move remaining

    for (let safety = 0; safety < 100 && remaining > 0.0001; safety++) {
      // Find the earliest edge crossing (as fraction t of remaining move)
      let tMin = remaining;
      // Check all four edges
      if (dx > 0) { const t = (halfW - cx) / dx; if (t > 0 && t < tMin) tMin = t; }
      if (dx < 0) { const t = (-halfW - cx) / dx; if (t > 0 && t < tMin) tMin = t; }
      if (dy > 0) { const t = (halfH - cy) / dy; if (t > 0 && t < tMin) tMin = t; }
      if (dy < 0) { const t = (-halfH - cy) / dy; if (t > 0 && t < tMin) tMin = t; }

      // Draw segment from cx,cy to cx+dx*tMin, cy+dy*tMin
      const ex = cx + dx * tMin;
      const ey = cy + dy * tMin;

      if (this.penIsDown) {
        const [px1, py1] = this._toPixel(cx, cy);
        const [px2, py2] = this._toPixel(ex, ey);
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.stroke();
      }

      remaining -= tMin;
      if (remaining <= 0.0001) {
        // Reached target within bounds — wrap final position
        cx = ex; cy = ey;
        break;
      }

      // Wrap at the edge we hit
      cx = ex; cy = ey;
      if (cx >= halfW) cx = -halfW + 0.01;
      else if (cx <= -halfW) cx = halfW - 0.01;
      if (cy >= halfH) cy = -halfH + 0.01;
      else if (cy <= -halfH) cy = halfH - 0.01;
    }

    // Final wrap
    this.x = ((cx + halfW) % this.WIDTH + this.WIDTH) % this.WIDTH - halfW;
    this.y = ((cy + halfH) % this.HEIGHT + this.HEIGHT) % this.HEIGHT - halfH;
    this._render();
  }

  // -- Pen --

  penup() { this.penIsDown = false; }
  pendown() { this.penIsDown = true; }

  setpencolor(c) {
    if (typeof c === 'number') {
      this.penColor = Math.abs(Math.floor(c)) % COLORS.length;
      this._penCSS = null; // use palette
    } else if (typeof c === 'string') {
      // Accept any CSS color name or hex: "purple", "#0FF", "rgb(255,0,0)"
      this._penCSS = c;
    }
  }

  // Get the current pen color as a CSS string
  penColorCSS() {
    return this._penCSS || COLORS[this.penColor] || COLORS[1];
  }

  setpensize(w) {
    this.penWidth = Math.max(1, Math.floor(w));
  }

  // -- Position --

  home() {
    this._moveTo(0, 0);
    this.heading = 0;
    this._render();
  }

  clearscreen() {
    this._drawCtx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
    this.x = 0;
    this.y = 0;
    this.heading = 0;
    this.penIsDown = true;
    this._render();
  }

  setpos(x, y) {
    this._moveTo(x, y);
  }

  setx(x) { this._moveTo(x, this.y); }
  sety(y) { this._moveTo(this.x, y); }

  setheading(h) {
    this.heading = h % 360;
    if (this.heading < 0) this.heading += 360;
    this._render();
  }

  towards(tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    // atan2 from north, clockwise
    let angle = Math.atan2(dx, dy) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    return angle;
  }

  xcor() { return this.x; }
  ycor() { return this.y; }
  getHeading() { return this.heading; }
  pos() { return [this.x, this.y]; }
  ispendown() { return this.penIsDown; }

  showturtle() { this.visible = true; this._render(); }
  hideturtle() { this.visible = false; this._render(); }
  shownp() { return this.visible; }

  // -- Arc --

  arc(angle, radius) {
    const [cx, cy] = this._toPixel(this.x, this.y);
    const ctx = this._drawCtx;
    ctx.strokeStyle = this.penColorCSS();
    ctx.lineWidth = this.penWidth;
    // Starting angle: turtle's heading converted to canvas angle
    // Canvas: 0 = right, clockwise. Logo heading: 0 = north (up).
    // Canvas angle for Logo heading h: (h - 90) * pi / 180
    const startAngle = (this.heading - 90) * Math.PI / 180;
    const endAngle = startAngle + angle * Math.PI / 180;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle, angle < 0);
    ctx.stroke();
    this._render();
  }

  // -- Render to visible canvas --

  _render() {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
    // Draw the accumulated drawing
    ctx.drawImage(this._drawCanvas, 0, 0);
    // Draw turtle cursor
    if (this.visible) {
      this._drawTurtle(ctx);
    }
  }

  _drawTurtle(ctx) {
    const [px, py] = this._toPixel(this.x, this.y);
    const len = 10;   // tip to center distance
    const half = 4;   // half-width at base
    const rad = this.heading * Math.PI / 180;
    // Pointy isoceles triangle: long tip forward, narrow base behind
    const tip = [px + len * Math.sin(rad), py - len * Math.cos(rad)];
    const backDist = len * 0.45;
    const perpX = Math.cos(rad);  // perpendicular to heading
    const perpY = Math.sin(rad);
    const bx = px - backDist * Math.sin(rad);
    const by = py + backDist * Math.cos(rad);
    const left = [bx - half * perpX, by - half * perpY];
    const right = [bx + half * perpX, by + half * perpY];

    // Turtle color matches pen color (gray if black/invisible)
    var color = this.penColorCSS();
    if (color === '#000000' || color === 'black') color = '#888';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.lineTo(left[0], left[1]);
    ctx.lineTo(right[0], right[1]);
    ctx.closePath();
    ctx.fill();
  }

  // Color count for SETPENCOLOR
  colorCount() { return COLORS.length; }
}
