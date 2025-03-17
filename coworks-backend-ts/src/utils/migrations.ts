import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USER as string,
  process.env.DB_PASS as string,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: console.log
  }
);

// Function to check if a type exists
async function typeExists(transaction: any, typeName: string): Promise<boolean> {
  const result = await sequelize.query(`
    SELECT 1 FROM pg_type 
    WHERE typname = '${typeName}'
  `, { transaction });
  
  return (result[0] as any[]).length > 0;
}

// Function to check if a column exists in a table
async function columnExists(transaction: any, tableName: string, columnName: string): Promise<boolean> {
  const result = await sequelize.query(`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '${tableName}' AND column_name = '${columnName}'
  `, { transaction });
  
  return (result[0] as any[]).length > 0;
}

// Migration Up Function
async function up(): Promise<void> {
  const transaction = await sequelize.transaction();

  try {
    // Create branches table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        location TEXT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        cost_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
        opening_time TIME NOT NULL DEFAULT '08:00:00',
        closing_time TIME NOT NULL DEFAULT '22:00:00',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        images JSONB,
        amenities JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Add short_code column to branches table if it doesn't exist
    const branchShortCodeExists = await columnExists(transaction, 'branches', 'short_code');
    if (!branchShortCodeExists) {
      await sequelize.query(`
        ALTER TABLE branches
        ADD COLUMN short_code VARCHAR(10) UNIQUE;
      `, { transaction });
      
      console.log('Added short_code column to branches table');
    }

    // Add images column to branches table if it doesn't exist
    const branchImagesExists = await columnExists(transaction, 'branches', 'images');
    if (!branchImagesExists) {
      await sequelize.query(`
        ALTER TABLE branches
        ADD COLUMN images JSONB;
      `, { transaction });
      
      console.log('Added images column to branches table');
    }

    // Add amenities column to branches table if it doesn't exist
    const branchAmenitiesExists = await columnExists(transaction, 'branches', 'amenities');
    if (!branchAmenitiesExists) {
      await sequelize.query(`
        ALTER TABLE branches
        ADD COLUMN amenities JSONB;
      `, { transaction });
      
      console.log('Added amenities column to branches table');
    }

    // Create customers table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        profile_picture VARCHAR(255),
        company_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Add profile_picture column to customers table if it doesn't exist
    const profilePictureExists = await columnExists(transaction, 'customers', 'profile_picture');
    if (!profilePictureExists) {
      await sequelize.query(`
        ALTER TABLE customers
        ADD COLUMN profile_picture VARCHAR(255);
      `, { transaction });
      
      console.log('Added profile_picture column to customers table');
    }

    // Add company_name column to customers table if it doesn't exist
    const companyNameExists = await columnExists(transaction, 'customers', 'company_name');
    if (!companyNameExists) {
      await sequelize.query(`
        ALTER TABLE customers
        ADD COLUMN company_name VARCHAR(255);
      `, { transaction });
      
      console.log('Added company_name column to customers table');
    }

    // Check if seating_type_enum exists before creating
    const seatingTypeEnumExists = await typeExists(transaction, 'seating_type_enum');
    if (!seatingTypeEnumExists) {
      await sequelize.query(`
        CREATE TYPE seating_type_enum AS ENUM ('HOT_DESK', 'DEDICATED_DESK', 'CUBICLE', 'MEETING_ROOM', 'DAILY_PASS');
      `, { transaction });
    }
    
    // Create seating_types table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS seating_types (
        id SERIAL PRIMARY KEY,
        name seating_type_enum NOT NULL,
        description TEXT,
        hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        is_hourly BOOLEAN NOT NULL DEFAULT TRUE,
        min_booking_duration INTEGER NOT NULL DEFAULT 2,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Add short_code column to seating_types table if it doesn't exist
    const seatingTypeShortCodeExists = await columnExists(transaction, 'seating_types', 'short_code');
    if (!seatingTypeShortCodeExists) {
      await sequelize.query(`
        ALTER TABLE seating_types
        ADD COLUMN short_code VARCHAR(10) UNIQUE;
      `, { transaction });
      
      console.log('Added short_code column to seating_types table');
      
      // Populate short_code values for existing seating types
      await sequelize.query(`
        UPDATE seating_types SET short_code = 'hot' WHERE name = 'HOT_DESK';
        UPDATE seating_types SET short_code = 'ded' WHERE name = 'DEDICATED_DESK';
        UPDATE seating_types SET short_code = 'cub' WHERE name = 'CUBICLE';
        UPDATE seating_types SET short_code = 'meet' WHERE name = 'MEETING_ROOM';
        UPDATE seating_types SET short_code = 'day' WHERE name = 'DAILY_PASS';
      `, { transaction });
      
      console.log('Populated short_code values for existing seating types');
    }

    // Check if availability_status_enum exists before creating
    const availabilityStatusEnumExists = await typeExists(transaction, 'availability_status_enum');
    if (!availabilityStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE availability_status_enum AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE');
      `, { transaction });
    }
    
    // Create seats table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        seating_type_id INTEGER NOT NULL REFERENCES seating_types(id),
        seat_number VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        availability_status availability_status_enum DEFAULT 'AVAILABLE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Check if booking_status_enum exists before creating
    const bookingStatusEnumExists = await typeExists(transaction, 'booking_status_enum');
    if (!bookingStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE booking_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
      `, { transaction });
    }
    
    // Create seat_bookings table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS seat_bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        seat_id INTEGER NOT NULL REFERENCES seats(id),
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status booking_status_enum DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Create meeting_bookings table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS meeting_bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        meeting_room_id INTEGER NOT NULL REFERENCES seats(id),
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        num_participants INTEGER NOT NULL,
        amenities JSONB,
        total_price DECIMAL(10, 2) NOT NULL,
        status booking_status_enum DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Check if payment enums exist before creating
    const paymentMethodEnumExists = await typeExists(transaction, 'payment_method_enum');
    if (!paymentMethodEnumExists) {
      await sequelize.query(`
        CREATE TYPE payment_method_enum AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH', 'DIGITAL_WALLET');
      `, { transaction });
    }
    
    const paymentStatusEnumExists = await typeExists(transaction, 'payment_status_enum');
    if (!paymentStatusEnumExists) {
      await sequelize.query(`
        CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
      `, { transaction });
    }
    
    const bookingTypeEnumExists = await typeExists(transaction, 'booking_type_enum');
    if (!bookingTypeEnumExists) {
      await sequelize.query(`
        CREATE TYPE booking_type_enum AS ENUM ('seat', 'meeting');
      `, { transaction });
    }
    
    // Create payments table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL,
        booking_type booking_type_enum NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method payment_method_enum NOT NULL,
        payment_status payment_status_enum DEFAULT 'PENDING',
        transaction_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // Create time_slots table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        seat_id INTEGER NOT NULL REFERENCES seats(id),
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        booking_id INTEGER REFERENCES seat_bookings(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    await transaction.commit();
    console.log('All tables created successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error in migration:', error);
    throw error;
  }
}

