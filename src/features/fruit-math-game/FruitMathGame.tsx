import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Clock3, Heart, Sparkles, Ticket, X, Zap } from 'lucide-react';
import type { Customer } from '../../types';
import type { FruitMathGameState, FruitMathQuestion, FruitMathRound } from './types';

type FruitMathGameProps = {
  open: boolean;
  shopId: string;
  customer: Customer;
  onClose: () => void;
  onCustomerPointsChange: (points: number) => void;
  onGameStateChange: (state: FruitMathGameState) => void;
};

type GameScreen = 'loading' | 'lobby' | 'confirm' | 'playing' | 'won' | 'lost';

const FALL_LANES: Record<number, string[]> = {
  4: ['12%', '37%', '63%', '88%'],
  6: ['8%', '25%', '42%', '58%', '75%', '92%'],
  8: ['6%', '19%', '31%', '44%', '56%', '69%', '81%', '94%'],
};

function getFruitLayout(optionCount: number, index: number) {
  const lanes = FALL_LANES[optionCount] || FALL_LANES[8];
  const diameter = optionCount >= 8 ? 44 : optionCount >= 6 ? 52 : 64;
  const emojiSize = optionCount >= 8 ? 25 : optionCount >= 6 ? 29 : 35;
  return {
    x: lanes[index] || lanes[index % lanes.length],
    delay: index * (optionCount >= 8 ? 0.035 : 0.055),
    diameter,
    emojiSize,
  };
}

