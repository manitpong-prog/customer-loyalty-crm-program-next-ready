-- Phase 8A: Fruit Math Slash + Reward Ticket redemption
-- Run once in Neon SQL Editor before deploying the game build.

alter table rewards add column if not exists redemption_mode text not null default 'points';
alter table rewards add column if not exists ticket_cost integer not null default 1;

alter table rewards drop constraint if exists rewards_redemption_mode_check;
alter table rewards add constraint rewards_redemption_mode_check
  check (redemption_mode in ('points', 'tickets', 'either'));

alter table rewards drop constraint if exists rewards_ticket_cost_check;
alter table rewards add constraint rewards_ticket_cost_check check (ticket_cost > 0);

alter table transactions add column if not exists payment_method text not null default 'points';
alter table transactions add column if not exists tickets_used integer not null default 0;

alter table transactions drop constraint if exists transactions_payment_method_check;
alter table transactions add constraint transactions_payment_method_check
  check (payment_method in ('points', 'tickets'));

alter table transactions drop constraint if exists transactions_tickets_used_check;
alter table transactions add constraint transactions_tickets_used_check check (tickets_used >= 0);

alter table transactions drop constraint if exists transactions_points_check;
alter table transactions drop constraint if exists transactions_points_nonnegative_check;
alter table transactions add constraint transactions_points_nonnegative_check check (points >= 0);

create table if not exists mini_games (
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
);

create table if not exists game_sessions (
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
);

create table if not exists reward_tickets (
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
);

create index if not exists idx_game_sessions_customer_shop_started
  on game_sessions(customer_id, shop_id, started_at desc);
create index if not exists idx_game_sessions_status on game_sessions(status);
create index if not exists idx_reward_tickets_customer_shop_status
  on reward_tickets(customer_id, shop_id, status, expires_at);
create index if not exists idx_reward_tickets_reserved_transaction
  on reward_tickets(reserved_transaction_id);

-- Existing rewards remain points-only. The game row is created lazily per shop by the API.
update rewards
set redemption_mode = coalesce(nullif(redemption_mode, ''), 'points'),
    ticket_cost = greatest(1, coalesce(ticket_cost, 1));
