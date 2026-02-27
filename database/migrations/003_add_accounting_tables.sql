-- Create accounting structures

-- Chart of Accounts (per organization)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20) NOT NULL,
  type ENUM('asset','liability','equity','revenue','expense') NOT NULL,
  parent_id CHAR(36) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_coa_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_coa_parent FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  INDEX idx_coa_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Journal entries header
CREATE TABLE IF NOT EXISTS journal_entries (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NULL,
  reference VARCHAR(100) NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_je_org (organization_id),
  CONSTRAINT fk_je_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Individual lines for each journal entry
CREATE TABLE IF NOT EXISTS journal_lines (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  journal_entry_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  debit DECIMAL(14,2) NOT NULL DEFAULT 0,
  credit DECIMAL(14,2) NOT NULL DEFAULT 0,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jl_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_jl_account FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  INDEX idx_jl_entry (journal_entry_id),
  INDEX idx_jl_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional salary payments table to support payroll integration
CREATE TABLE IF NOT EXISTS salary_payments (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  employee_id CHAR(36) NOT NULL,
  salary_month DATE NOT NULL,
  gross_amount DECIMAL(14,2) NOT NULL,
  net_amount DECIMAL(14,2) NOT NULL,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  payment_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_salary_org (organization_id),
  INDEX idx_salary_emp (employee_id),
  CONSTRAINT fk_salary_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_salary_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
