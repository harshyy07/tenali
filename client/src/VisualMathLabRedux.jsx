/**
 * VisualMathLabRedux.jsx – Premium EdTech Visual Math Lab
 * Duolingo / Khan Academy Kids quality
 * Requires: framer-motion, canvas-confetti
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const API = '/api';

/* ── Colour tokens ─────────────────────────────────────────────── */
const C = {
  bg: '#181512', card: '#2D2520', border: '#4A4038',
  orange: '#F08C46', orange2: '#F08C46', blue: '#4F8DFF',
  green: '#22C55E', red: '#EF4444', white: '#F4F1ED', muted: '#988D84',
};
const FONT = "'Inter', system-ui, sans-serif";

/* ── Timer ─────────────────────────────────────────────────────── */
function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);
  const start = () => { setElapsed(0); clearInterval(ref.current); ref.current = setInterval(() => setElapsed(e => e + 1), 1000); };
  const stop  = () => { const v = elapsed; clearInterval(ref.current); return v; };
  const reset = () => { clearInterval(ref.current); setElapsed(0); };
  useEffect(() => () => clearInterval(ref.current), []);
  return { elapsed, start, stop, reset };
}

/* ── Confetti ──────────────────────────────────────────────────── */
function fireConfetti() {
  const end = Date.now() + 1600;
  const colors = ['#F97316','#FF9A44','#22C55E','#4F8DFF','#F8F7F5'];
  (function frame() {
    confetti({ particleCount: 5, angle: 60,  spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/* ── Floating BG symbols ───────────────────────────────────────── */
const BG_SYMS = ['×','÷','+','=','%','π','√','∑','3','5','9'];
function FloatingBg() {
  const items = useRef(Array.from({ length: 16 }, (_, i) => ({
    id: i, sym: BG_SYMS[i % BG_SYMS.length],
    x: Math.random() * 100, y: Math.random() * 100,
    size: 11 + Math.random() * 18, delay: Math.random() * 8, dur: 12 + Math.random() * 10,
  }))).current;
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {items.map(s => (
        <motion.div key={s.id}
          style={{ position:'absolute', left:`${s.x}%`, top:`${s.y}%`, fontSize:s.size, color:'rgba(249,115,22,0.04)', fontFamily:FONT, fontWeight:700, userSelect:'none' }}
          animate={{ y:[0,-28,0], opacity:[0.3,0.8,0.3] }}
          transition={{ duration:s.dur, delay:s.delay, repeat:Infinity, ease:'easeInOut' }}>
          {s.sym}
        </motion.div>
      ))}
    </div>
  );
}

/* ── XP Popup ──────────────────────────────────────────────────── */
function XPPopup({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y:0, opacity:1, scale:0.8 }} animate={{ y:-90, opacity:0, scale:1.3 }} exit={{ opacity:0 }}
          transition={{ duration:1.3, ease:'easeOut' }}
          style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)', fontSize:'1.7rem', fontWeight:900, color:C.orange, textShadow:`0 0 20px rgba(249,115,22,0.9)`, fontFamily:FONT, zIndex:100, pointerEvents:'none', whiteSpace:'nowrap' }}>
          +10 XP ⭐
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RibbonPopup({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y:-150, opacity:0, x:'-50%' }}
          animate={{ y:0, opacity:1, x:'-50%' }}
          exit={{ y:-150, opacity:0, x:'-50%' }}
          transition={{ type:'spring', stiffness:200, damping:16 }}
          style={{ position:'fixed', top:0, left:'50%', zIndex:9999, pointerEvents:'none' }}
        >
          <div style={{ background:'linear-gradient(135deg, #10b981, #059669)', padding:'14px 70px', borderRadius:'0 0 30px 30px', boxShadow:'0 15px 40px rgba(16, 185, 129, 0.5)', border:'2px solid rgba(255,255,255,0.3)', borderTop:'none', color:'white', fontSize:'2rem', fontWeight:900, fontFamily:FONT, display:'flex', alignItems:'center', gap:'16px', textShadow:'0 3px 6px rgba(0,0,0,0.3)' }}>
            <span>🏅</span> BRILLIANT! <span>🏅</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── SVG Frog ──────────────────────────────────────────────────── */
function FrogSVG({ size = 80, happy, sad }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <ellipse cx="50" cy="62" rx="30" ry="26" fill="#4ADE80"/>
      <ellipse cx="50" cy="60" rx="26" ry="22" fill="#22C55E"/>
      <ellipse cx="50" cy="66" rx="16" ry="14" fill="#BBF7D0" opacity="0.7"/>
      {/* Eyes */}
      <ellipse cx="34" cy="42" rx="10" ry="11" fill="#4ADE80"/>
      <ellipse cx="34" cy="42" rx="8"  ry="9"  fill="#16A34A"/>
      <circle  cx="34" cy="42" r="5"   fill="white"/>
      <circle  cx={happy?35:33} cy="42" r="3" fill="#1C1815"/>
      <circle  cx="36" cy="40" r="1.2" fill="white"/>
      <ellipse cx="66" cy="42" rx="10" ry="11" fill="#4ADE80"/>
      <ellipse cx="66" cy="42" rx="8"  ry="9"  fill="#16A34A"/>
      <circle  cx="66" cy="42" r="5"   fill="white"/>
      <circle  cx={happy?67:65} cy="42" r="3" fill="#1C1815"/>
      <circle  cx="68" cy="40" r="1.2" fill="white"/>
      {/* Mouth */}
      {happy ? <path d="M40 70 Q50 80 60 70" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
             : sad ? <path d="M40 76 Q50 68 60 76" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
             : <path d="M42 72 Q50 76 58 72" stroke="#166534" strokeWidth="2" strokeLinecap="round" fill="none"/>}
      {/* Legs */}
      <ellipse cx="24" cy="78" rx="10" ry="6" fill="#4ADE80" transform="rotate(-20 24 78)"/>
      <ellipse cx="76" cy="78" rx="10" ry="6" fill="#4ADE80" transform="rotate(20 76 78)"/>
    </svg>
  );
}

/* ── Frog Jump Template ─────────────────────────────────────────── */
export function FrogJumpTemplate({ q, ans, setAns, revealed }) {
  const total  = q.jumps * q.step;
  const maxNum = total + q.step;
  const nums   = Array.from({ length: maxNum + 1 }, (_, i) => i);
  const trackRef    = useRef(null);
  const [tw, setTw] = useState(0);
  const [frogPos, setFrogPos]   = useState(0);
  const [ghostPos, setGhostPos] = useState(null);
  const [isDrag, setIsDrag]     = useState(false);
  const [jumps, setJumps]       = useState(0);
  const [animating, setAnimating] = useState(false);
  const [visited, setVisited]   = useState([0]);

  useEffect(() => {
    const m = () => { if (trackRef.current) setTw(trackRef.current.offsetWidth); };
    m(); window.addEventListener('resize', m);
    return () => window.removeEventListener('resize', m);
  }, []);

  useEffect(() => {
    setFrogPos(0); setGhostPos(null); setJumps(0); setAnimating(false); setVisited([0]);
  }, [q.id]);

  const n2x = n => tw ? (n / maxNum) * tw : 0;
  const x2n = x => Math.max(0, Math.min(maxNum, Math.round((x / tw) * maxNum)));

  const animateJumps = useCallback(async (target) => {
    const numJumps = q.jumps;
    setAnimating(true);
    const v = [0];
    for (let j = 1; j <= numJumps; j++) {
      await new Promise(r => setTimeout(r, 450));
      const pos = j * q.step;
      setFrogPos(pos); setJumps(j); v.push(pos); setVisited([...v]);
    }
    setAnimating(false);
  }, [q]);

  useEffect(() => {
    if (revealed) {
      setFrogPos(0);
      setJumps(0);
      setVisited([0]);
      const t = setTimeout(() => animateJumps(total), 400);
      return () => clearTimeout(t);
    }
  }, [revealed, animateJumps, total]);

  return (
    <div style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:'18px' }}>
      {/* Environment */}
      <div style={{ width:'100%', background:'linear-gradient(180deg,#3D322B 0%,#1D1815 100%)', borderRadius:'20px', padding:'28px 20px 36px', position:'relative', overflow:'hidden', boxShadow:'0 15px 40px rgba(0,0,0,0.5)', border:'2px solid rgba(240,140,70,0.25)' }}>
        {/* Sky details */}
        {[{l:4,t:4,s:1.1},{l:52,t:6,s:0.8},{l:74,t:3,s:1}].map((c,i)=>(
          <motion.div key={i} style={{position:'absolute',left:`${c.l}%`,top:`${c.t}%`,fontSize:`${c.s*2.2}rem`,opacity:0.3}} animate={{x:[0,18,0]}} transition={{duration:12+i*3,repeat:Infinity,ease:'easeInOut'}}>☁️</motion.div>
        ))}
        <div style={{position:'absolute',top:'6%',right:'4%',fontSize:'2rem',opacity:0.4}}>☀️</div>
        {[8,32,58,84].map((l,i)=>(
          <div key={i} style={{position:'absolute',bottom:'22px',left:`${l}%`,fontSize:'1.1rem',opacity:0.55}}>
            {['🌸','🌼','🌺','🌻'][i]}
          </div>
        ))}

        {/* Frog layer */}
        <div style={{ position:'relative', height:'100px' }}>
          {/* Ghost preview */}
          {ghostPos !== null && !animating && (
            <div style={{ position:'absolute', bottom:0, left:0, transform:`translateX(${n2x(ghostPos)-28}px)`, opacity:0.35, pointerEvents:'none' }}>
              <FrogSVG size={56}/>
              <div style={{textAlign:'center',fontSize:'0.75rem',color:'#F08C46',fontWeight:700,marginTop:'-4px', textShadow:'0 2px 4px rgba(0,0,0,0.8)'}}>
                {ghostPos}
              </div>
            </div>
          )}

          {/* Real frog (draggable) */}
          <motion.div
            drag={!revealed && !animating ? 'x' : false}
            dragConstraints={trackRef}
            dragElastic={0.05}
            onDragStart={() => setIsDrag(true)}
            onDrag={(_, info) => {
              if (!trackRef.current) return;
              const rect = trackRef.current.getBoundingClientRect();
              const x = info.point.x - rect.left;
              setGhostPos(x2n(x));
            }}
            onDragEnd={(_, info) => {
              setIsDrag(false);
              if (!trackRef.current) return;
              const rect = trackRef.current.getBoundingClientRect();
              const x    = info.point.x - rect.left;
              setGhostPos(null);
              const droppedOn = x2n(x);
              setFrogPos(droppedOn);
              setAns(String(droppedOn));
            }}
            animate={{
              x: n2x(frogPos) - 28,
              y: animating ? [0,-42,0] : 0,
              rotate: isDrag ? 14 : 0,
              scale:  isDrag ? 1.18 : 1,
            }}
            transition={{
              x: { type:'spring', stiffness:180, damping:18 },
              y: { duration:0.38, times:[0,0.45,1] },
            }}
            style={{ position:'absolute', bottom:0, left:0, cursor: revealed?'default':'grab', userSelect:'none',
              filter: revealed ? 'drop-shadow(0 0 14px rgba(240,140,70,0.9))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.45))' }}>
            <motion.div animate={{ y:[0,-6,0] }} transition={{ duration:2.2, repeat:Infinity, ease:'easeInOut' }}>
              <FrogSVG size={60}
                happy={revealed && String(frogPos)===String(q.answer)}
                sad={revealed && String(frogPos)!==String(q.answer)}/>
            </motion.div>
          </motion.div>
        </div>

        {/* Jump arc SVG */}
        <svg style={{ position:'absolute', bottom:'26px', left:'20px', width:'calc(100% - 40px)', height:'80px', overflow:'visible', pointerEvents:'none' }}>
          {Array.from({ length: jumps }).map((_, i) => {
            const x1 = (i * q.step / maxNum) * (tw || 300);
            const x2 = ((i+1)*q.step/maxNum) * (tw || 300);
            const mx = (x1+x2)/2;
            return (
              <motion.path key={i} d={`M${x1},78 Q${mx},10 ${x2},78`}
                fill="none" stroke="#F08C46" strokeWidth="2.5" strokeDasharray="6 4"
                initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:0.75 }}
                transition={{ duration:0.35 }}/>
            );
          })}
        </svg>

        {/* Number line */}
        <div ref={trackRef} style={{ position:'relative', width:'100%', height:'38px' }}>
          <div style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', left:0, right:0, height:'4px', background:'#F08C46', borderRadius:'2px', zIndex:1 }}/>
          {nums.map(n => {
            const isV = visited.includes(n);
            const isC = n === frogPos;
            const isT = revealed && n === total;
            return (
              <div key={n} style={{ position:'absolute', left:`${(n/maxNum)*100}%`, top:'50%', transform:'translate(-50%, -50%)', display:'flex', flexDirection:'column', alignItems:'center', zIndex:2 }}>
                <motion.div
                  animate={{ scale: isC?1.35:1, background: isT?C.orange : isV?C.orange:'#2D2520' }}
                  style={{ width:n%2===0?24:16, height:n%2===0?24:16, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    border: isC?'2px solid #F6D365':isV?'2px solid #F08C46':'2px solid rgba(240,140,70,0.3)',
                    boxShadow: isC?'0 0 14px rgba(246,211,101,0.9)':'none',
                    fontSize:'0.58rem', fontWeight:800, color: isV||isT?'white':'rgba(240,140,70,0.8)' }}
                  transition={{ duration:0.3 }}>
                  {n%2===0 ? n : ''}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Jump counter pills */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center' }}>
        {Array.from({ length: q.jumps }).map((_, i) => (
          <motion.div key={i}
            animate={{ background: i<jumps?'rgba(240,140,70,0.25)':'rgba(255,255,255,0.05)', borderColor: i<jumps?C.orange:'rgba(255,255,255,0.1)' }}
            style={{ padding:'6px 14px', borderRadius:'20px', border:'2px solid', fontSize:'0.88rem', fontWeight:700, color: i<jumps?C.orange:C.muted, fontFamily:FONT }}
            transition={{ duration:0.3 }}>
            Jump {i+1}: +{q.step}
          </motion.div>
        ))}
      </div>

      {/* Hint / current pos */}
      {frogPos === 0 && !revealed && (
        <motion.p animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:2, repeat:Infinity }}
          style={{ color:C.muted, fontSize:'0.9rem', fontFamily:FONT, textAlign:'center', margin:0 }}>
          🐸 Drag Freddy to where he'll land after {q.jumps} jumps!
        </motion.p>
      )}
      {frogPos > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:'10px', background:'rgba(34,197,94,0.08)', border:'2px solid rgba(34,197,94,0.25)', borderRadius:'14px', padding:'10px 22px' }}>
          <span style={{ color:C.muted, fontSize:'0.88rem', fontFamily:FONT }}>Freddy is at:</span>
          <span style={{ color:'#4ade80', fontSize:'1.9rem', fontWeight:900, fontFamily:FONT }}>{frogPos}</span>
        </div>
      )}
    </div>
  );
}

