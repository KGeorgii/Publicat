import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
 
export async function GET() {
  const client = await db.connect();
  let journal;
  
  try {
    journal = await client.sql`SELECT * FROM vsesvit;`;
  } catch (error) {
    return NextResponse.json({ error });
  }
 
  return NextResponse.json({ data: journal });
}