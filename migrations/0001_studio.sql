PRAGMA foreign_keys = ON;
CREATE TABLE admin_users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','editor')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE admin_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX rate_expiry ON rate_limits(expires_at);
CREATE TABLE product_categories (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, display_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE media_assets (
 id TEXT PRIMARY KEY, object_key TEXT UNIQUE, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL CHECK(size >= 0),
 url TEXT NOT NULL UNIQUE, alt TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE products (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
 category_id TEXT REFERENCES product_categories(id) ON DELETE RESTRICT,
 short_description TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
 price INTEGER NOT NULL CHECK(price >= 0 AND price <= 100000000),
 comparison_price INTEGER CHECK(comparison_price IS NULL OR comparison_price > price),
 size TEXT NOT NULL DEFAULT '250ml', available INTEGER NOT NULL DEFAULT 1 CHECK(available IN (0,1)),
 stock INTEGER CHECK(stock IS NULL OR stock >= 0), featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
 display_order INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 seo_title TEXT NOT NULL DEFAULT '', seo_description TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX products_listing ON products(status, display_order);
CREATE INDEX products_category ON products(category_id);
CREATE TABLE product_images (
 product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 media_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
 display_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(product_id,media_id)
);
CREATE TABLE site_sections (
 id TEXT PRIMARY KEY CHECK(id IN ('hero','marquee','signature','story','banners','footer')),
 draft TEXT NOT NULL CHECK(json_valid(draft)), published TEXT CHECK(published IS NULL OR json_valid(published)),
 display_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE section_media (
 section_id TEXT NOT NULL REFERENCES site_sections(id) ON DELETE CASCADE,
 media_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
 PRIMARY KEY(section_id,media_id)
);
CREATE TABLE site_settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL CHECK(json_valid(data)), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE orders (
 id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
 customer_name TEXT NOT NULL, customer_note TEXT NOT NULL DEFAULT '', fulfillment TEXT NOT NULL DEFAULT '',
 total INTEGER NOT NULL CHECK(total >= 0), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','preparing','completed','cancelled')),
 internal_note TEXT NOT NULL DEFAULT '', whatsapp_number TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 confirmed_at TEXT, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX orders_period ON orders(created_at,status);
CREATE TABLE checkout_items (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 product_id TEXT REFERENCES products(id) ON DELETE SET NULL, product_name TEXT NOT NULL,
 price INTEGER NOT NULL CHECK(price >= 0), qty INTEGER NOT NULL CHECK(qty BETWEEN 1 AND 20),
 subtotal INTEGER NOT NULL CHECK(subtotal=price*qty)
);
CREATE INDEX checkout_order ON checkout_items(order_id);
CREATE TABLE order_status_history (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 status TEXT NOT NULL, actor_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE analytics_events (
 id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('page_view','product_view','add_to_cart','checkout')),
 product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX analytics_period ON analytics_events(created_at,type,product_id);
CREATE TABLE activity_logs (
 id TEXT PRIMARY KEY, actor_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
 action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX activity_period ON activity_logs(created_at);
