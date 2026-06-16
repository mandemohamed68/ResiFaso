-- =========================================================================
-- Base de données optimisée et PARTITIONNÉE pour RESIFASO (MariaDB / MySQL)
-- =========================================================================

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS resifaso_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE resifaso_db;

-- NOTE TECHNIQUE SÉCURITÉ & PERFORMANCE : 
-- Dans MariaDB, les tables partitionnées ne supportent pas de clés étrangères physiques (FOREIGN KEY).
-- Pour maximiser la vitesse et supporter le partitionnement horizontal par hachage de clé (PARTITION BY KEY),
-- nous remplaçons les clés étrangères par des INDEX hautement performants de manière à maintenir l'intégrité
-- via la logique applicative tout en bénéficiant de la puissance du partitionnement linéaire.

-- ==========================================
-- 1. Table Utilisateurs (Profils) - Partitionnée
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) NOT NULL, -- Correspond à l'uid Firebase ou généré par le backend
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50),
  photo_url TEXT,
  role ENUM('client', 'owner', 'admin') DEFAULT 'client',
  is_verified BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, email) -- Clé primaire composite incluant la clé de partition
)
PARTITION BY KEY(id)
PARTITIONS 5;

-- Index uniques requis pour la rapidité de connexion
CREATE UNIQUE INDEX idx_users_email ON users(email);


-- ==========================================
-- 2. Table Résidences - Partitionnée
-- ==========================================
CREATE TABLE IF NOT EXISTS residences (
  id VARCHAR(128) NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('appartement', 'chambre', 'villa', 'auberge') NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  advance_percentage INT DEFAULT 0,
  cleaning_fee DECIMAL(10, 2) DEFAULT 0,
  service_fee DECIMAL(10, 2) DEFAULT 0,
  
  -- Adresse
  city VARCHAR(100),
  neighborhood VARCHAR(100),
  street VARCHAR(255),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  
  -- Capacités
  capacity INT DEFAULT 1,
  bedrooms INT DEFAULT 1,
  beds INT DEFAULT 1,
  bathrooms INT DEFAULT 1,
  rooms INT DEFAULT 1,
  
  -- Propriétés diverses
  status ENUM('draft', 'pending', 'published', 'suspended') DEFAULT 'pending',
  availability_status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
  promoted BOOLEAN DEFAULT FALSE,
  weekly_discount INT DEFAULT 0,
  monthly_discount INT DEFAULT 0,
  promo_price DECIMAL(10, 2),
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, owner_id) -- Clé primaire composite requise pour le partitionnement
)
PARTITION BY KEY(id)
PARTITIONS 5;

-- Index rapides pour les recherches et filtres
CREATE INDEX idx_residences_owner ON residences(owner_id);
CREATE INDEX idx_residences_status ON residences(status, availability_status);
CREATE INDEX idx_residences_city ON residences(city);


-- ==========================================
-- Table des commodités (Amenities)
-- ==========================================
CREATE TABLE IF NOT EXISTS residence_amenities (
  residence_id VARCHAR(128) NOT NULL,
  amenity VARCHAR(100) NOT NULL,
  PRIMARY KEY (residence_id, amenity)
);


-- ==========================================
-- Table des images des résidences
-- ==========================================
CREATE TABLE IF NOT EXISTS residence_images (
  id INT NOT NULL AUTO_INCREMENT,
  residence_id VARCHAR(128) NOT NULL,
  image_url TEXT NOT NULL,
  PRIMARY KEY (id, residence_id)
)
PARTITION BY KEY(residence_id)
PARTITIONS 5;


-- ==========================================
-- 3. Table Réservations (Bookings) - Partitionnée
-- ==========================================
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(128) NOT NULL,
  residence_id VARCHAR(128) NOT NULL,
  client_id VARCHAR(128) NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL,
  advance_paid DECIMAL(10, 2) DEFAULT 0,
  
  payment_status ENUM('pending', 'advance_paid', 'fully_paid', 'failed') DEFAULT 'pending',
  booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  transaction_id VARCHAR(255),
  
  -- Annulation
  cancelled_by ENUM('client', 'owner', 'admin') NULL,
  cancellation_reason TEXT NULL,
  cancelled_at TIMESTAMP NULL,
  refund_status ENUM('none', 'pending', 'refunded') DEFAULT 'none',
  refund_amount DECIMAL(10, 2) DEFAULT 0,
  refund_phone VARCHAR(50) NULL,
  refund_provider VARCHAR(50) NULL,
  refund_processed_at TIMESTAMP NULL,
  
  -- Statut du séjour
  stay_status ENUM('pending', 'ongoing', 'completed') DEFAULT 'pending',
  checked_in_at TIMESTAMP NULL,
  checked_out_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, client_id) -- Clé primaire composite incluant la clé de partitionnement (client_id)
)
PARTITION BY KEY(client_id)
PARTITIONS 5;

-- Index pour optimiser les jointures et requêtes d'historique
CREATE INDEX idx_bookings_residence ON bookings(residence_id);
CREATE INDEX idx_bookings_owner ON bookings(owner_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);


-- ==========================================
-- 4. Table Avis (Reviews) - Partitionnée
-- ==========================================
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(128) NOT NULL,
  booking_id VARCHAR(128) NOT NULL,
  residence_id VARCHAR(128) NOT NULL,
  client_id VARCHAR(128) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, residence_id)
)
PARTITION BY KEY(residence_id)
PARTITIONS 5;


-- ==========================================
-- 5. Table Retraits (Withdrawal Requests) - Partitionnée
-- ==========================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id VARCHAR(128) NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  provider ENUM('orange', 'moov', 'telecel', 'coris') NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  PRIMARY KEY (id, owner_id)
)
PARTITION BY KEY(owner_id)
PARTITIONS 5;


-- ==========================================
-- 6. Table Publicités (Advertisements)
-- ==========================================
CREATE TABLE IF NOT EXISTS advertisements (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  frequency_seconds INT DEFAULT 30,
  start_at TIMESTAMP NULL,
  end_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
