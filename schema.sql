-- ============================================================================
-- SKEMA E BAZËS SË TË DHËNAVE: Menaxhimi i Shpenzimeve (Expense Manager)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS expense_tracker_db;
USE expense_tracker_db;

-- 1. Tabela Users (Përdoruesit)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    group_id INT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela Groups (Grupet/Banesat)
CREATE TABLE IF NOT EXISTS `groups` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela Group Members (Anëtarët e Grupit)
CREATE TABLE IF NOT EXISTS group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_group_member (group_id, user_id)
);

-- 4. Tabela Expenses (Shpenzimet)
-- group_id është NULL nëse është shpenzim personal, ose INT nëse është shpenzim i përbashkët
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) DEFAULT 'Të Përgjithshme',
    paid_by_user_id INT NOT NULL,
    group_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE SET NULL
);

-- 5. Tabela Expense Splits (Ndarja e Shpenzimeve)
CREATE TABLE IF NOT EXISTS expense_splits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_id INT NOT NULL,
    user_id INT NOT NULL,
    amount_owed DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- TË DHËNA TESTUESE (Demo Data)
-- ============================================================================

-- Përdoruesit e banesës
INSERT IGNORE INTO users (id, name, email, password_hash) VALUES
(1, 'Artan Berisha', 'artan@example.com', '$2b$10$hashed_password_1'),
(2, 'Blerta Krasniqi', 'blerta@example.com', '$2b$10$hashed_password_2'),
(3, 'Dardan Gashi', 'dardan@example.com', '$2b$10$hashed_password_3');

-- Grupi i banesës
INSERT IGNORE INTO `groups` (id, name) VALUES
(1, 'Banesa në Qendër');

-- Shtimi i anëtarëve në grup
INSERT IGNORE INTO group_members (group_id, user_id) VALUES
(1, 1),
(1, 2),
(1, 3);
