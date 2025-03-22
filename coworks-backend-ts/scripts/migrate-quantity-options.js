// Import required modules
require('dotenv').config();
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Connection configuration
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

async function runMigration() {
  try {
    console.log('Connecting to the database...');
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Define migrations directory
    const migrationsDir = path.join(__dirname, '../migrations');

    // Find our quantity options migration file
    const migrationFile = fs.readdirSync(migrationsDir).find(file => 
      file.includes('add-quantity-options-to-seating-types')
    );

    if (!migrationFile) {
      console.error('Quantity options migration file not found!');
      process.exit(1);
    }

    console.log(`Found migration file: ${migrationFile}`);

    // Import and execute the migration
    const migrationPath = path.join(migrationsDir, migrationFile);
    const migration = require(migrationPath);

    console.log('Starting migration for quantity options...');
    
    // Execute the up function
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    
    console.log('Migration successful! Quantity options have been added to seating types.');

  } catch (error) {
    console.error('Error running quantity options migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

runMigration(); 