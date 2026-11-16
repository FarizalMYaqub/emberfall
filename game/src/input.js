// Keyboard + mouse state, translated into game intent.
// The canvas owns the listeners; the game reads a plain snapshot each frame.

export const KEY = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  dash: ['Space', 'ShiftLeft', 'ShiftRight'],
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const input = {
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mouseClicked: false,
    moveX: 0,
    moveY: 0,
    dashQueued: false,
  };

  function toLocal(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    pressed.add(event.code);
    if (KEY.dash.includes(event.code)) input.dashQueued = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    input.mouseDown = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = toLocal(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = toLocal(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseDown = true;
    input.mouseClicked = true;
    if (event.button === 0) event.preventDefault();
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function held(codes) {
    return codes.some((code) => keys.has(code));
  }

  // Read the intent for this frame. `consumeClick` clears the click edge.
  input.poll = function poll() {
    let x = 0;
    let y = 0;
    if (held(KEY.left)) x -= 1;
    if (held(KEY.right)) x += 1;
    if (held(KEY.up)) y -= 1;
    if (held(KEY.down)) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    input.moveX = x;
    input.moveY = y;
    return input;
  };

  input.wasPressed = function wasPressed(code) {
    return pressed.has(code);
  };

  input.endFrame = function endFrame() {
    pressed.clear();
    input.mouseClicked = false;
    input.dashQueued = false;
  };

  return input;
}
