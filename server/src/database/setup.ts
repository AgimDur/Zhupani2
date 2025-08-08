import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

async function setupDatabase() {
  const pool = mysql.createPool(dbConfig);
  const dbName = process.env.DB_NAME || 'zhupani_family_tree';

  try {
    console.log('🚀 Setting up Zhupani Family Tree Database...');

    // Create database if it doesn't exist
    await pool.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' created/verified`);

    // Use the database
    await pool.execute(`USE ${dbName}`);

    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'family_member', 'visitor') DEFAULT 'family_member',
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        reset_token VARCHAR(255),
        reset_token_expires DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Users table created');

    // Create families table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS families (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_name (name),
        INDEX idx_public (is_public)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Families table created');

    // Create persons table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS persons (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        maiden_name VARCHAR(100),
        gender ENUM('male', 'female', 'other') NOT NULL,
        birth_date DATE,
        death_date DATE,
        birth_place VARCHAR(255),
        death_place VARCHAR(255),
        photo_url VARCHAR(500),
        biography TEXT,
        is_deceased BOOLEAN DEFAULT FALSE,
        family_id INT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_name (first_name, last_name),
        INDEX idx_family (family_id),
        INDEX idx_gender (gender),
        INDEX idx_birth_date (birth_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Persons table created');

    // Create relationships table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS relationships (
        id INT PRIMARY KEY AUTO_INCREMENT,
        person1_id INT NOT NULL,
        person2_id INT NOT NULL,
        relationship_type ENUM('parent_child', 'spouse', 'sibling') NOT NULL,
        relationship_subtype ENUM('mother', 'father', 'husband', 'wife', 'ex_husband', 'ex_wife', 'brother', 'sister') NOT NULL,
        marriage_date DATE,
        divorce_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (person1_id) REFERENCES persons(id) ON DELETE CASCADE,
        FOREIGN KEY (person2_id) REFERENCES persons(id) ON DELETE CASCADE,
        UNIQUE KEY unique_relationship (person1_id, person2_id, relationship_type),
        INDEX idx_person1 (person1_id),
        INDEX idx_person2 (person2_id),
        INDEX idx_type (relationship_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Relationships table created');

    // Create posts table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        image_url VARCHAR(500),
        visibility ENUM('public', 'family', 'admin') DEFAULT 'family',
        author_id INT NOT NULL,
        family_id INT,
        likes_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL,
        INDEX idx_author (author_id),
        INDEX idx_family (family_id),
        INDEX idx_visibility (visibility),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Posts table created');

    // Create comments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        content TEXT NOT NULL,
        post_id INT NOT NULL,
        author_id INT NOT NULL,
        parent_comment_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        INDEX idx_post (post_id),
        INDEX idx_author (author_id),
        INDEX idx_parent (parent_comment_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Comments table created');

    // Create user_family_permissions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_family_permissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        family_id INT NOT NULL,
        permission_level ENUM('view', 'edit', 'admin') DEFAULT 'view',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_family (user_id, family_id),
        INDEX idx_user (user_id),
        INDEX idx_family (family_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ User family permissions table created');

    // Create default admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await pool.execute(`
      INSERT IGNORE INTO users (email, password, first_name, last_name, role, email_verified)
      VALUES ('admin@zhupani.com', ?, 'Admin', 'User', 'admin', TRUE)
    `, [hashedPassword]);
    console.log('✅ Default admin user created (email: admin@zhupani.com, password: admin123)');

    // Create default family
    await pool.execute(`
      INSERT IGNORE INTO families (name, description, is_public, created_by)
      VALUES ('Zhupani Family', 'Default family for the Zhupani platform', TRUE, 1)
    `);
    console.log('✅ Default family created');

    console.log('🎉 Database setup completed successfully!');
    console.log('📊 Database name:', dbName);
    console.log('👤 Default admin: admin@zhupani.com / admin123');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export default setupDatabase;
