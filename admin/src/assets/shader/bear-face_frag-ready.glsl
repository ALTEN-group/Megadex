// ShaderGun ready export: 2 Vars baked at 0.00s.
#ifdef GL_ES
  precision highp float;
#endif

uniform vec2 uScreenResolution;
uniform float uTime;

// Vars: min max default step; animation is driven internally by uTime.
const float uCuteness = 0.42; // Baked at 0.00s; Var was: 0.0 1.0 0.55 0.01
const float uOutline = 0.02; // Baked at 0.00s; Var was: 0.0 0.04 0.016 0.001

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdEllipse(vec2 p, vec2 r) {
  return (length(p / r) - 1.0) * min(r.x, r.y);
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

// Two-arc lens that preserves outline width while blinking.
float sdLens(vec2 p, float r, float lid) {
  float arcR = (r * r + lid * lid) / (2.0 * lid);
  // Clamp floating-point noise at the fully open position.
  float off = max(arcR - lid, 0.0);
  vec2 q = abs(vec2(p.y, p.x));
  return (q.y - r) * off > q.x * r
    ? length(vec2(q.x, q.y - r))
    : length(vec2(q.x + off, q.y)) - arcR;
}

// Rounded triangle with base centered on the origin and apex at (0, h).
float sdRoundTri(vec2 p, float w, float h, float r) {
  float side = (h * abs(p.x) + w * p.y - w * h) / sqrt(h * h + w * w);
  return smax(side, -p.y, r * 1.5) - r;
}

float fill(float d, float px) {
  return 1.0 - smoothstep(-px, px, d);
}

vec3 paint(vec3 dst, vec3 src, float a) {
  return mix(dst, src, clamp(a, 0.0, 1.0));
}

vec2 rot(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

struct Face {
  float headW;
  float headH;
  float cheek;
  float chin;
  float earSize;
  float earX;
  float earY;
  float eyeX;
  float eyeY;
  float eyeR;
  float irisR;
  float muzzleW;
  float muzzleH;
  float muzzleY;
  float noseY;
  float noseR;
  float noseW;
  float mouthW;
  float mouthY;
  vec3 fur;
  vec3 furDark;
  vec3 patchCol;
  vec3 iris;
  vec3 noseCol;
};

Face fixedFace() {
  Face f;
  f.headW = 0.4374; f.headH = 0.3996; f.cheek = 1.15; f.chin = 0.5682;
  f.earSize = 0.16; f.earX = 0.33; f.earY = 0.26;
  f.eyeX = 0.15; f.eyeY = 0.095; f.eyeR = 0.0962;
  f.irisR = 0.662;
  f.muzzleW = 0.2381; f.muzzleH = 0.172; f.muzzleY = -0.16;
  f.noseY = -0.112; f.noseR = 0.050; f.noseW = 1.3;
  f.mouthW = 0.14; f.mouthY = -0.265;
  f.fur = vec3(0.54, 0.36, 0.24);
  f.furDark = vec3(0.31, 0.20, 0.14);
  f.patchCol = vec3(0.81, 0.65, 0.47);
  f.iris = vec3(0.30, 0.19, 0.13);
  f.noseCol = vec3(0.13, 0.10, 0.11);
  return f;
}

// Parabolic smile arc thickened into a stroke and clipped at half-width.
float mouthArc(vec2 q, float halfW, float sag, float thick) {
  float curve = sag * (q.x * q.x) / (halfW * halfW);
  float slope = 2.0 * sag * q.x / (halfW * halfW);
  float d = abs(q.y - curve) / sqrt(1.0 + slope * slope) - thick;
  return smax(d, abs(q.x) - halfW, 0.02);
}

float earShape(vec2 p, float size) {
  float w = size * 0.68;
  float h = size * 1.5;
  return sdCircle(p - vec2(0.0, h * 0.34), w * 1.02);
}

// Unified skull, cheeks, and chin.
float headField(vec2 p, Face f) {
  float head = sdEllipse(p, vec2(f.headW, f.headH));
  float cheekL = sdEllipse(p - vec2(-f.headW * 0.60, -0.10), vec2(f.headW * 0.44, f.headH * 0.44));
  float cheekR = sdEllipse(p - vec2(f.headW * 0.60, -0.10), vec2(f.headW * 0.44, f.headH * 0.44));
  head = smin(head, min(cheekL, cheekR), 0.11 * f.cheek);
  float chin = sdEllipse(p - vec2(0.0, -f.headH * 0.74), vec2(f.headW * 0.36, f.headH * 0.46 * f.chin));
  return smin(head, chin, 0.10);
}

// Deterministic hashes drive independent, irregular facial animation.
float hash1(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

vec2 hash2(float n) {
  return fract(sin(vec2(n * 127.1, n * 311.7)) * 43758.5453);
}

float wander(float t) {
  float i = floor(t);
  float k = t - i;
  return mix(hash1(i), hash1(i + 1.0), k * k * (3.0 - 2.0 * k));
}

float blinkPulse(float dt, float shut) {
  float u = dt / shut;
  if (u < 0.0 || u > 1.0) return 0.0;
  return pow(sin(3.14159265 * u), 0.45);
}

// Irregular single or double blinks; include the previous slot for overlap.
float blinkAmount(float t) {
  float slot = 3.4;
  float here = floor(t / slot);
  float amount = 0.0;
  for (int k = 0; k < 2; k++) {
    float i = here - float(k);
    float start = i * slot + hash1(i) * (slot - 1.2);
    amount = max(amount, blinkPulse(t - start, 0.22));
    float twice = step(0.72, hash1(i + 0.37));
    amount = max(amount, twice * blinkPulse(t - start - 0.34, 0.19));
  }
  return clamp(amount, 0.0, 1.0);
}

vec2 gazeMark(float i) {
  return (hash2(i) * 2.0 - 1.0) * mix(0.30, 1.0, hash1(i + 5.1));
}

// Fast saccade followed by a held gaze.
vec2 gazeAt(float t) {
  float slot = 1.7;
  float i = floor(t / slot);
  float settle = smoothstep(0.0, 0.11, t - i * slot);
  return mix(gazeMark(i - 1.0), gazeMark(i), settle) * 0.82;
}

// Independent pupil dilation, bounded to retain the brown iris.
float pupilScaleAt(float t) {
  return mix(0.44, 0.60, wander(t / 2.2 + 14.0));
}

// Smile controls lip curl over time.
float smileAt(float t) {
  float drift = 0.62 * wander(t / 2.9) + 0.38 * wander(t / 7.7 + 31.0);
  return mix(0.10, 0.85, smoothstep(0.18, 0.82, drift));
}

// Rise, hold, then ease back.
float earPulse(float dt, float rise, float hold, float fall) {
  if (dt < 0.0) return 0.0;
  if (dt < rise) return smoothstep(0.0, rise, dt);
  if (dt < rise + hold) return 1.0;
  return 1.0 - smoothstep(rise + hold, rise + hold + fall, dt);
}

// Shared ear events; side is -1 left, +1 right, used only for lone turns.
float earTurnAt(float t, float side) {
  float slot = 5.0;
  float here = floor(t / slot);
  float turn = 0.0;
  for (int k = 0; k < 2; k++) {
    float i = here - float(k);
    float happens = step(0.34, hash1(i + 7.3));
    float start = i * slot + hash1(i) * (slot - 1.0);
    float dir = mix(-1.0, 1.0, step(0.5, hash1(i + 11.7)));

    float quick = step(0.72, hash1(i + 23.9));
    float hold = mix(mix(1.3, 3.4, hash1(i + 29.3)), 0.05, quick);
    float rise = mix(0.16, 0.07, quick);
    float fall = mix(0.55, 0.26, quick);
    float strength = mix(0.38, 0.82, hash1(i + 17.1)) * mix(1.0, 1.20, quick);

    float lone = step(0.74, hash1(i + 31.1));
    float which = mix(-1.0, 1.0, step(0.5, hash1(i + 37.7)));
    float takes = mix(1.0, step(0.0, side * which), lone);

    turn += happens * takes * dir * strength * earPulse(t - start, rise, hold, fall);
  }
  return clamp(turn, -1.0, 1.0);
}

void main() {
  // Keep the background in frame space and draw the face enlarged.
  const float zoom = 1.75;
  // Shift the face down so the ears stay inside the round frame at this zoom.
  const float dropY = 0.17;
  vec2 frame = 2.0 * (gl_FragCoord.xy - 0.5 * uScreenResolution.xy) / uScreenResolution.y;
  vec2 uv = (frame + vec2(0.0, dropY)) / zoom;
  float px = 1.6 / (uScreenResolution.y * zoom);

  Face f = fixedFace();

  // Read the ground before the face, so the corners can answer with it alone.
  float r = length(frame);
  vec3 bg = mix(vec3(0.09, 0.12, 0.17), vec3(0.15, 0.21, 0.27), smoothstep(-1.0, 1.0, frame.y));
  bg += 0.12 * exp(-r * 1.3) * mix(f.fur, vec3(1.0), 0.45);

  // Skip the unused corners; the 1.02 radius covers the crop's antialiased rim.
  if (r > 1.02) {
    gl_FragColor = vec4(bg, 1.0);
    return;
  }

  float cute = clamp(uCuteness, 0.0, 1.0);
  f.eyeR *= mix(0.82, 1.22, cute);
  f.irisR = clamp(f.irisR * mix(0.92, 1.06, cute), 0.0, 0.92);
  f.headW *= mix(0.96, 1.05, cute);
  f.headH *= mix(0.97, 1.06, cute);
  f.chin *= mix(1.10, 0.86, cute);
  f.muzzleW *= mix(1.12, 0.88, cute);
  f.muzzleH *= mix(1.12, 0.86, cute);
  f.noseY *= mix(1.06, 0.94, cute);

  // Optical centering within a round crop.
  vec2 p = uv - vec2(0.0, 0.01);

  float turnL = earTurnAt(uTime, -1.0);
  float turnR = earTurnAt(uTime, 1.0);
  vec2 pEarL = rot(p - vec2(-f.earX, f.earY), -turnL * 0.22);
  vec2 pEarR = rot(p - vec2(f.earX, f.earY), turnR * 0.22);
  float earL = earShape(pEarL, f.earSize);
  float earR = earShape(pEarR, f.earSize);
  float body = smin(headField(p, f), min(earL, earR), 0.035);

  // Nothing is drawn past the ink line, so skip the face and its clocks.
  if (body > uOutline + 2.0 * px) {
    gl_FragColor = vec4(bg, 1.0);
    return;
  }

  vec2 look = gazeAt(uTime);
  float blink = blinkAmount(uTime);

  vec2 eyePosL = vec2(-f.eyeX, f.eyeY);
  vec2 eyePosR = vec2(f.eyeX, f.eyeY);

  vec3 ink = vec3(0.08, 0.07, 0.10);
  vec3 color = bg;

  float bodyMask = fill(body, px);
  color = paint(color, ink, fill(body - uOutline, px));

  float lift = smoothstep(-f.headH * 1.1, f.headH * 1.5, p.y);
  vec3 furCol = mix(f.furDark, f.fur, 0.34 + 0.66 * lift);
  color = paint(color, furCol, bodyMask);

  float innerL = earShape(pEarL, f.earSize * 0.56);
  float innerR = earShape(pEarR, f.earSize * 0.56);
  vec3 innerCol = mix(f.furDark, f.noseCol, 0.55);
  color = paint(color, innerCol, fill(min(innerL, innerR), px) * bodyMask);

  float patchD = sdEllipse(p - vec2(0.0, f.muzzleY), vec2(f.muzzleW, f.muzzleH));
  color = paint(color, f.patchCol, fill(patchD, px) * bodyMask * 0.96);

  // Eyes and lids.
  float lid = f.eyeR * mix(1.0, 0.05, blink);
  float eyeL = sdLens(p - eyePosL, f.eyeR, lid);
  float eyeRd = sdLens(p - eyePosR, f.eyeR, lid);
  color = paint(color, ink, fill(min(eyeL, eyeRd) - 0.012, px));
  vec3 sclera = vec3(0.97, 0.97, 0.99);
  float fillEyeL = fill(eyeL, px);
  float fillEyeR = fill(eyeRd, px);
  color = paint(color, sclera, fillEyeL);
  color = paint(color, sclera, fillEyeR);

  vec2 gaze = look * vec2(f.eyeR * 0.32, f.eyeR * 0.26);
  float irisRad = f.eyeR * f.irisR;
  float irisL = smax(sdCircle(p - eyePosL - gaze, irisRad), eyeL, 0.006);
  float irisRd = smax(sdCircle(p - eyePosR - gaze, irisRad), eyeRd, 0.006);
  color = paint(color, f.iris, fill(irisL, px));
  color = paint(color, f.iris, fill(irisRd, px));

  float pupilRad = irisRad * pupilScaleAt(uTime);
  float pupilL = smax(sdCircle(p - eyePosL - gaze, pupilRad), eyeL, 0.004);
  float pupilRd = smax(sdCircle(p - eyePosR - gaze, pupilRad), eyeRd, 0.004);
  color = paint(color, vec3(0.05, 0.04, 0.06), fill(pupilL, px));
  color = paint(color, vec3(0.05, 0.04, 0.06), fill(pupilRd, px));

  vec2 sparkA = vec2(-0.35, 0.38) * f.eyeR;
  vec2 sparkB = vec2(0.30, -0.34) * f.eyeR;
  float sparkBig = f.eyeR * 0.20;
  float sparkSmall = f.eyeR * 0.10;
  float glint = min(
    min(sdCircle(p - eyePosL - gaze - sparkA, sparkBig),
        sdCircle(p - eyePosR - gaze - sparkA, sparkBig)),
    min(sdCircle(p - eyePosL - gaze - sparkB, sparkSmall),
        sdCircle(p - eyePosR - gaze - sparkB, sparkSmall))
  );
  float eyeMask = max(fillEyeL, fillEyeR);
  color = paint(color, vec3(1.0), fill(glint, px) * eyeMask * (1.0 - blink));

  // Mouth: vertical stem from the nose joined to two smile arcs.
  float smile = smileAt(uTime);
  float smileAmount = (0.35 + smile) / 0.9;
  float halfW = f.mouthW * 0.5;
  float sag = (0.037 + 0.20 * halfW) * smileAmount * 0.58;
  float mouthThick = 0.012 + 0.02 * halfW;
  float mouthArcs = mouthArc(
    vec2(abs(p.x) - halfW, p.y - f.mouthY),
    halfW,
    sag,
    mouthThick
  );

  vec2 stemTop = vec2(0.0, f.noseY - f.noseR * 0.6);
  vec2 stemBottom = vec2(0.0, f.mouthY + sag);
  float stem = sdCapsule(p, stemTop, stemBottom, mouthThick);
  float mouth = smin(mouthArcs, stem, 0.008);
  color = paint(color, mix(ink, f.noseCol, 0.25), fill(mouth, px) * bodyMask);

  // Nose painted over the top of the mouth stem.
  vec2 pn = p - vec2(0.0, f.noseY);
  float nose = sdRoundTri(vec2(pn.x, -pn.y), f.noseR * f.noseW, f.noseR * 1.5, f.noseR * 0.5);
  color = paint(color, f.noseCol, fill(nose, px) * bodyMask);
  color = paint(color, vec3(1.0), fill(sdCircle(pn - vec2(-f.noseR * 0.4, f.noseR * 0.1), f.noseR * 0.22), px) * 0.5);

  gl_FragColor = vec4(color, 1.0);
}
