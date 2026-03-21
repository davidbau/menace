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

    // Logical canvas size (Apple II hi-res)
    this.WIDTH = 280;
    this.HEIGHT = 192;
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
    // Wrap (toroidal) — default mode
    const halfW = this.WIDTH / 2;
    const halfH = this.HEIGHT / 2;

    if (this.penIsDown) {
      const ctx = this._drawCtx;
      ctx.strokeStyle = COLORS[this.penColor] || COLORS[1];
      ctx.lineWidth = this.penWidth;
      ctx.lineCap = 'square';
      ctx.beginPath();
      const [px1, py1] = this._toPixel(this.x, this.y);
      ctx.moveTo(px1, py1);
      const [px2, py2] = this._toPixel(nx, ny);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    }

    // Wrap coordinates
    nx = ((nx + halfW) % this.WIDTH + this.WIDTH) % this.WIDTH - halfW;
    ny = ((ny + halfH) % this.HEIGHT + this.HEIGHT) % this.HEIGHT - halfH;

    this.x = nx;
    this.y = ny;
    this._render();
  }

  // -- Pen --

  penup() { this.penIsDown = false; }
  pendown() { this.penIsDown = true; }

  setpencolor(c) {
    if (typeof c === 'number') {
      this.penColor = Math.abs(Math.floor(c)) % COLORS.length;
    }
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
    ctx.strokeStyle = COLORS[this.penColor] || COLORS[1];
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
    const size = 7;
    const rad = this.heading * Math.PI / 180;
    // Wider isoceles triangle pointing in heading direction
    // Tip at front, base perpendicular to heading, half-width = size * 0.6
    const tip = [px + size * Math.sin(rad), py - size * Math.cos(rad)];
    const baseAngle = Math.PI * 2.4;  // ~140 degrees spread
    const left = [
      px + size * 0.6 * Math.sin(rad - baseAngle),
      py - size * 0.6 * Math.cos(rad - baseAngle),
    ];
    const right = [
      px + size * 0.6 * Math.sin(rad + baseAngle),
      py - size * 0.6 * Math.cos(rad + baseAngle),
    ];

    ctx.fillStyle = '#0f0';
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
