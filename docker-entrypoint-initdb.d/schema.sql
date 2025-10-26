CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    balance BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO wallets (id, owner_id, balance) VALUES
(1, 1, 10000000),
(2, 2, 10000000),
(3, 3, 7500)
ON CONFLICT DO NOTHING;