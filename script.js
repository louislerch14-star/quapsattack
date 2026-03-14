document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Verhindert das Neuladen der Seite

    const userField = document.getElementById('username').value;
    const passField = document.getElementById('password').value;
    const message = document.getElementById('message');

    // --- DEINE 9 SPIELER-LISTE ---
    // Ändere die Namen und Passwörter hier einfach ab:
    const users = [
        { name: "admin", pass: "louis06.12.2011" }, // Spieler 1 (Du)
        { name: "Lukas", pass: "quaps2" },        // Spieler 2
        { name: "Jonas", pass: "quaps3" },       // Spieler 3
        { name: "Giorgio", pass: "quaps4" },       // Spieler 4
        { name: "Mika", pass: "quaps5" },       // Spieler 5
        { name: "Nils", pass: "quaps6" },       // Spieler 6
        { name: "Spieler7", pass: "quaps7" },       // Spieler 7
        { name: "Spieler8", pass: "quaps8" },       // Spieler 8
        { name: "Spieler9", pass: "quaps9" }        // Spieler 9
    ];

    // Suchen, ob die Kombination aus Name und Passwort stimmt
    // toLowerCase() sorgt dafür, dass Groß-/Kleinschreibung beim Namen egal ist
    const validUser = users.find(u => u.name.toLowerCase() === userField.toLowerCase() && u.pass === passField);

    if (validUser) {
        // Den Namen im Browser speichern, damit das Dashboard ihn anzeigen kann
        localStorage.setItem('loggedInUser', validUser.name);
        
        message.innerHTML = `<span style="color: #4bb543; font-weight: bold;">Erfolgreich! Willkommen, ${validUser.name}.</span>`;
        
        // Weiterleitung zum Dashboard nach kurzem Moment
        setTimeout(() => {
            window.location.href = "index.html"; 
        }, 800);
    } else {
        // Fehlermeldung bei falschen Daten
        message.innerHTML = "<span style='color: #ff4d4d; font-weight: bold;'>Benutzername oder Passwort falsch!</span>";
        
        // Optional: Eingabefelder leeren bei Fehler
        document.getElementById('password').value = "";
    }
});

function togglePlay() {
    const audio = document.getElementById('communitySong');
    const visualizer = document.getElementById('visualizer');
    const btn = document.getElementById('playBtn');
    const card = document.querySelector('.music-card-premium');

    if (!audio) return;

    if (audio.paused) {
        audio.play().then(() => {
            visualizer.classList.add('playing');
            card.classList.add('playing');
            btn.innerText = "⏸ Pause";
        }).catch(err => {
            alert("Datei 'quaps-hymne.mp3' nicht gefunden! Prüfe den Dateinamen.");
        });
    } else {
        audio.pause();
        visualizer.classList.remove('playing');
        card.classList.remove('playing');
        btn.innerText = "▶ Song abspielen";
    }
}

function changeVolume(val) {
    const audio = document.getElementById('communitySong');
    if(audio) audio.volume = val;
}