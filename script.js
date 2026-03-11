document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Verhindert das Neuladen der Seite

    const userField = document.getElementById('username').value;
    const passField = document.getElementById('password').value;
    const message = document.getElementById('message');

    // --- DEINE 9 SPIELER-LISTE ---
    // Ändere die Namen und Passwörter hier einfach ab:
    const users = [
        { name: "admin", pass: "louis06.12.2011" }, // Spieler 1 (Du)
        { name: "Lukas", pass: "quaps123" },        // Spieler 2
        { name: "Jonas", pass: "pass3" },       // Spieler 3
        { name: "Giorgio", pass: "pass4" },       // Spieler 4
        { name: "Mika", pass: "quaps5" },       // Spieler 5
        { name: "Nils", pass: "quaps6" },       // Spieler 6
        { name: "Spieler7", pass: "pass7" },       // Spieler 7
        { name: "Spieler8", pass: "pass8" },       // Spieler 8
        { name: "Spieler9", pass: "pass9" }        // Spieler 9
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