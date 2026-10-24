import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { insertWeeklyReportSchema } from "@workspace/db";
import { ObjectStorageService } from "../objectStorage";
import { chatPushPreview } from "../lib/chatPush";
import { sendPushToUserAndRecord } from "../services/push";
import { getDemoWeeklyReports, isDemoId } from "../demoDataService";

/** Weekly reports: the client writes them, the trainer reads, marks them as seen and comments. */
export function registerReportRoutes(app: Express) {
  // Updates photo paths in weekly report and sets ACL policy
  app.put("/api/weekly-reports/:id/photos", isAuthenticated, async (req, res) => {
    if (!req.body.photoUrl) {
      return res.status(400).json({ message: "photoUrl jest wymagane" });
    }

    // Gets the authenticated user id from session (custom email/password auth)
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Wymagane uwierzytelnienie" });
    }

    try {
      // SECURITY FIX: Fetch report and verify authorization BEFORE setting ACL policy
      // This prevents IDOR where attacker could set themselves as photo owner
      const reportId = String(req.params.id);
      const report = await storage.getWeeklyReport(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Raport nie znaleziony" });
      }

      // AUTHORIZATION CHECK: Verify user has permission to modify this report
      // Allowed users: report owner (client) OR assigned trainer
      const user = await storage.getUser(userId);
      
      // Check 1: Is the user the owner of this report (client)?
      const isOwner = report.clientId === userId;
      
      // Check 2: Is the user a trainer with an ACTIVE relationship to this client?
      // CRITICAL: Verify ACTIVE trainer-client relationship to prevent stale assignment IDOR
      // This ensures archived trainers cannot modify their former clients' reports
      let isAssignedTrainer = false;
      if (user?.role === 'trainer') {
        const relationship = await storage.getClientRelationship(userId, report.clientId);
        isAssignedTrainer = relationship?.status === 'active';
      }
      
      // Deny access if user is neither owner nor assigned trainer
      if (!isOwner && !isAssignedTrainer) {
        return res.status(403).json({ message: "Nie masz uprawnień do modyfikacji tego raportu" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // CRITICAL: Normalize and validate URL
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.photoUrl);
      
      // Reject if normalization failed (null returned)
      if (!normalizedPath) {
        console.warn(`Invalid object URL rejected: ${req.body.photoUrl}`);
        return res.status(400).json({ message: "Nieprawidłowy URL zdjęcia" });
      }
      
      // CRITICAL: Get existing object file to verify owner
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
        const existingAcl = await objectStorageService.getObjectAclPolicy(objectFile);
        
        // CRITICAL: Verify object owner matches report client
        if (existingAcl && existingAcl.owner !== report.clientId) {
          console.error(`Object owner mismatch: ${existingAcl.owner} !== ${report.clientId}`);
          return res.status(403).json({ message: "Nie możesz użyć zdjęcia innego użytkownika" });
        }
      } catch (error) {
        // Object doesn't exist yet - this is OK for new uploads
        console.info(`New object upload: ${normalizedPath}`);
      }
      
      // Set ACL policy
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoUrl,
        {
          owner: report.clientId, // CRITICAL: Always use report.clientId
          visibility: "private", // body photos: the client and their trainer only (see canOpenObject)
        }
      );
      
      // Reject if ACL policy setting failed
      if (!objectPath) {
        console.error(`Failed to set ACL policy for: ${req.body.photoUrl}`);
        return res.status(400).json({ message: "Nie udało się ustawić uprawnień do zdjęcia" });
      }

      // Update the report with the new photo path
      await storage.updateWeeklyReport(reportId, report.clientId, { photoUrl: objectPath });

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting weekly report photo:", error);
      res.status(500).json({ message: "Błąd podczas zapisywania zdjęcia" });
    }
  });

  // The trainer's comment on a weekly report (and its photo); the client is told and sees it under the report
  app.put("/api/trainer/reports/:reportId/comment", isAuthenticated, async (req, res) => {
    try {
      const trainer = await storage.getUser(req.session.userId!);
      if (trainer?.role !== "trainer") return res.status(403).json({ message: "Dostęp tylko dla trenerów" });
      const report = await storage.getWeeklyReport(String(req.params.reportId));
      // not found and not yours look the same
      if (!report || !(await storage.hasActiveClientRelationship(trainer.id, report.clientId))) {
        return res.status(404).json({ message: "Nie znaleziono raportu" });
      }
      const raw = req.body?.comment;
      if (raw !== null && typeof raw !== "string") return res.status(400).json({ message: "Komentarz musi być tekstem" });
      const comment = typeof raw === "string" ? raw.trim() : "";
      if (comment.length > 1000) return res.status(400).json({ message: "Komentarz może mieć najwyżej 1000 znaków" });
      const changed = comment !== "" && comment !== (report.trainerComment ?? "");
      const updated = await storage.setReportTrainerComment(report.id, comment === "" ? null : comment);
      res.json({ trainerComment: updated?.trainerComment ?? null, trainerCommentedAt: updated?.trainerCommentedAt ?? null });
      if (changed) {
        const name = [trainer.firstName, trainer.lastName].filter(Boolean).join(" ") || "Twój trener";
        void sendPushToUserAndRecord(
          report.clientId,
          `${name} skomentował(a) Twój raport`,
          chatPushPreview(comment),
          { type: "report_comment", reportId: report.id },
          "report_comment"
        ).catch((err) => console.error("Failed to push report comment:", err));
      }
    } catch (error) {
      console.error("Error saving report comment:", error);
      res.status(500).json({ message: "Nie udało się zapisać komentarza" });
    }
  });

  // Weekly reports endpoints
  app.post("/api/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą tworzyć raporty" });
      }

      // Check if client has an active trainer
      const hasTrainer = await storage.hasActiveTrainer(userId);
      if (!hasTrainer) {
        return res.status(403).json({ 
          message: "Aby tworzyć raporty, musisz mieć przypisanego trenera. Poproś swojego trenera o zaproszenie." 
        });
      }

      const validationResult = insertWeeklyReportSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.issues 
        });
      }

      const report = await storage.createWeeklyReport(userId, validationResult.data);
      res.json(report);
    } catch (error) {
      console.error("Error creating weekly report:", error);
      res.status(500).json({ message: "Nie udało się utworzyć raportu" });
    }
  });

  app.get("/api/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą pobierać swoje raporty" });
      }

      const reports = await storage.getClientWeeklyReports(userId);
      
      // CRITICAL FIX: Generate presigned URLs for photos but preserve original paths
      // This prevents photo loss when editing reports without changing the photo
      const objectStorageService = new ObjectStorageService();
      const reportsWithUrls = await Promise.all(
        reports.map(async (report) => {
          if (report.photoUrl) {
            const presignedUrl = await objectStorageService.getObjectReadUrl(report.photoUrl);
            return { 
              ...report, 
              photoUrl: presignedUrl || report.photoUrl,  // Presigned URL for display
              photoOriginalPath: report.photoUrl  // Original object path for saving
            };
          }
          return report;
        })
      );
      
      res.json(reportsWithUrls);
    } catch (error) {
      console.error("Error fetching weekly reports:", error);
      res.status(500).json({ message: "Nie udało się pobrać raportów" });
    }
  });

  // GET /api/reports/:id - Fetch single report with ownership check
  app.get("/api/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą pobierać raporty" });
      }
      
      const reportId = String(req.params.id);
      const report = await storage.getWeeklyReportById(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Raport nie znaleziony" });
      }
      
      // CRITICAL: Verify ownership before returning data
      if (report.clientId !== userId) {
        return res.status(403).json({ message: "Brak dostępu do tego raportu" });
      }
      
      // Generate presigned URL AND preserve original path
      if (report.photoUrl) {
        const objectStorageService = new ObjectStorageService();
        const presignedUrl = await objectStorageService.getObjectReadUrl(report.photoUrl);
        return res.json({
          ...report,
          photoUrl: presignedUrl || report.photoUrl,
          photoOriginalPath: report.photoUrl
        });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching weekly report:", error);
      res.status(500).json({ message: "Nie udało się pobrać raportu" });
    }
  });

  // PATCH /api/reports/:id - Update report with ownership check
  app.patch("/api/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą edytować raporty" });
      }

      const validationResult = insertWeeklyReportSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.issues 
        });
      }

      const report = await storage.updateWeeklyReport(String(req.params.id), userId, validationResult.data);
      res.json(report);
    } catch (error) {
      console.error("Error updating weekly report:", error);
      if (error instanceof Error && (error.message.includes("not found") || error.message.includes("not owned"))) {
        return res.status(404).json({ message: "Raport nie znaleziony" });
      }
      res.status(500).json({ message: "Nie udało się zaktualizować raportu" });
    }
  });

  app.get("/api/clients/:clientId/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą pobierać raporty podopiecznych" });
      }

      const { clientId } = req.params as Record<string, string>;
      
      // Return demo weekly reports for demo client
      if (isDemoId(clientId)) {
        const demoReports = getDemoWeeklyReports();
        return res.json(demoReports);
      }
      
      const reports = await storage.getClientWeeklyReportsForTrainer(clientId, userId);
      
      // CRITICAL FIX: Generate presigned URLs for photos but preserve original paths
      // This prevents photo loss when editing reports without changing the photo
      const objectStorageService = new ObjectStorageService();
      const reportsWithUrls = await Promise.all(
        reports.map(async (report) => {
          if (report.photoUrl) {
            const presignedUrl = await objectStorageService.getObjectReadUrl(report.photoUrl);
            return { 
              ...report, 
              photoUrl: presignedUrl || report.photoUrl,  // Presigned URL for display
              photoOriginalPath: report.photoUrl  // Original object path for saving
            };
          }
          return report;
        })
      );
      
      res.json(reportsWithUrls);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Brak aktywnej relacji")) {
        return res.status(403).json({ message: "To nie jest Twój podopieczny" });
      }
      console.error("Error fetching client weekly reports:", error);
      res.status(500).json({ message: "Nie udało się pobrać raportów podopiecznego" });
    }
  });

  app.get("/api/trainer/unread-reports-count", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą sprawdzać liczbę nieprzeczytanych raportów" });
      }

      const count = await storage.getUnreadReportsCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread reports count:", error);
      res.status(500).json({ message: "Nie udało się pobrać liczby nieprzeczytanych raportów" });
    }
  });

  app.post("/api/reports/:reportId/mark-as-viewed", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą oznaczać raporty jako przeczytane" });
      }

      const { reportId } = req.params as Record<string, string>;
      
      // Demo reports: just return success without modifying anything
      if (isDemoId(reportId)) {
        return res.json({ message: "Raport oznaczony jako przeczytany" });
      }
      
      // Verify the report belongs to one of trainer's clients
      const report = await storage.getWeeklyReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Raport nie został znaleziony" });
      }

      // Check if the client belongs to this trainer
      const relationship = await storage.getClientRelationship(userId, report.clientId);
      if (!relationship || relationship.status !== 'active') {
        return res.status(403).json({ message: "Ten raport nie należy do Twoich podopiecznych" });
      }

      await storage.markReportAsViewed(reportId);
      res.json({ message: "Raport oznaczony jako przeczytany" });
    } catch (error) {
      console.error("Error marking report as viewed:", error);
      res.status(500).json({ message: "Nie udało się oznaczyć raportu jako przeczytanego" });
    }
  });
}