// Migration Down Function
async function down(): Promise<void> {
  const transaction = await sequelize.transaction();
  
  try {
    // Remove short_code columns
    const branchShortCodeExists = await columnExists(transaction, 'branches', 'short_code');
    if (branchShortCodeExists) {
      await sequelize.query(`
        ALTER TABLE branches
        DROP COLUMN short_code;
      `, { transaction });
      
      console.log('Removed short_code column from branches table');
    }
    
    const seatingTypeShortCodeExists = await columnExists(transaction, 'seating_types', 'short_code');
    if (seatingTypeShortCodeExists) {
      await sequelize.query(`
        ALTER TABLE seating_types
        DROP COLUMN short_code;
      `, { transaction });
      
      console.log('Removed short_code column from seating_types table');
    }

    // Drop tables in reverse order (to handle foreign key constraints)
    await sequelize.query('DROP TABLE IF EXISTS time_slots;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS payments;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS meeting_bookings;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS seat_bookings;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS seats;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS seating_types;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS customers;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS branches;', { transaction });
    
    // Drop custom types
    await sequelize.query('DROP TYPE IF EXISTS booking_type_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS payment_status_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS payment_method_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS booking_status_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS availability_status_enum;', { transaction });
    await sequelize.query('DROP TYPE IF EXISTS seating_type_enum;', { transaction });
    
    await transaction.commit();
    console.log('All tables dropped successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error in rollback:', error);
    throw error;
  }
}

// Runner Function
async function runMigrations(): Promise<void> {
  try {
    // Test connection first
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Check command line arguments
    const args = process.argv.slice(2);
    const direction = args[0]?.toLowerCase();
    
    if (direction === 'down') {
      console.log('Rolling back migrations...');
      await down();
      console.log('Migration rollback completed successfully');
    } else {
      console.log('Running migrations...');
      await up();
      console.log('Migrations completed successfully');
    }
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();