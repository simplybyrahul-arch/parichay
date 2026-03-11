-- Migration 003: Add portfolio_url column to creators table
ALTER TABLE creators ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
