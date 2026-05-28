import { generateCertificate, type CertificateData } from "./certificate";

export function downloadCertificate(data: CertificateData): void {
  const html = generateCertificate(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `thesislock-certificate-${data.hash.slice(0, 8)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
