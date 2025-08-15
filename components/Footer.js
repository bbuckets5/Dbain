import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="main-footer glass">
            <div className="footer-column">
                <h4>Resources</h4>
                <Link href="/">Home</Link>
                <Link href="/about">About</Link>
                <Link href="/privacy-policy">Privacy Policy</Link>
                <Link href="/purchase-policy">Purchase Policy</Link>
            </div>
            <div className="footer-column">
                <h4>Let's Connect</h4>
                <div className="social-icons">
                    <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i> Facebook</a>
                    <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i> Instagram</a>
                    <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i> Twitter</a>
                </div>
            </div>
            <div className="footer-column">
                <h4>Contact Us</h4>
                <p>info@clicketickets.com</p>
                <p>(242) 555-0123</p>
            </div>
        </footer>
    );
}