export default function FruitMathGame({
  open,
  shopId,
  customer,
  onClose,
  onCustomerPointsChange,
  onGameStateChange,
}: FruitMathGameProps) {
  const [screen, setScreen] = useState<GameScreen>('loading');
  const [state, setState] = useState<FruitMathGameState | null>(null);
  const [round, setRound] = useState<FruitMathRound | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const timeoutSubmittedRef = useRef(false);

  const loadState = useCallback(async () => {
    setErrorMessage('');
    setScreen('loading');
    try {
      const response = await fetch(`/api/db/games/state?shopId=${encodeURIComponent(shopId)}&customerId=${encodeURIComponent(customer.id)}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; message?: string; state?: FruitMathGameState } | null;
      if (!response.ok || !payload?.ok || !payload.state) {
        throw new Error(payload?.message || 'โหลดข้อมูลเกมไม่สำเร็จ');
      }
      setState(payload.state);
      onGameStateChange(payload.state);
      setScreen('lobby');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'โหลดข้อมูลเกมไม่สำเร็จ');
      setScreen('lobby');
    }
  }, [customer.id, onGameStateChange, shopId]);

  useEffect(() => {
    if (!open) return;
    setRound(null);
    setFeedback(null);
    setSelectedAnswer(null);
    void loadState();
  }, [open, loadState]);

  const question = round?.question || null;

  useEffect(() => {
    if (screen !== 'playing' || !question) return;
    timeoutSubmittedRef.current = false;
    setRemainingMs(question.timeLimitSeconds * 1000);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, question.timeLimitSeconds * 1000 - (Date.now() - startedAt));
      setRemainingMs(remaining);
    }, 40);
    return () => window.clearInterval(timer);
  }, [question?.id, screen]);

  const submitAnswer = useCallback(async (answer: number | null) => {
    if (!round?.sessionId || !round.question || submitting) return;
    setSubmitting(true);
    setSelectedAnswer(answer);
    setErrorMessage('');

    try {
      const response = await fetch('/api/db/games/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: round.sessionId,
          shopId,
          customerId: customer.id,
          questionIndex: round.question.questionNumber - 1,
          selectedAnswer: answer,
        }),
      });
      const payload = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        sessionId?: string;
        status?: FruitMathRound['status'];
        wasCorrect?: boolean;
        correctAnswers?: number;
        wrongAnswers?: number;
        question?: FruitMathQuestion | null;
        ticketsAwarded?: number;
        state?: FruitMathGameState;
      } | null;
      if (!response.ok || !payload?.ok || !payload.status || !payload.state) {
        throw new Error(payload?.message || 'ส่งคำตอบไม่สำเร็จ');
      }

      setFeedback(answer === null ? 'timeout' : payload.wasCorrect ? 'correct' : 'wrong');
      const nextRound: FruitMathRound = {
        sessionId: payload.sessionId || round.sessionId,
        status: payload.status,
        question: payload.question || null,
        correctAnswers: Number(payload.correctAnswers || 0),
        wrongAnswers: Number(payload.wrongAnswers || 0),
        ticketsAwarded: Number(payload.ticketsAwarded || 0),
      };
      setState(payload.state);
      onGameStateChange(payload.state);

      window.setTimeout(() => {
        setRound(nextRound);
        setFeedback(null);
        setSelectedAnswer(null);
        if (nextRound.status === 'won') setScreen('won');
        else if (nextRound.status === 'lost') setScreen('lost');
        else setScreen('playing');
        setSubmitting(false);
      }, 260);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ส่งคำตอบไม่สำเร็จ');
      setSubmitting(false);
      setSelectedAnswer(null);
    }
  }, [customer.id, onGameStateChange, round, shopId, submitting]);

  useEffect(() => {
    if (screen !== 'playing' || !question || remainingMs > 0 || submitting || timeoutSubmittedRef.current) return;
    timeoutSubmittedRef.current = true;
    void submitAnswer(null);
  }, [question, remainingMs, screen, submitAnswer, submitting]);

  const startGame = async () => {
    if (!state) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/db/games/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, customerId: customer.id }),
      });
      const payload = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        sessionId?: string;
        status?: FruitMathRound['status'];
        question?: FruitMathQuestion;
        correctAnswers?: number;
        wrongAnswers?: number;
        currentPoints?: number;
        state?: FruitMathGameState;
      } | null;
      if (!response.ok || !payload?.ok || !payload.sessionId || !payload.question || !payload.state) {
        throw new Error(payload?.message || 'เริ่มเกมไม่สำเร็จ');
      }

      onCustomerPointsChange(Number(payload.currentPoints || 0));
      setState(payload.state);
      onGameStateChange(payload.state);
      setRound({
        sessionId: payload.sessionId,
        status: 'playing',
        question: payload.question,
        correctAnswers: Number(payload.correctAnswers || 0),
        wrongAnswers: Number(payload.wrongAnswers || 0),
        ticketsAwarded: 0,
      });
      setFeedback(null);
      setSelectedAnswer(null);
      setScreen('playing');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'เริ่มเกมไม่สำเร็จ');
      setScreen('lobby');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (screen === 'playing') {
      const confirmed = window.confirm('ออกจากเกมตอนนี้ใช่ไหม? รอบนี้จะถือว่าเล่นไปแล้วและไม่คืนแต้ม');
      if (!confirmed) return;

      if (round?.sessionId) {
        setSubmitting(true);
        await fetch('/api/db/games/abandon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: round.sessionId, shopId, customerId: customer.id }),
          keepalive: true,
        }).catch(() => null);
      }
    }
    onClose();
  };

  const progressPercent = question ? Math.max(0, Math.min(100, (remainingMs / (question.timeLimitSeconds * 1000)) * 100)) : 0;
  const maxMistakes = state?.config.maxMistakes || 3;
  const hearts = useMemo(
    () => Array.from({ length: maxMistakes }, (_, index) => index < Math.max(0, maxMistakes - (round?.wrongAnswers || 0))),
    [maxMistakes, round?.wrongAnswers],
  );

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[80] flex items-stretch justify-center bg-[#150c08]/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-[#fff9ef] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-amber-200/70 bg-white/90 px-4 py-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-700">Skill game</p>
            <h2 className="text-base font-black text-[#2b160c]">Fruit Math Slash</h2>
          </div>
          <button type="button" onClick={handleClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-[#3c2415]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {errorMessage && (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700">
              {errorMessage}
            </div>
          )}

          {screen === 'loading' && (
            <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 text-center">
              <div className="text-5xl animate-bounce">🍎</div>
              <p className="text-sm font-black text-[#3c2415]">กำลังเตรียมสนามเกม...</p>
            </div>
          )}

          {(screen === 'lobby' || screen === 'confirm') && state && (
            <div className="space-y-4">
              <section className="overflow-hidden rounded-[28px] border border-amber-300 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 p-5 shadow-[0_22px_55px_-38px_rgba(120,55,10,0.8)]">
                <div className="text-center">
                  <div className="text-6xl">🍉➕🍎</div>
                  <h3 className="mt-2 text-2xl font-black text-[#32170b]">ฟันผลไม้ตอบเลข</h3>
                  <p className="mt-1 text-xs font-bold text-[#75533d]">โจทย์ 3 ตัว ใช้บวกและลบ • ชนะด้วยความเร็วและความแม่น</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white/80 p-3 text-center">
                    <p className="text-[9px] font-black text-slate-500">ค่าเข้า</p>
                    <p className="mt-1 text-lg font-black text-rose-600">{state.config.entryPoints}</p>
                    <p className="text-[9px] font-bold text-slate-500">แต้ม</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3 text-center">
                    <p className="text-[9px] font-black text-slate-500">ชนะเมื่อ</p>
                    <p className="mt-1 text-lg font-black text-emerald-700">{state.config.questionsToWin}/{state.config.maxQuestions}</p>
                    <p className="text-[9px] font-bold text-slate-500">ข้อ</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3 text-center">
                    <p className="text-[9px] font-black text-slate-500">รางวัล</p>
                    <p className="mt-1 text-lg font-black text-violet-700">1</p>
                    <p className="text-[9px] font-bold text-slate-500">Ticket</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[#eadcca] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-violet-600" />
                    <div>
                      <p className="text-[10px] font-black text-slate-500">Reward Ticket ของคุณ</p>
                      <p className="text-xl font-black text-[#2b160c]">{state.tickets.available} ใบ</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500">สิทธิ์วันนี้</p>
                    <p className="text-sm font-black text-amber-700">เหลือ {state.attemptsRemainingToday}/{state.config.dailyPlayLimit} รอบ</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[#eadcca] bg-white p-4 text-[11px] font-semibold leading-relaxed text-[#5f493a]">
                <p className="font-black text-[#2b160c]">กติกา</p>
                <p className="mt-2">• ข้อ 1–3: 7 วินาที / ผลไม้ 4 ลูก</p>
                <p>• ข้อ 4–6: 6 วินาที / ผลไม้ 6 ลูก</p>
                <p>• ข้อ 7–10: 5 วินาที / ผลไม้ 8 ลูก</p>
                <p>• แตะผิดหรือหมดเวลา นับว่าผิด 1 ข้อ</p>
                <p>• ผิดครบ 3 ข้อ เกมจบทันที</p>
              </section>

              {screen === 'confirm' ? (
                <section className="rounded-3xl border-2 border-rose-300 bg-rose-50 p-4 text-center">
                  <p className="text-sm font-black text-rose-800">ยืนยันใช้ {state.config.entryPoints} แต้มเพื่อเล่น 1 รอบ?</p>
                  <p className="mt-1 text-[10px] font-bold text-rose-600">ถ้าแพ้หรือออกกลางเกม จะไม่ได้ Ticket และไม่คืนแต้ม</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setScreen('lobby')} className="rounded-2xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-700">ยกเลิก</button>
                    <button type="button" onClick={() => void startGame()} disabled={submitting} className="rounded-2xl bg-rose-600 py-3 text-xs font-black text-white disabled:bg-slate-300">
                      {submitting ? 'กำลังเริ่ม...' : 'ยืนยันและเริ่ม'}
                    </button>
                  </div>
                </section>
              ) : (
                <button
                  type="button"
                  onClick={() => setScreen('confirm')}
                  disabled={!state.config.isActive || state.attemptsRemainingToday <= 0 || customer.currentPoints < state.config.entryPoints}
                  className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 py-3.5 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400"
                >
                  {!state.config.isActive
                    ? 'เกมปิดให้บริการชั่วคราว'
                    : state.attemptsRemainingToday <= 0
                      ? 'ใช้สิทธิ์วันนี้ครบแล้ว'
                      : customer.currentPoints < state.config.entryPoints
                        ? `แต้มไม่พอ (ต้องใช้ ${state.config.entryPoints})`
                        : `เริ่มเล่น ${state.config.entryPoints} แต้ม`}
                </button>
              )}
            </div>
          )}

          {screen === 'playing' && question && round && (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-3xl border border-amber-200 bg-white px-3 py-2.5">
                <div>
                  <p className="text-[9px] font-black text-slate-500">ข้อ</p>
                  <p className="font-mono text-base font-black text-[#2b160c]">{question.questionNumber}/{question.totalQuestions}</p>
                </div>
                <div className="flex items-center gap-1">
                  {hearts.map((alive, index) => (
                    <Heart key={index} className={`h-5 w-5 ${alive ? 'fill-rose-500 text-rose-500' : 'fill-slate-200 text-slate-300'}`} />
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500">ตอบถูก</p>
                  <p className="font-mono text-base font-black text-emerald-700">{round.correctAnswers}/{state?.config.questionsToWin || 8}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-[#e6d5c0] bg-[#2b160c] p-4 text-center text-white shadow-lg">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">คำนวณแล้วแตะคำตอบ</p>
                <p className="mt-2 font-mono text-[34px] font-black tracking-tight">{question.expression} = ?</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                  <motion.div className={`h-full ${progressPercent <= 30 ? 'bg-rose-500' : 'bg-amber-400'}`} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.05 }} />
                </div>
                <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-black text-white/80">
                  <Clock3 className="h-3 w-3" /> {(remainingMs / 1000).toFixed(1)} วินาที
                </div>
              </div>

              <div className="relative h-[345px] overflow-hidden rounded-[30px] border border-emerald-200 bg-gradient-to-b from-sky-100 via-emerald-50 to-lime-100 shadow-inner">
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-emerald-300/70 to-transparent" />
                {question.options.map((option, index) => {
                  const position = getFruitLayout(question.options.length, index);
                  const isSelected = selectedAnswer === option.value;
                  return (
                    <motion.button
                      key={`${question.id}-${option.id}`}
                      type="button"
                      disabled={submitting}
                      onClick={() => void submitAnswer(option.value)}
                      initial={{ y: -75, opacity: 0, rotate: -8 }}
                      animate={isSelected
                        ? { y: 120, opacity: 0.15, rotate: 75, scale: 1.45 }
                        : { y: 270, opacity: 1, rotate: [0, 5, -4, 0] }}
                      transition={{ duration: isSelected ? 0.22 : question.timeLimitSeconds, delay: isSelected ? 0 : position.delay, ease: 'linear' }}
                      className="absolute top-1 flex -translate-x-1/2 flex-col items-center justify-center rounded-full border-2 border-white/90 bg-white/80 shadow-[0_12px_24px_-12px_rgba(15,80,40,0.65)] backdrop-blur-sm disabled:cursor-default"
                      style={{ left: position.x, width: position.diameter, height: position.diameter }}
                    >
                      <span className="leading-none" style={{ fontSize: position.emojiSize }}>{option.fruit}</span>
                      <span className="absolute -bottom-2 min-w-9 rounded-full border border-[#3e2414] bg-[#2b160c] px-2 py-0.5 font-mono text-[12px] font-black text-white shadow">{option.value}</span>
                    </motion.button>
                  );
                })}

                <AnimatePresence>
                  {feedback && (
                    <motion.div initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-[1px]">
                      <div className={`rounded-3xl border-2 px-6 py-4 text-center shadow-xl ${feedback === 'correct' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-rose-300 bg-rose-50 text-rose-700'}`}>
                        <p className="text-4xl">{feedback === 'correct' ? '✅' : feedback === 'timeout' ? '⏰' : '❌'}</p>
                        <p className="mt-1 text-sm font-black">{feedback === 'correct' ? 'ถูกต้อง!' : feedback === 'timeout' ? 'หมดเวลา!' : 'ตอบผิด!'}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {(screen === 'won' || screen === 'lost') && round && state && (
            <div className="flex min-h-[560px] flex-col items-center justify-center text-center">
              <motion.div initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="text-7xl">
                {screen === 'won' ? '🏆' : '🍂'}
              </motion.div>
              <h3 className={`mt-4 text-3xl font-black ${screen === 'won' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {screen === 'won' ? 'คุณชนะแล้ว!' : 'จบเกม'}
              </h3>
              <p className="mt-2 text-sm font-bold text-slate-600">ตอบถูก {round.correctAnswers} ข้อ • ผิด {round.wrongAnswers} ข้อ</p>

              {screen === 'won' ? (
                <div className="mt-5 w-full rounded-3xl border-2 border-violet-300 bg-violet-50 p-5">
                  <Ticket className="mx-auto h-10 w-10 text-violet-600" />
                  <p className="mt-2 text-sm font-black text-violet-800">ได้รับ Reward Ticket {Math.max(1, round.ticketsAwarded)} ใบ</p>
                  <p className="mt-1 text-[11px] font-bold text-violet-600">Ticket มีอายุ {state.config.ticketExpiryDays} วัน และใช้แลกรางวัลที่ร้านเปิดรับ Ticket</p>
                </div>
              ) : (
                <div className="mt-5 w-full rounded-3xl border border-rose-200 bg-rose-50 p-5 text-[11px] font-bold text-rose-700">
                  รอบนี้ยังไม่ได้รับ Reward Ticket ลองฝึกคิดให้ไวขึ้นแล้วกลับมาเล่นใหม่ได้
                </div>
              )}

              <div className="mt-5 grid w-full grid-cols-2 gap-2">
                <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-700">กลับหน้าหลัก</button>
                <button
                  type="button"
                  onClick={() => setScreen('confirm')}
                  disabled={state.attemptsRemainingToday <= 0 || customer.currentPoints < state.config.entryPoints}
                  className="rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 py-3 text-xs font-black text-white disabled:from-slate-300 disabled:to-slate-400"
                >
                  เล่นใหม่ {state.config.entryPoints} แต้ม
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
