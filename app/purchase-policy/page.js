// app/purchase-policy/page.js
export default function PurchasePolicyPage() {
  return (
    <main className="container">
      <div className="policy-container glass">
        <h1>Purchase Policy</h1>
        <hr />

        <h2>All Sales Final</h2>
        <p>All ticket sales are final once completed. Please review event details and quantities before checkout.</p>

        <h2>Refunds & Cancellations</h2>
        <p>Tickets are non-refundable except where an event is cancelled or as required by law. If an event is cancelled, we will notify you at the email provided and outline available options.</p>

        <h2>Service Fees</h2>
        <p>Orders include a 5% service fee. Fees are non-refundable unless the entire order is refunded due to event cancellation.</p>

        <h2>Ticket Delivery</h2>
        <p>Tickets are delivered by email to the address you provide at checkout. Keep your email updated and check spam/junk folders if you don’t see the message.</p>

        <h2>Event Changes</h2>
        <p>Event details (date, time, venue, lineup) may change. If there is a material change, we will email you with updated information.</p>

        <h2>Entry Requirements</h2>
        <p>Each ticket is valid for one entry and will be scanned at the door. Bring your QR code and a valid ID that matches the purchase name if requested.</p>

        <h2>Lost or Not Received Tickets</h2>
        <p>If you can’t find your ticket email, use “My Tickets” after logging in or contact support using the purchase email address.</p>

        <h2>Fraud Prevention</h2>
        <p>Orders may be cancelled if suspected of fraud or violation of these terms. Duplicate or altered tickets will be void.</p>

        <h2>Support</h2>
        <p>Questions? Email <strong>info@clicketickets.com</strong> from the address used at purchase and include your order details.</p>
      </div>
    </main>
  );
}