/* ── Math Machine Template ─────────────────────────────────────── */
export function MathMachineTemplate({ q, ans, setAns, revealed }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', padding:'8px 0' }}>
      {/* Input */}
      <motion.div initial={{ y:-36, opacity:0 }} animate={{ y:0, opacity:1 }}
        transition={{ type:'spring', stiffness:280, damping:20 }}
        style={{ width:'88px', height:'88px', background:'linear-gradient(135deg,#5B5048,#463B34)', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.6rem', fontWeight:900, color:'white', fontFamily:FONT, boxShadow:'0 10px 28px rgba(0,0,0,0.5)', border:'3px solid #F08C46' }}>
        {q.input}
      </motion.div>

      <motion.div animate={{ y:[0,8,0] }} transition={{ duration:1.5, repeat:Infinity }} style={{ color:'#F08C46', fontSize:'1.7rem', lineHeight:1 }}>↓</motion.div>

      {/* Machine body */}
      <motion.div initial={{ scale:0.85, opacity:0 }} animate={{ scale:1, opacity:1 }}
        transition={{ type:'spring', stiffness:200, damping:15, delay:0.2 }}
        style={{ background:'#2D2520', border:'4px solid #5B5048', borderRadius:'24px', padding:'18px 30px', display:'flex', alignItems:'center', gap:'14px', boxShadow:'0 0 40px rgba(0,0,0,0.5)', position:'relative' }}>
        <div style={{ position:'absolute', inset:-1, borderRadius:'24px', background:'linear-gradient(135deg,rgba(240,140,70,0.12),transparent)', pointerEvents:'none' }}/>
        <motion.span style={{ fontSize:'2.6rem' }} animate={{ rotate:360 }} transition={{ duration:4, repeat:Infinity, ease:'linear' }}>⚙️</motion.span>
        <div style={{ background:'#181512', border:'2px inset #4A4038', borderRadius:'12px', padding:'8px 18px', textAlign:'center' }}>
          <div style={{ fontSize:'0.65rem', fontFamily:FONT, color:'#A89C93', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Function</div>
          <div style={{ fontSize:'2.1rem', fontWeight:900, fontFamily:FONT, color:'#F08C46', textShadow:'0 0 12px rgba(240,140,70,0.8)' }}>×{q.multiplier}</div>
        </div>
        <motion.span style={{ fontSize:'2.6rem' }} animate={{ rotate:-360 }} transition={{ duration:3, repeat:Infinity, ease:'linear' }}>⚙️</motion.span>
      </motion.div>

      <motion.div animate={{ y:[0,8,0] }} transition={{ duration:1.5, repeat:Infinity, delay:0.3 }} style={{ color:'#F08C46', fontSize:'1.7rem', lineHeight:1 }}>↓</motion.div>

      {/* Output */}
      <motion.div
        animate={{ scale: revealed?1:0.85, opacity: revealed?1:0.55,
          background: revealed?'linear-gradient(135deg,#F08C46,#D97706)':'#463B34',
          boxShadow: revealed?'0 10px 28px rgba(240,140,70,0.5)':'0 10px 28px rgba(0,0,0,0.4)',
          border: revealed?'3px solid rgba(255,255,255,0.2)':'3px dashed #F08C46' }}
        transition={{ type:'spring', stiffness:280, damping:20 }}
        style={{ width:'88px', height:'88px', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.6rem', fontWeight:900, color:'white', fontFamily:FONT }}>
        {revealed ? q.answer : '?'}
      </motion.div>
    </div>
  );
}

/* ── Plant Arrays ──────────────────────────────────────────────── */
export function PlantArrayTemplate({ q, ans, setAns, revealed }) {
  const [planted, setPlanted] = useState([]);
  const total = q.rows * q.cols;
  useEffect(() => setPlanted([]), [q.id]);
  const plant = i => { if (revealed) return; setPlanted(p => p.includes(i)?p.filter(x=>x!==i):[...p,i]); };
  return (
    <div style={{ background:'linear-gradient(135deg,#3D322B,#1D1815)', borderRadius:'20px', padding:'26px 22px', display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', boxShadow:'0 15px 40px rgba(0,0,0,0.5)', border:'2px solid rgba(240,140,70,0.25)' }}>
      <p style={{ color:'#F08C46', fontFamily:FONT, fontWeight:700, margin:0, fontSize:'0.9rem' }}>
        {revealed ? `✅ ${total} plants!` : '👆 Tap each patch to plant a seed!'}
      </p>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${q.cols},1fr)`, gap:'10px', background:'rgba(0,0,0,0.2)', padding:'14px', borderRadius:'14px' }}>
        {Array.from({ length: total }).map((_, i) => (
          <motion.div key={i} onClick={() => plant(i)}
            whileHover={{ scale:1.1 }} whileTap={{ scale:0.92 }}
            animate={{ background: (planted.includes(i)||revealed)?'rgba(240,140,70,0.3)':'rgba(255,255,255,0.05)' }}
            style={{ width:'50px', height:'50px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.7rem', cursor: revealed?'default':'pointer', border:'2px solid rgba(240,140,70,0.3)', boxShadow: (planted.includes(i)||revealed)?'0 0 12px rgba(240,140,70,0.4)':'none' }}>
            {(planted.includes(i)||revealed) ? q.emoji : '🪨'}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Candy Sharing ─────────────────────────────────────────────── */
export function CandySharingTemplate({ q, ans, setAns, revealed }) {
  const [shared, setShared] = useState(0);
  useEffect(() => setShared(0), [q.id]);
  const share = () => { if (revealed || shared >= q.total) return; setShared(s => s+1); };
  return (
    <div style={{ background:'linear-gradient(135deg,#451a03,#78350f)', borderRadius:'20px', padding:'26px 22px', display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', boxShadow:'0 15px 40px rgba(0,0,0,0.4)' }}>
      <motion.div onClick={share} whileHover={{ scale:1.15 }} whileTap={{ scale:0.9 }}
        style={{ fontSize:'3.4rem', cursor:revealed?'default':'pointer', filter:'drop-shadow(0 4px 12px rgba(249,115,22,0.5))' }}>
        {shared < q.total ? q.emoji : '✨'}
      </motion.div>
      <p style={{ color:'#fcd34d', fontFamily:FONT, fontWeight:700, margin:0, fontSize:'0.88rem' }}>
        {revealed ? `✅ ${q.total/q.boxes} per basket!` : `Tap to share! (${shared}/${q.total})`}
      </p>
      <div style={{ display:'flex', gap:'14px', flexWrap:'wrap', justifyContent:'center' }}>
        {Array.from({ length: q.boxes }).map((_, i) => {
          const cnt = revealed ? (q.total/q.boxes) : Math.floor(shared/q.boxes)+(shared%q.boxes>i?1:0);
          return (
            <div key={`${q.id}-box-${i}`} style={{ background:'rgba(254,240,138,0.12)', border:'3px solid #eab308', borderRadius:'12px 12px 36px 36px', width:'78px', minHeight:'64px', display:'flex', alignItems:'center', justifyContent:'center', flexWrap:'wrap', gap:'3px', padding:'10px' }}>
              {Array.from({ length: cnt }).map((_, j) => (
                <motion.span key={`${q.id}-box-${i}-candy-${j}`} initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:400, delay:j*0.06 }} style={{ fontSize:'1.25rem' }}>{q.emoji || '🍬'}</motion.span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Equal Groups ──────────────────────────────────────────────── */
export function EqualGroupsTemplate({ q }) {
  const n = q.itemsPerGroup || 1;
  // Scale circle size based on how many items need to fit
  const circleSize = n <= 4 ? 120 : n <= 6 ? 150 : n <= 9 ? 180 : n <= 12 ? 210 : 240;
  const emojiSize = n <= 4 ? '1.4rem' : n <= 6 ? '1.25rem' : n <= 9 ? '1.1rem' : '0.95rem';
  const pad = n <= 4 ? '18px' : n <= 9 ? '14px' : '10px';
  const gapPx = n <= 4 ? '6px' : '4px';
  return (
    <div style={{ background:'linear-gradient(135deg,#3D322B,#1D1815)', borderRadius:'20px', padding:'26px 22px', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', boxShadow:'0 15px 40px rgba(0,0,0,0.5)', border:`2px solid rgba(240,140,70,0.25)` }}>
      <div style={{ display:'flex', gap:'14px', flexWrap:'wrap', justifyContent:'center' }}>
        {Array.from({ length: q.groups }).map((_, i) => (
          <motion.div key={`${q.id}-group-${i}`} initial={{ scale:0, rotate:-18 }} animate={{ scale:1, rotate:0 }}
            transition={{ type:'spring', stiffness:280, delay:i*0.1 }}
            style={{ background:'rgba(255,255,255,0.04)', border:'3px solid rgba(240,140,70,0.5)', borderRadius:'50%', width:`${circleSize}px`, height:`${circleSize}px`, display:'flex', alignItems:'center', justifyContent:'center', alignContent:'center', flexWrap:'wrap', gap:gapPx, padding:pad, boxShadow:'0 0 20px rgba(240,140,70,0.25)' }}>
            {Array.from({ length: n }).map((_, j) => (
              <span key={`${q.id}-group-${i}-item-${j}`} style={{ fontSize:emojiSize, lineHeight:'1' }}>{q.emoji || '🍪'}</span>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Picture Multi ─────────────────────────────────────────────── */
export function PictureMultiTemplate({ q }) {
  return (
    <div style={{ background:'linear-gradient(135deg,#3D322B,#1D1815)', borderRadius:'20px', padding:'30px 22px', display:'flex', flexDirection:'column', alignItems:'center', gap:'18px', boxShadow:'0 15px 40px rgba(0,0,0,0.5)', border:`2px solid rgba(240,140,70,0.25)` }}>
      <div style={{ display:'flex', gap:'14px', flexWrap:'wrap', justifyContent:'center', alignItems:'center' }}>
        {Array.from({ length: q.n }).map((_, i) => (
          <motion.div key={`${q.id}-item-${i}`} initial={{ scale:0, y:20 }} animate={{ scale:1, y:0 }}
            transition={{ type:'spring', stiffness:280, delay:i*0.08 }}
            style={{ fontSize:'3.8rem', lineHeight:'1.2', display:'flex', alignItems:'center', justifyContent:'center', filter:'drop-shadow(0 8px 20px rgba(240,140,70,0.45))', paddingBottom:'4px' }}>
            {q.icon}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Answer Input ──────────────────────────────────────────────── */
export function AnswerInput({ ans, setAns, submitAns, revealed, correctAnswer, shake, options }) {
  const rawCorrect = String(correctAnswer).includes('=')
    ? String(correctAnswer).split('=').pop().trim()
    : String(correctAnswer).trim();
  const isRight = String(ans).trim() === rawCorrect;
  const ref = useRef(null);
  useEffect(() => { if (ref.current && !revealed && (!options || options.length===0)) ref.current.focus(); }, [revealed, options]);
  return (
    <motion.div
      animate={shake ? { x:[-14,14,-10,10,-6,6,0] } : { x:0 }}
      transition={{ duration:0.5 }}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', width:'100%', marginTop:'6px' }}>
      <label style={{ fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:C.muted, fontFamily:FONT }}>Your Answer</label>
      
      {options && options.length > 0 ? (
        <div style={{ display:'flex', gap:'14px', flexWrap:'wrap', justifyContent:'center' }}>
          {options.map((opt, i) => {
            const selected = String(ans) === String(opt);
            const isCorrectOption = String(opt).trim() === rawCorrect;
            let bg = selected ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.05)';
            let borderColor = selected ? C.orange : 'rgba(255,255,255,0.1)';
            let color = selected ? C.orange : C.white;
            let shadow = selected ? '0 0 20px rgba(249,115,22,0.3)' : 'none';
            
            if (revealed) {
              if (isCorrectOption) {
                bg = 'rgba(34,197,94,0.15)';
                borderColor = C.green;
                color = C.green;
                shadow = '0 0 20px rgba(34,197,94,0.35)';
              } else if (selected) {
                bg = 'rgba(239,68,68,0.15)';
                borderColor = C.red;
                color = C.red;
                shadow = '0 0 20px rgba(239,68,68,0.35)';
              }
            }

            return (
              <motion.button key={i} onClick={() => { if(!revealed) setAns(String(opt)); }}
                whileHover={!revealed ? { scale:1.06, y:-2 } : {}} whileTap={!revealed ? { scale:0.95 } : {}}
                disabled={revealed}
                style={{ width:'80px', height:'64px', borderRadius:'16px', background:bg, border:`2px solid ${borderColor}`, color:color, fontSize:'1.8rem', fontWeight:900, fontFamily:FONT, cursor:revealed?'default':'pointer', boxShadow:shadow, transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {opt}
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
          <input ref={ref} type="number" value={ans||''} onChange={e => !revealed && setAns(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !revealed && ans) submitAns(); }}
            disabled={revealed} placeholder="?"
            style={{ width:'116px', height:'68px', fontSize:'2.4rem', fontWeight:900, textAlign:'center',
              border:`2px solid ${revealed?(isRight?C.green:C.red):'rgba(255,255,255,0.18)'}`,
              borderRadius:'18px', background: revealed?(isRight?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)'):'rgba(255,255,255,0.04)',
              color: revealed?(isRight?C.green:C.red):C.white,
              outline:'none', fontFamily:FONT, transition:'all 0.25s',
              boxShadow: revealed?(isRight?`0 0 24px rgba(34,197,94,0.35)`:`0 0 24px rgba(239,68,68,0.35)`):'none',
              MozAppearance:'textfield' }}/>
          {revealed && (
            <motion.div initial={{ scale:0, rotate:-30 }} animate={{ scale:1, rotate:0 }}
              transition={{ type:'spring', stiffness:400 }} style={{ fontSize:'2.6rem' }}>
              {isRight ? '✅' : '❌'}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ── Results Table ─────────────────────────────────────────────── */
function ResultsTable({ results }) {
  if (!results.length) return null;
  return (
    <div style={{ width:'100%', marginTop:'14px', overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:FONT, fontSize:'0.8rem' }}>
        <thead>
          <tr style={{ borderBottom:`2px solid ${C.border}` }}>
            {['#','Question','Your Answer','Result','Time'].map(h => (
              <th key={h} style={{ padding:'7px 10px', color:C.muted, fontWeight:700, textAlign:'left', textTransform:'uppercase', letterSpacing:'0.06em', fontSize:'0.7rem' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)`, background:i%2===0?'rgba(255,255,255,0.02)':'transparent' }}>
              <td style={{ padding:'7px 10px', color:C.muted }}>{i+1}</td>
              <td style={{ padding:'7px 10px', color:C.white }}>{r.question}</td>
              <td style={{ padding:'7px 10px', color:C.white }}>{r.userAnswer}</td>
              <td style={{ padding:'7px 10px' }}>{r.correct?<span style={{color:C.green}}>✓</span>:<span style={{color:C.red}}>✗</span>}</td>
              <td style={{ padding:'7px 10px', color:C.muted }}>{r.time}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Card wrapper ──────────────────────────────────────────── */
const Card = ({ children, style }) => (
  <motion.div
    initial={{ opacity:0, y:28, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
    transition={{ type:'spring', stiffness:200, damping:20 }}
    style={{ maxWidth:'870px', width:'100%', background:C.card, border:`1px solid ${C.border}`, borderRadius:'28px', padding:'40px 44px', boxShadow:'0 25px 60px rgba(0,0,0,0.65)', position:'relative', ...style }}>
    {children}
  </motion.div>
);

/* ── MAIN EXPORT ───────────────────────────────────────────────── */
const TEMPLATE_LABELS = {
  plant_arrays:  '🌱 Planting Arrays',
  frog_jumps:    '🐸 Frog Jumps',
  candy_sharing: '🍬 Candy Sharing',
  equal_groups:  '🍪 Equal Groups',
  picture_multi: '🚀 Picture Math',
  math_machine:  '⚙️ Math Machine',
};

export default function VisualMathLabRedux({ onBack, initialDifficulty, initialNumQuestions, initialStarted }) {
  const [difficulty,    setDifficulty]    = useState(initialDifficulty || 'easy');
  const [numQuestions,  setNumQuestions]  = useState(initialNumQuestions || '5');
  const [started,       setStarted]       = useState(initialStarted || false);
  const [finished,      setFinished]      = useState(false);
  const [question,      setQuestion]      = useState(null);
  const [answer,        setAnswer]        = useState('');
  const [score,         setScore]         = useState(0);
  const [questionNumber,setQuestionNumber]= useState(0);
  const [totalQ,        setTotalQ]        = useState(5);
  const [feedback,      setFeedback]      = useState('');
  const [isCorrect,     setIsCorrect]     = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [revealed,      setRevealed]      = useState(false);
  const [results,       setResults]       = useState([]);
  const [shake,         setShake]         = useState(false);
  const [showXP,        setShowXP]        = useState(false);
  const timer = useTimer();

  const fetchQuestion = async () => {
    if (questionNumber >= totalQ) { setFinished(true); timer.reset(); return; }
    setLoading(true); setFeedback(''); setAnswer('');
    setRevealed(false); setIsCorrect(null); setShake(false);
    const lastTemplate = question ? question.template : '';
    const res  = await fetch(`${API}/visual-math-lab-redux/generate?difficulty=${difficulty}&lastTemplate=${lastTemplate}`);
    const data = await res.json();
    setQuestion(data);
    setQuestionNumber(n => n+1);
    setLoading(false);
    timer.start();
  };

  const startQuiz = () => {
    setTotalQ(Number(numQuestions)||5); setStarted(true); setFinished(false);
    setScore(0); setQuestionNumber(0); setResults([]);
  };

  useEffect(() => {
    if (started && !finished && questionNumber === 0) fetchQuestion();
  }, [started]);

  const submitAns = async (optAns) => {
    if (!question || revealed) return;
    const finalAns  = optAns !== undefined ? optAns : answer;
    const timeTaken = timer.stop();
    setAnswer(finalAns);
    const res  = await fetch(`${API}/visual-math-lab-redux/check`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ answerOption: finalAns, expected: question.answer }),
    });
    const data = await res.json();
    setIsCorrect(data.correct);
    if (data.correct) {
      setScore(s => s+1);
      fireConfetti();
      setShowXP(true);
      setTimeout(() => setShowXP(false), 1600);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    const getEquation = (qObj, ans) => {
      switch (qObj.template) {
        case 'plant_arrays': return `${qObj.rows} × ${qObj.cols} = ${ans}`;
        case 'frog_jumps': return `${qObj.jumps} × ${qObj.step} = ${ans}`;
        case 'candy_sharing': return `${qObj.total} ÷ ${qObj.boxes} = ${ans}`;
        case 'equal_groups': return `${qObj.groups} × ${qObj.itemsPerGroup} = ${ans}`;
        case 'picture_multi': return `${qObj.n} × ${qObj.count} = ${ans}`;
        case 'math_machine': return `${qObj.input} × ${qObj.multiplier} = ${ans}`;
        default: return ans;
      }
    };
    const eqn = getEquation(question, data.correctAnswer);
    setFeedback(data.correct ? `Correct! 🎉 ${eqn}` : `Not quite! ${eqn}`);
    setResults(prev => [...prev, { question:question.prompt, userAnswer:finalAns, correctAnswer:eqn, correct:data.correct, time:timeTaken }]);
    setRevealed(true);
  };

  const handleSolve = async () => {
    if (revealed) return;
    const timeTaken = timer.stop();
    const res = await fetch(`${API}/visual-math-lab-redux/check`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ answerOption:'', expected: question.answer, solve:true }),
    });
    const data = await res.json();
    setIsCorrect(false);
    const getEquation = (qObj, ans) => {
      switch (qObj.template) {
        case 'plant_arrays': return `${qObj.rows} × ${qObj.cols} = ${ans}`;
        case 'frog_jumps': return `${qObj.jumps} × ${qObj.step} = ${ans}`;
        case 'candy_sharing': return `${qObj.total} ÷ ${qObj.boxes} = ${ans}`;
        case 'equal_groups': return `${qObj.groups} × ${qObj.itemsPerGroup} = ${ans}`;
        case 'picture_multi': return `${qObj.n} × ${qObj.count} = ${ans}`;
        case 'math_machine': return `${qObj.input} × ${qObj.multiplier} = ${ans}`;
        default: return ans;
      }
    };
    const eqn = getEquation(question, data.correctAnswer);
    setFeedback(`The answer is ${eqn}`);
    setResults(prev => [...prev, { question:question.prompt, userAnswer:'—', correctAnswer:eqn, correct:false, time:timeTaken }]);
    setRevealed(true);
  };

  const renderVisual = () => {
    if (!question) return null;
    const props = { q:question, ans:answer, setAns:setAnswer, submitAns, revealed };
    if (question.template==='frog_jumps')    return <FrogJumpTemplate    {...props}/>;
    if (question.template==='math_machine')  return <MathMachineTemplate  {...props}/>;
    if (question.template==='plant_arrays')  return <PlantArrayTemplate   {...props}/>;
    if (question.template==='candy_sharing') return <CandySharingTemplate {...props}/>;
    if (question.template==='equal_groups')  return <EqualGroupsTemplate  {...props}/>;
    if (question.template==='picture_multi') return <PictureMultiTemplate {...props}/>;
    return null;
  };


  return (
    <div style={{ minHeight:'100vh', background:'#181512', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', padding:'24px 16px 48px', position:'relative' }}>
      <FloatingBg/>

      <AnimatePresence mode="wait">

        {/* ── START ─────────────────────────────────── */}
        {!started && !finished && (
        <div style={{
          background: '#2D2520', border: '1.5px solid #4A4038', borderRadius: '28px',
          boxShadow: '0 20px 40px rgba(0,0,0,.45)', padding: '48px 40px', maxWidth: '720px', width: '100%',
          textAlign: 'center', position: 'relative', margin: 'auto', zIndex: 10
        }}>
          <button onClick={onBack} style={{
            position: 'absolute', top: '24px', left: '24px', background: 'transparent',
            border: '1px solid #5B5048', borderRadius: '6px', padding: '6px 14px',
            color: '#A89C93', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', zIndex: 20
          }}>← Home</button>

          <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: '48px', color: '#F4F1ED', margin: '0 0 12px', lineHeight: 1.1 }}>
            Multiplication & division
          </h1>
          <p style={{ color: '#988D84', fontSize: '0.9rem', margin: '0 0 40px', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
            Multiplication & Division
          </p>
          <p style={{ color: '#988D84', fontSize: '0.9rem', margin: '0 0 24px', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
            Practice multiplication and division!
          </p>
          
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#F4F1ED', fontSize: '0.9rem', margin: '0 0 16px', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
              Select Difficulty:
            </h3>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
              {[['Easy', 'easy'], ['Medium', 'medium'], ['Hard', 'hard']].map(([lbl, val]) => (
                <button key={val} onClick={() => setDifficulty(val)} style={{
                  background: difficulty === val ? '#F08C46' : 'transparent',
                  border: difficulty === val ? '1px solid #F08C46' : '1px solid #5B5048',
                  borderRadius: '50px', padding: '8px 16px',
                  color: difficulty === val ? '#FFF' : '#988D84', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ color: '#988D84', fontSize: '0.85rem', margin: '0 0 12px', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
              How many questions?
            </label>
            <input type="text" value={numQuestions} onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setNumQuestions(v) }} style={{
              background: '#463B34', border: '1px solid #5B5048', borderRadius: '6px',
              padding: '10px', color: '#FFF', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.9rem',
              width: '100px', textAlign: 'center', outline: 'none'
            }} placeholder="5" />
          </div>

          <button onClick={startQuiz} style={{
            background: '#F08C46', border: 'none', borderRadius: '6px',
            padding: '10px 24px', color: '#FFF', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
          }}>
            Start Quiz
          </button>
        </div>
        )}

        {/* ── QUESTION ──────────────────────────────── */}
        {started && !finished && (
          <Card key="question" style={{ marginTop:'4vh' }}>            <XPPopup show={showXP}/>
            <RibbonPopup show={showXP}/>

            {/* Header row */}
            <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'18px', flexWrap:'wrap' }}>
              <motion.button onClick={onBack} whileHover={{ scale:1.05, x:-2 }} whileTap={{ scale:0.95 }}
                style={{ background:`linear-gradient(135deg,${C.orange},${C.orange2})`, border:'none', borderRadius:'50px',
                  padding:'10px 20px', color:'white', fontFamily:FONT, fontWeight:700, fontSize:'0.88rem', cursor:'pointer',
                  boxShadow:'0 6px 18px rgba(249,115,22,0.3)', whiteSpace:'nowrap' }}>
                ← Back
              </motion.button>
              <div style={{ flex:1, minWidth:'100px' }}>
                <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:'99px', height:'9px', overflow:'hidden' }}>
                  <motion.div animate={{ width:`${((questionNumber-1)/totalQ)*100}%` }}
                    transition={{ duration:0.6, ease:'easeOut' }}
                    style={{ height:'100%', background:`linear-gradient(90deg,${C.orange},${C.orange2})`, borderRadius:'99px',
                      boxShadow:`0 0 10px rgba(249,115,22,0.5)` }}/>
                </div>
              </div>
              <span style={{ color:C.muted, fontSize:'0.82rem', fontWeight:700, whiteSpace:'nowrap' }}>
                {questionNumber} / {totalQ}
              </span>
              <motion.div
                animate={{ background: timer.elapsed>=20?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.07)',
                  borderColor: timer.elapsed>=20?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.1)' }}
                style={{ border:'2px solid', borderRadius:'50px', padding:'8px 14px',
                  display:'flex', alignItems:'center', gap:'6px', fontSize:'0.82rem', fontWeight:700, fontFamily:FONT,
                  color: timer.elapsed>=20?C.red:C.white }}>
                <motion.span animate={{ scale: timer.elapsed>=20?[1,1.2,1]:1 }}
                  transition={{ duration:0.7, repeat: timer.elapsed>=20?Infinity:0 }}>⏱️</motion.span>
                {timer.elapsed}s
              </motion.div>
            </div>

            {/* Score stars */}
            <div style={{ display:'flex', gap:'3px', marginBottom:'18px' }}>
              {Array.from({ length: totalQ }).map((_, i) => (
                <motion.div key={i} animate={{ scale:i<score?1:0.75, opacity:i<score?1:0.18 }} style={{ fontSize:'0.85rem' }}>⭐</motion.div>
              ))}
            </div>

            {/* Template label */}
            {question && (
              <div style={{ marginBottom:'8px' }}>
                <span style={{ background:'rgba(249,115,22,0.14)', border:'1px solid rgba(249,115,22,0.28)', borderRadius:'8px',
                  padding:'4px 12px', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em',
                  color:C.orange, fontFamily:FONT }}>
                  {TEMPLATE_LABELS[question.template] || '🧮 Math'}
                </span>
              </div>
            )}

            {/* Question text */}
            <AnimatePresence mode="wait">
              <motion.div key={question?.id} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-14 }}
                transition={{ duration:0.32 }} style={{ marginBottom:'22px' }}>
                {loading || !question ? (
                  <div style={{ color:C.muted, fontSize:'1.5rem', textAlign:'center', padding:'36px' }}>
                    <motion.span animate={{ opacity:[0.4,1,0.4] }} transition={{ duration:1.2, repeat:Infinity }}>Loading...</motion.span>
                  </div>
                ) : (
                  <h2 style={{ fontSize:'1.85rem', fontWeight:800, color:C.white, margin:0, lineHeight:1.35 }}>
                    {question.prompt.split(/(\d+)/g).map((part, i) =>
                      /^\d+$/.test(part)
                        ? <span key={i} style={{ color:C.orange, textShadow:`0 0 18px rgba(249,115,22,0.45)` }}>{part}</span>
                        : part
                    )}
                  </h2>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Visual */}
            <AnimatePresence mode="wait">
              {question && !loading && (
                <motion.div key={question.id+'-v'} initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
                  exit={{ opacity:0, scale:0.96 }} transition={{ duration:0.38 }}>
                  {renderVisual()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Answer input */}
            {question && !loading && (
              <div style={{ marginTop:'20px' }}>
                <AnswerInput ans={answer} setAns={setAnswer} submitAns={submitAns}
                  revealed={revealed} correctAnswer={getEquation(question, question.answer)} shake={shake} options={question.options}/>
              </div>
            )}

            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.div initial={{ opacity:0, y:10, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
                  exit={{ opacity:0 }} transition={{ type:'spring', stiffness:280 }}
                  style={{ marginTop:'14px', padding:'14px 18px', borderRadius:'14px',
                    background: isCorrect?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)',
                    border:`2px solid ${isCorrect?'rgba(34,197,94,0.35)':'rgba(239,68,68,0.35)'}`,
                    fontSize:'0.98rem', fontWeight:700, color: isCorrect?'#86efac':'#fca5a5', fontFamily:FONT, textAlign:'center' }}>
                  {isCorrect ? '🎉 ' : '💡 '}{feedback}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons */}
            <div style={{ display:'flex', gap:'12px', marginTop:'22px', flexWrap:'wrap' }}>
              {!revealed ? (
                <>
                  <motion.button onClick={handleSolve} whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                    style={{ flex:1, background:`linear-gradient(135deg,${C.orange},${C.orange2})`,
                      border:'none', borderRadius:'16px', padding:'16px 18px', opacity: 0.72,
                      color:'white', fontFamily:FONT, fontWeight:700, fontSize:'0.92rem', cursor:'pointer',
                      boxShadow:'0 8px 24px rgba(249,115,22,0.22)', transition:'all 0.2s' }}>
                    Show Answer
                  </motion.button>
                  <motion.button onClick={() => submitAns()} disabled={loading||!answer}
                    whileHover={!loading&&answer ? { scale:1.04, boxShadow:'0 14px 36px rgba(249,115,22,0.48)' } : {}}
                    whileTap={{ scale:0.96 }}
                    style={{ flex:1, background: loading||!answer?'rgba(255,255,255,0.07)':`linear-gradient(135deg,${C.orange},${C.orange2})`,
                      border:'none', borderRadius:'16px', padding:'16px 20px',
                      color: loading||!answer?C.muted:'white', fontFamily:FONT, fontWeight:800, fontSize:'1rem',
                      cursor: loading||!answer?'not-allowed':'pointer', boxShadow: loading||!answer?'none':'0 8px 24px rgba(249,115,22,0.32)', transition:'all 0.2s' }}>
                    Submit ✓
                  </motion.button>
                </>
              ) : (
                <motion.button onClick={fetchQuestion}
                  whileHover={{ scale:1.05, boxShadow:'0 14px 36px rgba(249,115,22,0.48)' }} whileTap={{ scale:0.96 }}
                  style={{ flex:1, background:`linear-gradient(135deg,${C.orange},${C.orange2})`, border:'none',
                    borderRadius:'16px', padding:'18px 22px', color:'white', fontFamily:FONT, fontWeight:800,
                    fontSize:'1.05rem', cursor:'pointer', boxShadow:'0 8px 24px rgba(249,115,22,0.35)' }}>
                  {questionNumber >= totalQ ? 'Finish Lab 🏁' : 'Next Question →'}
                </motion.button>
              )}
            </div>

            {/* Mini results */}
            {results.length > 0 && (
              <div style={{ marginTop:'22px', borderTop:`1px solid ${C.border}`, paddingTop:'18px' }}>
                <ResultsTable results={results}/>
              </div>
            )}
          </Card>
        )}

        {/* ── FINISH ────────────────────────────────── */}
        {finished && (
          <Card key="finish" style={{ textAlign:'center', marginTop:'8vh' }}>
            <motion.div animate={{ y:[0,-18,0], rotate:[0,8,-8,0] }} transition={{ duration:1.4, repeat:Infinity }}
              style={{ fontSize:'5rem', marginBottom:'14px' }}>🏆</motion.div>
            <h1 style={{ fontSize:'2.8rem', fontWeight:900, color:C.white, margin:'0 0 8px' }}>Lab Complete!</h1>
            <p style={{ fontSize:'1.25rem', color:C.muted, margin:'0 0 12px' }}>
              Final Score: <span style={{ color:C.orange, fontWeight:900 }}>{score} / {totalQ}</span>
            </p>
            <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:'99px', height:'12px', overflow:'hidden', maxWidth:'400px', margin:'0 auto 30px' }}>
              <motion.div initial={{ width:0 }} animate={{ width:`${(score/totalQ)*100}%` }} transition={{ duration:1.2, delay:0.3 }}
                style={{ height:'100%', background:`linear-gradient(90deg,${C.orange},${C.green})`, borderRadius:'99px' }}/>
            </div>
            <ResultsTable results={results}/>
            <div style={{ display:'flex', gap:'14px', justifyContent:'center', marginTop:'30px', flexWrap:'wrap' }}>
              <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.96 }}
                onClick={() => { setStarted(false); setFinished(false); setScore(0); setQuestionNumber(0); setResults([]); }}
                style={{ background:`linear-gradient(135deg,${C.orange},${C.orange2})`, border:'none', borderRadius:'16px',
                  padding:'16px 32px', color:'white', fontFamily:FONT, fontWeight:800, fontSize:'1rem', cursor:'pointer',
                  boxShadow:'0 8px 24px rgba(249,115,22,0.35)' }}>
                Play Again 🔄
              </motion.button>
              <motion.button onClick={onBack} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                style={{ background:'rgba(255,255,255,0.05)', border:`2px solid ${C.border}`, borderRadius:'16px',
                  padding:'16px 24px', color:C.muted, fontFamily:FONT, fontWeight:700, fontSize:'1rem', cursor:'pointer' }}>
                ← Home
              </motion.button>
            </div>
          </Card>
        )}
      </AnimatePresence>
    </div>
  );
}
