import { query } from "../src/lib/db";

async function checkInvoice() {
  try {
    const { rows } = await query(
      `SELECT id, number, status, grand_total, amount_paid, updated_at 
       FROM invoices 
       WHERE number = $1`,
      ['INV-00002']
    );
    console.log('Invoice data:', rows[0]);
    
    // Check if we can update the invoice
    if (rows[0]) {
      const updateResult = await query(
        `UPDATE invoices 
         SET amount_paid = grand_total, 
             status = 'PAID',
             updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [rows[0].id]
      );
      console.log('Update result:', updateResult.rows[0]);
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    process.exit();
  }
}

checkInvoice();
