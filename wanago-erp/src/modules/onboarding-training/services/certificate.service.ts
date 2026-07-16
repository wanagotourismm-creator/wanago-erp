import { where, serverTimestamp } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import { uploadFile } from "@/lib/storage/upload";
import { fetchCompanySettings } from "@/modules/admin/settings/services/company-settings.service";
import type { TrainingCertificate } from "@/modules/onboarding-training/types";

class TrainingCertificateRepository extends BaseRepository<TrainingCertificate> {
  constructor() { super(FIRESTORE_COLLECTIONS.ONBOARDING_TRAINING_CERTIFICATES); }
}
const certRepo = new TrainingCertificateRepository();

function generateCertificateId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WNG-${stamp}-${rand}`;
}

// "{Company} — Certificate of Completion" — employee name, module title,
// completion date, and a verification ID, on a simple bordered
// A4-landscape layout. Returns a Blob ready to upload.
async function generateCertificatePdf(businessName: string, employeeName: string, moduleTitle: string, certificateId: string): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  // Decorative double border
  doc.setDrawColor(22, 74, 50);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.4);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(22, 74, 50);
  doc.text(businessName.toUpperCase(), centerX, 36, { align: "center" });

  doc.setFontSize(28);
  doc.setTextColor(20, 20, 20);
  doc.text("Certificate of Completion", centerX, 52, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("This certifies that", centerX, 72, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(22, 74, 50);
  doc.text(employeeName, centerX, 86, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("has successfully completed the training module", centerX, 100, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(moduleTitle, centerX, 112, { align: "center" });

  const completedDate = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Completed on ${completedDate}`, centerX, 126, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Certificate ID: ${certificateId}`, centerX, pageHeight - 20, { align: "center" });

  return doc.output("blob");
}

async function uploadCertificatePdf(certificateId: string, blob: Blob): Promise<string> {
  return uploadFile(`training-certificates/${certificateId}.pdf`, blob);
}

// Generates the PDF, uploads it, and writes the Firestore record — called
// once, right when an employee finishes every step of a module (see
// useTrainingWalkthrough's completion handler). Never throws: a failure
// here shouldn't undo the fact that the employee actually completed the
// module, so callers should treat this as best-effort.
export async function issueCertificate(params: {
  employeeUserId: string; employeeName: string; employeeEmail: string;
  moduleId: string; moduleTitle: string;
}): Promise<TrainingCertificate> {
  const certificateId = generateCertificateId();
  const company = await fetchCompanySettings();
  const pdfBlob = await generateCertificatePdf(company.businessName, params.employeeName, params.moduleTitle, certificateId);
  const pdfUrl = await uploadCertificatePdf(certificateId, pdfBlob);

  return certRepo.create({
    employeeUserId: params.employeeUserId,
    employeeName:   params.employeeName,
    employeeEmail:  params.employeeEmail,
    moduleId:       params.moduleId,
    moduleTitle:    params.moduleTitle,
    certificateId,
    pdfUrl,
    // serverTimestamp() returns a FieldValue sentinel at write time, not a
    // real Timestamp — same pattern as createdAt/updatedAt below, just not
    // auto-handled by BaseRepository since this field is certificate-specific.
    completedAt: serverTimestamp() as unknown as TrainingCertificate["completedAt"],
    status:    "active",
    createdBy: params.employeeUserId,
  });
}

export async function fetchMyCertificates(userId: string): Promise<TrainingCertificate[]> {
  const certs = await certRepo.findMany({ constraints: [where("employeeUserId", "==", userId)] });
  return certs.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
}

export async function fetchAllCertificates(): Promise<TrainingCertificate[]> {
  return certRepo.findMany();
}
