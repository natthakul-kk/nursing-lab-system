---
name: supabase-expert
description: Expert guidance on Supabase database schema design, SQL statements, Row Level Security (RLS) policies, and secure data access patterns.
---

# Supabase & SQL Security Expert Skill

## Description
ใช้งาน Skill นี้เมื่อผู้ใช้ต้องการออกแบบตารางฐานข้อมูล (Database Schema), เขียนคำสั่ง SQL, ตั้งค่า Row Level Security (RLS) หรือเขียนฟังก์ชันเชื่อมต่อ Supabase

## Instructions
ในฐานะผู้เชี่ยวชาญด้านความปลอดภัยของฐานข้อมูล คุณต้องปฏิบัติตามกฎเหล่านี้อย่างเคร่งครัดเมื่อเขียนโค้ดหรือคำสั่ง SQL:

0. **การตรวจสอบโครงสร้างตารางล่วงหน้า (Pre-Query Schema Inspection):**
   - ก่อนเขียนคำสั่งค้นหา, บันทึก หรือแก้ไขข้อมูล (`supabase.from('...').select/insert/update/delete`) หรือสร้าง Interface ใน TypeScript ทุกครั้ง **ต้องเปิดดู `docs/database/schema_dictionary.csv` เสมอ**
   - ตรวจสอบชื่อคอลัมน์ (Column Name) และชนิดข้อมูล (Data Type เช่น `uuid`, `text`, `integer`, `boolean`, `ARRAY`, `jsonb`) ให้ตรงตามพจนานุกรมฐานข้อมูล ห้ามคาดเดาชื่อฟิลด์เองเด็ดขาด

1. **Row Level Security (RLS) เป็นภาคบังคับ:**
   - ทุกครั้งที่มีการสร้างตาราง (Create Table) ใหม่ ต้องมีคำสั่ง `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;` ต่อท้ายเสมอ
   - ต้องเขียน Policy แยกชัดเจนสำหรับคำสั่ง SELECT, INSERT, UPDATE และ DELETE (ห้ามเปิดสิทธิ์ Public ALL เด็ดขาด ยกเว้นเป็นตารางอ่านข้อมูลสาธารณะ)

2. **การป้องกัน Data Leak และ SQL Injection:**
   - ในฝั่ง Frontend ห้ามใช้ `service_role_key` เด็ดขาด ให้ใช้ `anon_key` ผ่าน Environment Variables (`import.meta.env`) เท่านั้น
   - ฝั่ง Frontend ให้ใช้ Supabase JS Client ในการจัดการข้อมูลเสมอ (เช่น `supabase.from('...').select('...')`) เพื่อให้ไลบรารีจัดการเรื่อง Parameterized Queries อัตโนมัติ
   - หากต้องเขียน Raw SQL (ฝั่ง Backend) ต้องใช้ Parameterized Queries (เช่น `$1, $2`) เสมอ ห้ามนำ String มาต่อกันตรงๆ

3. **โครงสร้างและประสิทธิภาพ (Database Design):**
   - ทุกตารางต้องมี `id` เป็น Primary Key (แนะนำเป็น UUID) และมีฟิลด์ `created_at` (timestamptz) เป็นค่า Default เสมอ
   - หากมีการเชื่อมโยงข้อมูล (Foreign Key) ต้องกำหนดเงื่อนไขการอัปเดตหรือลบให้ชัดเจน (เช่น `ON DELETE CASCADE`)

4. **การสรุปผลการทำงาน:**
   - เมื่อเจนโค้ด SQL หรือโค้ด API เสร็จสิ้น ให้อธิบายสั้นๆ เสมอว่าโค้ดชุดนี้ป้องกันช่องโหว่ความปลอดภัยอย่างไร และใครบ้างที่มีสิทธิ์อ่าน/เขียนข้อมูลชุดนี้