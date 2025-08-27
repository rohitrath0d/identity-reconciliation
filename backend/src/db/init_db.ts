// import { neon } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-http';
// import * as schema from './schema';
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv"

dotenv.config()

// const sql = neon(process.env.DATABASE_URL!);
// export const db = drizzle(sql, { schema });

// PrismaClient doesn't need the sql object passed to it. You initialize the Prisma client normally without passing a connection object. Prisma handles the database connection internally based on your DATABASE_URL environment variable.
const prisma = new PrismaClient()


// Optionally, you can add logic for connection management or handling migrations
// Example: Checking if the DB is connected
export async function DBConnection(){
  try {
    await prisma.$connect();
    console.log("DB connected Successfully!");
  } catch (error) {
    console.error("DB connection error", error);
  }
}

export {prisma};