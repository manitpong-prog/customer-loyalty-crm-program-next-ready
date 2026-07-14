import { neon } from '@neondatabase/serverless';
import type { Customer, GameSessionStatus, MiniGameConfig, RewardTicketSummary } from '../../../types';

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || '';
const sql = connectionString ? neon(connectionString) : null;

const GAME_TYPE = 'fruit_math_slash' as const;
const FRUITS = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍑', '🥝', '🍒', '🍍', '🥭', '🍐'];
const SERVER_TIME_GRACE_MS = 1_500;

function requireSql() {
  if (!sql) {
    throw new Error('DATABASE_URL is not configured.');
  }
  return sql;
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export type StoredGameQuestion = {
  id: string;
  expression: string;
  correctAnswer: number;
  timeLimitSeconds: number;
  options: Array<{ id: string; value: number; fruit: string }>;
};

export type PublicGameQuestion = Omit<StoredGameQuestion, 'correctAnswer'> & {
  questionNumber: number;
  totalQuestions: number;
};

export type GameState = {
  config: MiniGameConfig;
  attemptsUsedToday: number;
  attemptsRemainingToday: number;
  tickets: RewardTicketSummary;
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(values: T[]): T[] {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function getQuestionRules(index: number) {
  if (index <= 2) {
    return { maxNumber: 9, timeLimitSeconds: 5, optionCount: 4, wrongSpread: 4 };
  }
  if (index <= 5) {
    return { maxNumber: 15, timeLimitSeconds: 4, optionCount: 6, wrongSpread: 5 };
  }
  return { maxNumber: 20, timeLimitSeconds: 3, optionCount: 8, wrongSpread: 6 };
}

function generateQuestion(index: number): StoredGameQuestion {
  const rules = getQuestionRules(index);
  let first = 1;
  let second = 1;
  let third = 1;
  let operatorOne: '+' | '-' = '+';
  let operatorTwo: '+' | '-' = '+';
  let answer = 0;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    first = randomInt(1, rules.maxNumber);
    second = randomInt(1, rules.maxNumber);
    third = randomInt(1, rules.maxNumber);
    operatorOne = Math.random() < 0.5 ? '+' : '-';
    operatorTwo = Math.random() < 0.5 ? '+' : '-';

    const firstResult = operatorOne === '+' ? first + second : first - second;
    answer = operatorTwo === '+' ? firstResult + third : firstResult - third;

    // Keep the mental-math challenge fair for a 3–5 second timer.
    if (answer >= 0 && answer <= 45 && firstResult >= 0) break;
  }

  const optionValues = new Set<number>([answer]);
  const preferredOffsets = shuffle([
    -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, -8, 8,
  ]);

  for (const offset of preferredOffsets) {
    if (optionValues.size >= rules.optionCount) break;
    const candidate = answer + offset;
    if (candidate >= 0 && Math.abs(offset) <= rules.wrongSpread + 2) {
      optionValues.add(candidate);
    }
  }

  while (optionValues.size < rules.optionCount) {
    optionValues.add(Math.max(0, answer + randomInt(-rules.wrongSpread, rules.wrongSpread)));
  }

  const fruitPool = shuffle(FRUITS);
  const options = shuffle([...optionValues]).map((value, optionIndex) => ({
    id: `q${index + 1}_o${optionIndex + 1}_${value}`,
    value,
    fruit: fruitPool[optionIndex % fruitPool.length],
  }));

  return {
    id: `question_${index + 1}`,
    expression: `${first} ${operatorOne} ${second} ${operatorTwo} ${third}`,
    correctAnswer: answer,
    timeLimitSeconds: rules.timeLimitSeconds,
    options,
  };
}

function generateQuestions(maxQuestions: number) {
  return Array.from({ length: maxQuestions }, (_, index) => generateQuestion(index));
}

function toPublicQuestion(question: StoredGameQuestion, index: number, totalQuestions: number): PublicGameQuestion {
  const { correctAnswer: _correctAnswer, ...safeQuestion } = question;
  return {
    ...safeQuestion,
    questionNumber: index + 1,
    totalQuestions,
  };
}

function normalizeQuestions(value: unknown): StoredGameQuestion[] {
  if (Array.isArray(value)) return value as StoredGameQuestion[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as StoredGameQuestion[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

let gameSchemaPromise: Promise<void> | null = null;

async function applyGameSchema() {
  const db = requireSql();

  await db`alter table rewards add column if not exists redemption_mode text not null default 'points'`;
  await db`alter table rewards add column if not exists ticket_cost integer not null default 1`;
  await db`alter table transactions add column if not exists payment_method text not null default 'points'`;
  await db`alter table transactions add column if not exists tickets_used integer not null default 0`;

  try { await db`alter table rewards drop constraint if exists rewards_redemption_mode_check`; } catch {}
  try { await db`alter table rewards add constraint rewards_redemption_mode_check check (redemption_mode in ('points', 'tickets', 'either'))`; } catch {}
  try { await db`alter table rewards drop constraint if exists rewards_ticket_cost_check`; } catch {}
  try { await db`alter table rewards add constraint rewards_ticket_cost_check check (ticket_cost > 0)`; } catch {}
  try { await db`alter table transactions drop constraint if exists transactions_payment_method_check`; } catch {}
  try { await db`alter table transactions add constraint transactions_payment_method_check check (payment_method in ('points', 'tickets'))`; } catch {}
  try { await db`alter table transactions drop constraint if exists transactions_tickets_used_check`; } catch {}
  try { await db`alter table transactions add constraint transactions_tickets_used_check check (tickets_used >= 0)`; } catch {}
  try { await db`alter table transactions drop constraint if exists transactions_points_check`; } catch {}
  try { await db`alter table transactions drop constraint if exists transactions_points_nonnegative_check`; } catch {}
  try { await db`alter table transactions add constraint transactions_points_nonnegative_check check (points >= 0)`; } catch {}

  await db`create table if not exists mini_games (
    id text primary key,
    shop_id text not null references shops(id) on delete cascade,
    name text not null default 'Fruit Math Slash',
    game_type text not null default 'fruit_math_slash' check (game_type in ('fruit_math_slash')),
    entry_points integer not null default 10 check (entry_points > 0),
    max_questions integer not null default 10 check (max_questions > 0),
    questions_to_win integer not null default 8 check (questions_to_win > 0),
    max_mistakes integer not null default 3 check (max_mistakes > 0),
    daily_play_limit integer not null default 3 check (daily_play_limit > 0),
    ticket_reward integer not null default 1 check (ticket_reward > 0),
    ticket_expiry_days integer not null default 30 check (ticket_expiry_days > 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint mini_games_shop_type_unique unique (shop_id, game_type)
  )`;

  await db`create table if not exists game_sessions (
    id text primary key,
    game_id text not null references mini_games(id) on delete cascade,
    shop_id text not null references shops(id) on delete cascade,
    customer_id text not null references customers(id) on delete cascade,
    entry_points integer not null check (entry_points > 0),
    questions jsonb not null,
    current_question_index integer not null default 0,
    correct_answers integer not null default 0,
    wrong_answers integer not null default 0,
    status text not null default 'playing' check (status in ('playing', 'won', 'lost', 'expired', 'abandoned')),
    started_at timestamptz not null default now(),
    question_started_at timestamptz not null default now(),
    finished_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;

  await db`create table if not exists reward_tickets (
    id text primary key,
    shop_id text not null references shops(id) on delete cascade,
    customer_id text not null references customers(id) on delete cascade,
    game_session_id text not null references game_sessions(id) on delete cascade,
    status text not null default 'available' check (status in ('available', 'reserved', 'used', 'expired')),
    expires_at timestamptz not null,
    reserved_transaction_id text,
    reserved_at timestamptz,
    used_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint reward_tickets_session_unique unique (game_session_id)
  )`;

  await db`create index if not exists idx_game_sessions_customer_shop_started on game_sessions(customer_id, shop_id, started_at desc)`;
  await db`create index if not exists idx_game_sessions_status on game_sessions(status)`;
  await db`create index if not exists idx_reward_tickets_customer_shop_status on reward_tickets(customer_id, shop_id, status, expires_at)`;
  await db`create index if not exists idx_reward_tickets_reserved_transaction on reward_tickets(reserved_transaction_id)`;
}

export async function ensureGameSchema() {
  // Production relies on the versioned SQL migration. Runtime DDL is opt-in
  // because repeated ALTER/CREATE statements make serverless cold starts slower.
  if (process.env.ENABLE_RUNTIME_SCHEMA_CHECK !== 'true') return;

  if (!gameSchemaPromise) {
    gameSchemaPromise = applyGameSchema().catch((error) => {
      gameSchemaPromise = null;
      throw error;
    });
  }
  await gameSchemaPromise;
}

async function ensureDefaultGame(shopId: string) {
  await ensureGameSchema();
  const db = requireSql();
  const gameId = `${shopId}_${GAME_TYPE}`;
  await db`
    insert into mini_games (
      id, shop_id, name, game_type, entry_points, max_questions, questions_to_win,
      max_mistakes, daily_play_limit, ticket_reward, ticket_expiry_days, is_active, updated_at
    )
    values (${gameId}, ${shopId}, 'Fruit Math Slash', ${GAME_TYPE}, 10, 10, 8, 3, 3, 1, 30, true, now())
    on conflict (shop_id, game_type) do nothing
  `;
}

function mapGameConfig(row: any): MiniGameConfig {
  return {
    id: String(row.id),
    shopId: String(row.shopId),
    name: String(row.name),
    gameType: GAME_TYPE,
    entryPoints: Number(row.entryPoints),
    maxQuestions: Number(row.maxQuestions),
    questionsToWin: Number(row.questionsToWin),
    maxMistakes: Number(row.maxMistakes),
    dailyPlayLimit: Number(row.dailyPlayLimit),
    ticketReward: Number(row.ticketReward),
    ticketExpiryDays: Number(row.ticketExpiryDays),
    isActive: row.isActive !== false,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function getGameState(params: { shopId: string; customerId?: string }): Promise<GameState> {
  await ensureDefaultGame(params.shopId);
  const db = requireSql();

  if (params.customerId) {
    await db`
      update reward_tickets
      set status = 'expired', updated_at = now()
      where shop_id = ${params.shopId}
        and customer_id = ${params.customerId}
        and status = 'available'
        and expires_at <= now()
    `;
  }

  const configRows = await db`
    select id, shop_id as "shopId", name, game_type as "gameType", entry_points as "entryPoints",
      max_questions as "maxQuestions", questions_to_win as "questionsToWin", max_mistakes as "maxMistakes",
      daily_play_limit as "dailyPlayLimit", ticket_reward as "ticketReward", ticket_expiry_days as "ticketExpiryDays",
      is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
    from mini_games where shop_id = ${params.shopId} and game_type = ${GAME_TYPE} limit 1
  `;
  if (!configRows[0]) throw new Error('ไม่พบการตั้งค่าเกมของร้านนี้');
  const config = mapGameConfig(configRows[0]);

  let attemptsUsedToday = 0;
  const tickets: RewardTicketSummary = { available: 0, reserved: 0, used: 0, expired: 0 };

  if (params.customerId) {
    const attemptRows = await db`
      select count(*)::int as count
      from game_sessions
      where shop_id = ${params.shopId}
        and customer_id = ${params.customerId}
        and (started_at at time zone 'Asia/Bangkok')::date = (now() at time zone 'Asia/Bangkok')::date
    `;
    attemptsUsedToday = Number(attemptRows[0]?.count || 0);

    const ticketRows = await db`
      select status, count(*)::int as count
      from reward_tickets
      where shop_id = ${params.shopId} and customer_id = ${params.customerId}
      group by status
    `;
    for (const row of ticketRows as any[]) {
      const status = String(row.status) as keyof RewardTicketSummary;
      if (status in tickets) tickets[status] = Number(row.count || 0);
    }
  }

  return {
    config,
    attemptsUsedToday,
    attemptsRemainingToday: Math.max(0, config.dailyPlayLimit - attemptsUsedToday),
    tickets,
  };
}

export async function updateGameSettings(params: {
  shopId: string;
  entryPoints: number;
  dailyPlayLimit: number;
  isActive: boolean;
}): Promise<MiniGameConfig> {
  await ensureDefaultGame(params.shopId);
  const db = requireSql();
  const rows = await db`
    update mini_games
    set entry_points = ${Math.max(1, Math.floor(params.entryPoints))},
        daily_play_limit = ${Math.max(1, Math.floor(params.dailyPlayLimit))},
        is_active = ${params.isActive},
        updated_at = now()
    where shop_id = ${params.shopId} and game_type = ${GAME_TYPE}
    returning id, shop_id as "shopId", name, game_type as "gameType", entry_points as "entryPoints",
      max_questions as "maxQuestions", questions_to_win as "questionsToWin", max_mistakes as "maxMistakes",
      daily_play_limit as "dailyPlayLimit", ticket_reward as "ticketReward", ticket_expiry_days as "ticketExpiryDays",
      is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
  `;
  if (!rows[0]) throw new Error('บันทึกการตั้งค่าเกมไม่สำเร็จ');
  return mapGameConfig(rows[0]);
}

export async function startFruitMathGame(params: { shopId: string; customerId: string }): Promise<{
  sessionId: string;
  status: GameSessionStatus;
  question: PublicGameQuestion;
  correctAnswers: number;
  wrongAnswers: number;
  currentPoints: number;
  state: GameState;
}> {
  await ensureDefaultGame(params.shopId);
  const db = requireSql();

  const stateBefore = await getGameState(params);
  if (!stateBefore.config.isActive) throw new Error('เกมนี้ปิดให้บริการชั่วคราว');
  if (stateBefore.attemptsRemainingToday <= 0) throw new Error('วันนี้คุณใช้สิทธิ์เล่นครบตามจำนวนที่ร้านกำหนดแล้ว');

  const customerRows = await db`
    select id, current_points as "currentPoints" from customers where id = ${params.customerId} limit 1
  `;
  if (!customerRows[0]) throw new Error('ไม่พบข้อมูลสมาชิก');
  if (Number(customerRows[0].currentPoints) < stateBefore.config.entryPoints) {
    throw new Error(`แต้มไม่เพียงพอ ต้องใช้ ${stateBefore.config.entryPoints} แต้มเพื่อเล่นเกม`);
  }

  const sessionId = createId('game');
  const transactionId = createId('tx_game');
  const auditId = createId('audit_game');
  const questions = generateQuestions(stateBefore.config.maxQuestions);
  const questionsJson = JSON.stringify(questions);

  const rows = await db`
    with lock_row as (
      select pg_advisory_xact_lock(hashtext(${`${params.shopId}:${params.customerId}:fruit_math`}))
    ), game_config as (
      select g.* from mini_games g, lock_row
      where g.shop_id = ${params.shopId} and g.game_type = ${GAME_TYPE} and g.is_active = true
      limit 1
    ), attempt_count as (
      select count(*)::int as count
      from game_sessions s, lock_row
      where s.shop_id = ${params.shopId}
        and s.customer_id = ${params.customerId}
        and (s.started_at at time zone 'Asia/Bangkok')::date = (now() at time zone 'Asia/Bangkok')::date
    ), eligible as (
      select c.id as customer_id, c.name, c.phone, c.current_points, g.id as game_id,
             g.entry_points, g.daily_play_limit, g.max_questions
      from customers c, game_config g, attempt_count a
      where c.id = ${params.customerId}
        and c.current_points >= g.entry_points
        and a.count < g.daily_play_limit
    ), deducted as (
      update customers c
      set current_points = c.current_points - e.entry_points, updated_at = now()
      from eligible e
      where c.id = e.customer_id
      returning c.id, c.name, c.phone, c.current_points, e.game_id, e.entry_points, e.max_questions
    ), inserted_session as (
      insert into game_sessions (
        id, game_id, shop_id, customer_id, entry_points, questions,
        current_question_index, correct_answers, wrong_answers, status,
        started_at, question_started_at, created_at, updated_at
      )
      select ${sessionId}, d.game_id, ${params.shopId}, d.id, d.entry_points, ${questionsJson}::jsonb,
             0, 0, 0, 'playing', now(), now(), now(), now()
      from deducted d
      returning *
    ), inserted_transaction as (
      insert into transactions (
        id, user_id, user_name, user_phone, shop_id, shop_name, type, points,
        description, status, reward_id, payment_method, tickets_used, created_at
      )
      select ${transactionId}, d.id, d.name, d.phone, ${params.shopId}, coalesce(s.name, ''),
             'redeem', d.entry_points, 'ใช้แต้มเล่นเกม Fruit Math Slash', 'completed', null,
             'points', 0, now()
      from deducted d
      left join shops s on s.id = ${params.shopId}
      returning id
    ), inserted_audit as (
      insert into audit_logs (
        id, shop_id, shop_name, actor_type, actor_name, actor_id, action, action_label,
        description, target_type, target_id, customer_id, customer_name, points, status, metadata, created_at
      )
      select ${auditId}, ${params.shopId}, coalesce(s.name, ''), 'customer', d.name, d.id,
             'game_started', 'เริ่มเล่นเกม', 'ใช้แต้มเข้าเล่น Fruit Math Slash', 'game_session',
             ${sessionId}, d.id, d.name, -d.entry_points, 'info',
             jsonb_build_object('entryPoints', d.entry_points), now()
      from deducted d
      left join shops s on s.id = ${params.shopId}
      returning id
    )
    select i.id as "sessionId", i.status, i.current_question_index as "currentQuestionIndex",
           i.correct_answers as "correctAnswers", i.wrong_answers as "wrongAnswers",
           i.questions, d.current_points as "currentPoints"
    from inserted_session i
    join deducted d on d.id = i.customer_id
  `;

  if (!rows[0]) {
    const latestState = await getGameState(params);
    if (latestState.attemptsRemainingToday <= 0) throw new Error('วันนี้คุณใช้สิทธิ์เล่นครบตามจำนวนที่ร้านกำหนดแล้ว');
    const latestCustomer = await db`select current_points as "currentPoints" from customers where id = ${params.customerId} limit 1`;
    if (Number(latestCustomer[0]?.currentPoints || 0) < latestState.config.entryPoints) {
      throw new Error(`แต้มไม่เพียงพอ ต้องใช้ ${latestState.config.entryPoints} แต้มเพื่อเล่นเกม`);
    }
    throw new Error('เริ่มเกมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  }

  const storedQuestions = normalizeQuestions(rows[0].questions);
  const state = await getGameState(params);
  return {
    sessionId: String(rows[0].sessionId),
    status: 'playing',
    question: toPublicQuestion(storedQuestions[0], 0, storedQuestions.length),
    correctAnswers: 0,
    wrongAnswers: 0,
    currentPoints: Number(rows[0].currentPoints),
    state,
  };
}

export async function answerFruitMathGame(params: {
  sessionId: string;
  shopId: string;
  customerId: string;
  questionIndex: number;
  selectedAnswer: number | null;
}): Promise<{
  sessionId: string;
  status: GameSessionStatus;
  wasCorrect: boolean;
  correctAnswers: number;
  wrongAnswers: number;
  question: PublicGameQuestion | null;
  ticketsAwarded: number;
  state: GameState;
}> {
  await ensureGameSchema();
  const db = requireSql();
  const answerValue = Number.isFinite(params.selectedAnswer as number) ? Number(params.selectedAnswer) : null;

  const rows = await db`
    with lock_row as (
      select pg_advisory_xact_lock(hashtext(${params.sessionId}))
    ), current_session as (
      select s.*, g.questions_to_win, g.max_mistakes, g.max_questions,
             g.ticket_reward, g.ticket_expiry_days,
             ((s.questions -> s.current_question_index ->> 'correctAnswer')::int = ${answerValue})
               and now() <= s.question_started_at
                 + make_interval(secs => (s.questions -> s.current_question_index ->> 'timeLimitSeconds')::int)
                 + (${SERVER_TIME_GRACE_MS} * interval '1 millisecond') as is_correct
      from game_sessions s
      join mini_games g on g.id = s.game_id
      join lock_row on true
      where s.id = ${params.sessionId}
        and s.shop_id = ${params.shopId}
        and s.customer_id = ${params.customerId}
        and s.status = 'playing'
        and s.current_question_index = ${Math.max(0, Math.floor(params.questionIndex))}
      for update
    ), calculated as (
      select c.*,
             c.correct_answers + case when c.is_correct then 1 else 0 end as next_correct,
             c.wrong_answers + case when c.is_correct then 0 else 1 end as next_wrong,
             c.current_question_index + 1 as next_index
      from current_session c
    ), updated as (
      update game_sessions s
      set correct_answers = c.next_correct,
          wrong_answers = c.next_wrong,
          current_question_index = c.next_index,
          status = case
            when c.next_correct >= c.questions_to_win then 'won'
            when c.next_wrong >= c.max_mistakes then 'lost'
            when c.next_index >= c.max_questions then case when c.next_correct >= c.questions_to_win then 'won' else 'lost' end
            else 'playing'
          end,
          question_started_at = case
            when c.next_correct >= c.questions_to_win or c.next_wrong >= c.max_mistakes or c.next_index >= c.max_questions
              then s.question_started_at
            else now()
          end,
          finished_at = case
            when c.next_correct >= c.questions_to_win or c.next_wrong >= c.max_mistakes or c.next_index >= c.max_questions
              then now()
            else null
          end,
          updated_at = now()
      from calculated c
      where s.id = c.id
      returning s.*, c.is_correct, c.ticket_reward, c.ticket_expiry_days
    ), inserted_ticket as (
      insert into reward_tickets (
        id, shop_id, customer_id, game_session_id, status, expires_at, created_at, updated_at
      )
      select ${`ticket_${params.sessionId}`}, u.shop_id, u.customer_id, u.id, 'available',
             now() + make_interval(days => u.ticket_expiry_days), now(), now()
      from updated u
      where u.status = 'won'
      on conflict (game_session_id) do nothing
      returning id
    ), inserted_audit as (
      insert into audit_logs (
        id, shop_id, shop_name, actor_type, actor_name, actor_id, action, action_label,
        description, target_type, target_id, customer_id, customer_name, status, metadata, created_at
      )
      select ${createId('audit_game_result')}, u.shop_id, coalesce(sh.name, ''), 'customer', coalesce(c.name, ''), u.customer_id,
             case when u.status = 'won' then 'game_won' else 'game_lost' end,
             case when u.status = 'won' then 'ชนะเกม' else 'จบเกม' end,
             case when u.status = 'won' then 'ชนะ Fruit Math Slash และได้รับ Reward Ticket' else 'จบ Fruit Math Slash โดยไม่ได้รับ Ticket' end,
             'game_session', u.id, u.customer_id, c.name,
             case when u.status = 'won' then 'success' else 'warning' end,
             jsonb_build_object('correctAnswers', u.correct_answers, 'wrongAnswers', u.wrong_answers), now()
      from updated u
      left join shops sh on sh.id = u.shop_id
      left join customers c on c.id = u.customer_id
      where u.status in ('won', 'lost')
      returning id
    )
    select u.id as "sessionId", u.status, u.current_question_index as "currentQuestionIndex",
           u.correct_answers as "correctAnswers", u.wrong_answers as "wrongAnswers",
           u.questions, u.is_correct as "wasCorrect",
           case when exists(select 1 from inserted_ticket) then u.ticket_reward else 0 end as "ticketsAwarded"
    from updated u
  `;

  if (!rows[0]) {
    const existing = await db`
      select status, current_question_index as "currentQuestionIndex"
      from game_sessions where id = ${params.sessionId} and shop_id = ${params.shopId} and customer_id = ${params.customerId} limit 1
    `;
    if (!existing[0]) throw new Error('ไม่พบรอบเกมนี้');
    if (existing[0].status !== 'playing') throw new Error('รอบเกมนี้จบไปแล้ว');
    throw new Error('คำตอบข้อนี้ถูกส่งไปแล้ว กรุณารอข้อถัดไป');
  }

  const row = rows[0] as any;
  const storedQuestions = normalizeQuestions(row.questions);
  const status = String(row.status) as GameSessionStatus;
  const nextIndex = Number(row.currentQuestionIndex);
  const nextQuestion = status === 'playing' && storedQuestions[nextIndex]
    ? toPublicQuestion(storedQuestions[nextIndex], nextIndex, storedQuestions.length)
    : null;
  const state = await getGameState({ shopId: params.shopId, customerId: params.customerId });

  return {
    sessionId: String(row.sessionId),
    status,
    wasCorrect: row.wasCorrect === true,
    correctAnswers: Number(row.correctAnswers),
    wrongAnswers: Number(row.wrongAnswers),
    question: nextQuestion,
    ticketsAwarded: Number(row.ticketsAwarded || 0),
    state,
  };
}

export async function abandonFruitMathGame(params: {
  sessionId: string;
  shopId: string;
  customerId: string;
}) {
  await ensureGameSchema();
  const db = requireSql();
  const rows = await db`
    with updated as (
      update game_sessions
      set status = 'abandoned', finished_at = now(), updated_at = now()
      where id = ${params.sessionId}
        and shop_id = ${params.shopId}
        and customer_id = ${params.customerId}
        and status = 'playing'
      returning id, shop_id, customer_id, correct_answers, wrong_answers
    ), inserted_audit as (
      insert into audit_logs (
        id, shop_id, shop_name, actor_type, actor_name, actor_id, action, action_label,
        description, target_type, target_id, customer_id, customer_name, status, metadata, created_at
      )
      select ${createId('audit_game_abandon')}, u.shop_id, coalesce(sh.name, ''), 'customer', coalesce(c.name, ''), u.customer_id,
             'game_abandoned', 'ออกจากเกมกลางรอบ', 'ออกจาก Fruit Math Slash กลางรอบ โดยไม่คืนแต้ม',
             'game_session', u.id, u.customer_id, c.name, 'warning',
             jsonb_build_object('correctAnswers', u.correct_answers, 'wrongAnswers', u.wrong_answers), now()
      from updated u
      left join shops sh on sh.id = u.shop_id
      left join customers c on c.id = u.customer_id
      returning id
    )
    select id from updated
  `;

  return { abandoned: Boolean(rows[0]) };
}

export async function getAvailableRewardTicketCount(params: { shopId: string; customerId: string }) {
  const state = await getGameState(params);
  return state.tickets.available;
}

export async function reserveRewardTickets(params: {
  shopId: string;
  customerId: string;
  count: number;
  transactionId: string;
}): Promise<number> {
  await ensureGameSchema();
  const db = requireSql();
  const requiredCount = Math.max(1, Math.floor(params.count));
  const rows = await db`
    with picked as (
      select id
      from reward_tickets
      where shop_id = ${params.shopId}
        and customer_id = ${params.customerId}
        and status = 'available'
        and expires_at > now()
      order by expires_at asc, created_at asc
      for update skip locked
      limit ${requiredCount}
    ), enough as (
      select count(*)::int as count from picked
    ), updated as (
      update reward_tickets t
      set status = 'reserved', reserved_transaction_id = ${params.transactionId}, reserved_at = now(), updated_at = now()
      where t.id in (select id from picked)
        and (select count from enough) = ${requiredCount}
      returning t.id
    )
    select count(*)::int as count from updated
  `;
  return Number(rows[0]?.count || 0);
}

export async function settleReservedRewardTickets(params: {
  transactionId: string;
  action: 'approve' | 'reject';
}) {
  await ensureGameSchema();
  const db = requireSql();
  if (params.action === 'approve') {
    const rows = await db`
      update reward_tickets
      set status = 'used', used_at = now(), updated_at = now()
      where reserved_transaction_id = ${params.transactionId} and status = 'reserved'
      returning id
    `;
    return rows.length;
  }

  const rows = await db`
    update reward_tickets
    set status = case when expires_at <= now() then 'expired' else 'available' end,
        reserved_transaction_id = null,
        reserved_at = null,
        updated_at = now()
    where reserved_transaction_id = ${params.transactionId} and status = 'reserved'
    returning id
  `;
  return rows.length;
}
