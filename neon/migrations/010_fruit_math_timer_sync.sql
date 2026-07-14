-- Phase 8A hotfix: synchronize Fruit Math Slash countdown with the server.
-- Run once in Neon SQL Editor before deploying v1.2.
-- Safe to run more than once.

alter table game_sessions
  add column if not exists question_ready_index integer not null default -1;

alter table game_sessions
  drop constraint if exists game_sessions_question_ready_index_check;

alter table game_sessions
  add constraint game_sessions_question_ready_index_check
  check (question_ready_index >= -1);
