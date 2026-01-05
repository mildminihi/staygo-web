export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-logo">
            <img src="/games/reveal-board/staygo-logo.png" alt="Staygo" />
          </div>
          
          <nav className="footer-links">
            <a href="https://facebook.com/STAYGO" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="https://instagram.com/staygo.official" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://tiktok.com/@staygo.official" target="_blank" rel="noopener noreferrer">TikTok</a>
            <a href="https://twitch.tv/staygogamming" target="_blank" rel="noopener noreferrer">Twitch</a>
          </nav>
          
          <p className="footer-copy">© STAYGO 2025</p>
        </div>
      </div>
    </footer>
  );
}

