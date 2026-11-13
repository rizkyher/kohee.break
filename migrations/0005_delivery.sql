CREATE TABLE delivery_settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL CHECK(json_valid(data)),version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE shipping_quotes(id TEXT PRIMARY KEY,data TEXT NOT NULL CHECK(json_valid(data)),cart_hash TEXT NOT NULL,settings_version INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX quote_expiry ON shipping_quotes(expires_at);
ALTER TABLE orders ADD COLUMN delivery_snapshot TEXT;
