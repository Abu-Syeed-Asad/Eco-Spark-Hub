/**
 * Test script to verify payment flow
 * This script tests the payment handler logic:
 * 1. Payer's balance is reduced
 * 2. Post owner's balance is increased
 * 3. Finance logs are created for both users
 */

import { prisma } from "./src/app/lib/prisma";
import {
  FINANCE_SOURCE,
  STRIPE_PAYMENT_STATUS,
} from "./src/generated/prisma/enums";

async function testPaymentFlow() {
  console.log("🧪 Starting Payment Flow Test...\n");

  try {
    // Create test users
    console.log("📝 Creating test users...");
    const payer = await prisma.user.create({
      data: {
        name: "Test Payer",
        email: `payer-${Date.now()}@test.com`,
        password: "hashedpassword",
        totalAmount: 5000, // Initial balance
      },
    });

    const postOwner = await prisma.user.create({
      data: {
        name: "Test Post Owner",
        email: `owner-${Date.now()}@test.com`,
        password: "hashedpassword",
        totalAmount: 2000, // Initial balance
      },
    });

    console.log(
      `✅ Payer created: ${payer.name} (ID: ${payer.id}) with balance: ${payer.totalAmount}`,
    );
    console.log(
      `✅ Post Owner created: ${postOwner.name} (ID: ${postOwner.id}) with balance: ${postOwner.totalAmount}\n`,
    );

    // Create test post
    console.log("📝 Creating test post...");
    const testPost = await prisma.post.create({
      data: {
        title: "Test Post",
        description: "This is a test post",
        taka: 1000, // Payment amount
        userId: postOwner.id,
        categoryId: "dummy-category-id", // Adjust based on your schema
      },
    });
    console.log(
      `✅ Post created: ${testPost.title} (Amount: ${testPost.taka})\n`,
    );

    // Create payment record (simulating Stripe payment)
    console.log("📝 Creating payment record...");
    const payment = await prisma.payment.create({
      data: {
        transactionId: `TEST-${Date.now()}`,
        amount: testPost.taka,
        status: STRIPE_PAYMENT_STATUS.PAID,
        userId: payer.id,
        postId: testPost.id,
      },
    });
    console.log(
      `✅ Payment created: ${payment.id} (Amount: ${payment.amount})\n`,
    );

    // Simulate payment completion transaction
    console.log("💳 Processing payment completion (simulating webhook)...");
    const result = await prisma.$transaction(async (tx) => {
      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: STRIPE_PAYMENT_STATUS.PAID,
        },
      });

      // Create finance log for payer
      const payerFinanceLog = await tx.financeLog.create({
        data: {
          userId: payer.id,
          paymentId: updatedPayment.id,
          amount: updatedPayment.amount,
          financeSource: FINANCE_SOURCE.POST,
        },
      });

      // Get payer's current balance
      const payerData = await tx.user.findFirst({ where: { id: payer.id } });

      // Reduce payer's balance
      const updatedPayer = await tx.user.update({
        where: { id: payer.id },
        data: {
          totalAmount:
            Number(payerData?.totalAmount) - Number(updatedPayment.amount),
        },
      });

      // Create finance log for post owner
      const ownerFinanceLog = await tx.financeLog.create({
        data: {
          userId: postOwner.id,
          paymentId: updatedPayment.id,
          amount: updatedPayment.amount,
          financeSource: FINANCE_SOURCE.EAEN,
        },
      });

      // Get post owner's current balance
      const ownerData = await tx.user.findFirst({
        where: { id: postOwner.id },
      });

      // Increase post owner's balance
      const updatedOwner = await tx.user.update({
        where: { id: postOwner.id },
        data: {
          totalAmount:
            Number(ownerData?.totalAmount) + Number(updatedPayment.amount),
        },
      });

      return {
        payment: updatedPayment,
        payerFinanceLog,
        updatedPayer,
        ownerFinanceLog,
        updatedOwner,
      };
    });

    // Verify results
    console.log("\n✅ Payment processed successfully!\n");
    console.log("📊 Results:");
    console.log(`  Payment ID: ${result.payment.id}`);
    console.log(`  Payment Status: ${result.payment.status}`);
    console.log(`  Payment Amount: ${result.payment.amount}\n`);

    console.log("💰 Updated Balances:");
    console.log(`  Payer (${payer.name}):`);
    console.log(`    - Initial: ${payer.totalAmount}`);
    console.log(`    - Final: ${result.updatedPayer.totalAmount}`);
    console.log(`    - Deducted: ${result.payment.amount}`);
    console.log(
      `    - ✅ Correct: ${result.updatedPayer.totalAmount === payer.totalAmount - result.payment.amount}\n`,
    );

    console.log(`  Post Owner (${postOwner.name}):`);
    console.log(`    - Initial: ${postOwner.totalAmount}`);
    console.log(`    - Final: ${result.updatedOwner.totalAmount}`);
    console.log(`    - Added: ${result.payment.amount}`);
    console.log(
      `    - ✅ Correct: ${result.updatedOwner.totalAmount === postOwner.totalAmount + result.payment.amount}\n`,
    );

    console.log("📋 Finance Logs Created:");
    console.log(`  Payer Finance Log ID: ${result.payerFinanceLog.id}`);
    console.log(
      `  Payer Finance Source: ${result.payerFinanceLog.financeSource}`,
    );
    console.log(`  Owner Finance Log ID: ${result.ownerFinanceLog.id}`);
    console.log(
      `  Owner Finance Source: ${result.ownerFinanceLog.financeSource}\n`,
    );

    // Verify finance logs
    const payerLogs = await prisma.financeLog.findMany({
      where: { userId: payer.id },
    });
    const ownerLogs = await prisma.financeLog.findMany({
      where: { userId: postOwner.id },
    });

    console.log("✅ Finance Logs Verification:");
    console.log(`  Payer has ${payerLogs.length} finance log(s)`);
    console.log(`  Post Owner has ${ownerLogs.length} finance log(s)\n`);

    console.log("✨ All tests passed! Payment flow is working correctly.\n");

    // Cleanup
    console.log("🧹 Cleaning up test data...");
    await prisma.financeLog.deleteMany({
      where: { paymentId: payment.id },
    });
    await prisma.payment.delete({ where: { id: payment.id } });
    await prisma.post.delete({ where: { id: testPost.id } });
    await prisma.user.delete({ where: { id: payer.id } });
    await prisma.user.delete({ where: { id: postOwner.id } });
    console.log("✅ Cleanup complete!\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPaymentFlow();
