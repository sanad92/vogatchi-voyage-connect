-- Add subscription and usage tracking tables for SaaS enforcement

-- Plans definition
CREATE TABLE IF NOT EXISTS subscription_plans (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  features JSON NULL,
  limits JSON NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Subscriptions per organization
CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  status ENUM('trialing','active','cancelled','expired') NOT NULL DEFAULT 'trialing',
  starts_at DATE NOT NULL,
  expires_at DATE NULL,
  is_trial TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_subs_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_subs_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  INDEX idx_subs_org (organization_id),
  INDEX idx_subs_plan (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usage records to track consumption by feature and time period
CREATE TABLE IF NOT EXISTS usage_records (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  feature VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  usage INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_usage_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY uk_usage_period (organization_id, feature, period_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Example plans (minimal seed)
INSERT INTO subscription_plans (id, name, description, features, limits, price) VALUES
  (UUID(), 'Free', 'Basic free plan', JSON_OBJECT('features','[]'), JSON_OBJECT('max_users',5,'max_bookings_per_month',10), 0),
  (UUID(), 'Pro',  'Unlimited bookings & users', JSON_OBJECT('features','[]'), JSON_OBJECT('max_users',1000,'max_bookings_per_month',100000), 49.99)
ON DUPLICATE KEY UPDATE name=name;
