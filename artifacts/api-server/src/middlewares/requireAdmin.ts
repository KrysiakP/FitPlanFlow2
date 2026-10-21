import { storage } from "../storage";

export function requireAdmin(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Wymagane uwierzytelnienie" });
  }
  
  storage.getUser(req.session.userId).then(user => {
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Tylko administratorzy mają dostęp do tej funkcji" });
    }
    next();
  }).catch(error => {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Błąd sprawdzania uprawnień" });
  });
}
