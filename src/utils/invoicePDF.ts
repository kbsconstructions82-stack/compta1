import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '../../types';

const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(url);
        img.onerror = (err) => reject(err);
    });
};

/**
 * Génère une facture en PDF avec l'en-tête personnalisé
 * @param invoice - L'objet facture à générer
 * @param companyInfo - Informations de l'entreprise
 */
export const generateInvoicePDF = async (
    invoice: Invoice,
    companyInfo: {
        name: string;
        address: string;
        matriculeFiscale: string;
        phone: string;
        email: string;
    }
) => {
    const doc = new jsPDF();

    // Chargement de l'image d'en-tête
    try {
        const imgUrl = '/assets/InvoiceHeader.png';
        await loadImage(imgUrl);

        // Dimensions de l'image (A4 width = 210mm)
        const imgWidth = 210;
        const imgHeight = 45; // Ajusté pour ne pas être trop grand

        doc.addImage(imgUrl, 'PNG', 0, 0, imgWidth, imgHeight);

        // Initialiser Y juste après l'image
        let y = imgHeight + 10;
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // ===== INFORMATIONS FACTURE (Première ligne après header) =====
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 78, 121); // Bleu
        doc.text(`FACTURE N° ${invoice.number}`, margin, y);

        y += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('fr-FR')}`, margin, y);
        if (invoice.due_date) {
            doc.text(`Échéance: ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}`, margin + 60, y);
        }

        y += 15;

        // ===== BOITES CLIENT ET EMETTEUR =====
        const boxWidth = 85;
        const boxHeight = 45;
        const clientBoxY = y;

        // Client (GAUCHE)
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(248, 250, 255);
        doc.rect(margin, clientBoxY, boxWidth, boxHeight, 'FD');

        // Titre CLIENT
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 78, 121);
        doc.text("CLIENT", margin + 5, clientBoxY + 8);

        // Contenu CLIENT
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(invoice.clientName || 'NEW BOX TUNISIA', margin + 5, clientBoxY + 16);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text("Z.I.Sbikha II 3110 Kairouan", margin + 5, clientBoxY + 22);
        doc.text("Tél: 77 275 755", margin + 5, clientBoxY + 28);
        doc.text("MF: 1654672D/A/M/000", margin + 5, clientBoxY + 34);

        // Emetteur (DROITE)
        const companyX = pageWidth - margin - boxWidth;
        doc.setFillColor(255, 255, 255);
        doc.rect(companyX, clientBoxY, boxWidth, boxHeight, 'FD');

        // Titre EMETTEUR
        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 78, 121);
        doc.setFontSize(9);
        doc.text("ÉMETTEUR", companyX + 5, clientBoxY + 8);

        // Contenu EMETTEUR
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(companyInfo.name, companyX + 5, clientBoxY + 16);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(companyInfo.address, companyX + 5, clientBoxY + 22);
        doc.text(`Tél: ${companyInfo.phone}`, companyX + 5, clientBoxY + 28);
        doc.text(`MF: ${companyInfo.matriculeFiscale}`, companyX + 5, clientBoxY + 34);
        doc.text(`Email: ${companyInfo.email}`, companyX + 5, clientBoxY + 40);

        y = clientBoxY + boxHeight + 15;

        // ===== TABLEAU DES ARTICLES AVEC AUTOTABLE =====
        const tableData = invoice.items.map(item => [
            item.description || '',
            item.trajet || '-',
            item.quantity.toString(),
            `${item.unit_price.toFixed(3)}`,
            `${(item.quantity * item.unit_price).toFixed(3)}`
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Description', 'Trajet', 'Qté', 'P.U. (HT)', 'Total (HT)']],
            body: tableData,
            theme: 'striped', // Cleaner look than grid
            styles: {
                font: 'helvetica',
                fontSize: 9,
                textColor: [40, 40, 40],
                // lineWidth: 0.1, // Removed borders for cleaner look
                cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
                valign: 'middle'
            },
            headStyles: {
                fillColor: [31, 78, 121], // Bleu foncé premium
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                minCellHeight: 12
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Very subtle blue-gray
            },
            columnStyles: {
                0: { cellWidth: 'auto', halign: 'left' },      // Description
                1: { cellWidth: 40, halign: 'center' },        // Trajet
                2: { cellWidth: 20, halign: 'center' },        // Qté
                3: { cellWidth: 30, halign: 'right' },         // P.U.
                4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' } // Total bold
            },
            margin: { left: margin, right: margin },
            tableLineColor: [200, 200, 200],
            tableLineWidth: 0,
        });

        // @ts-ignore
        let finalY = doc.lastAutoTable.finalY + 10;

        // Si on manque de place pour les totaux (moins de 60mm restants), on ajoute une page
        if (finalY > pageHeight - 60) {
            doc.addPage();
            finalY = margin + 10;
        }

        // ===== TOTAUX =====
        const totalsX = pageWidth - margin - 80; // Un peu plus large
        const labelX = totalsX;
        const valueX = pageWidth - margin;

        y = finalY;

        const drawTotalLine = (label: string, value: string, isBold: boolean = false, isRed: boolean = false) => {
            doc.setFont("helvetica", isBold ? "bold" : "normal");
            doc.setFontSize(10);
            doc.setTextColor(isRed ? 200 : 0, 0, 0);
            if (isBold && !isRed) doc.setTextColor(0, 0, 0);

            doc.text(label, labelX, y);
            doc.text(value, valueX, y, { align: "right" });
            y += 7;
        };

        drawTotalLine("Total HT:", `${invoice.total_ht.toFixed(3)} TND`);
        drawTotalLine(`TVA (${invoice.tva_rate}%):`, `${invoice.tva_amount.toFixed(3)} TND`);

        if (invoice.timbre_fiscal > 0) {
            drawTotalLine("Timbre Fiscal:", `${invoice.timbre_fiscal.toFixed(3)} TND`);
        }

        y += 2;
        // Total TTC Background
        doc.setFillColor(31, 78, 121);
        doc.rect(totalsX - 5, y - 6, 90, 10, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text("Total TTC:", labelX, y);
        doc.text(`${invoice.total_ttc.toFixed(3)} TND`, valueX, y, { align: "right" });

        y += 12;

        if (invoice.apply_rs && invoice.rs_amount > 0) {
            drawTotalLine(`Retenue à la source (${invoice.rs_rate}%):`, `-${invoice.rs_amount.toFixed(3)} TND`, false, true);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(31, 78, 121);
            doc.text("NET À PAYER:", labelX, y + 2);
            doc.text(`${invoice.net_to_pay.toFixed(3)} TND`, valueX, y + 2, { align: "right" });
        }

        // ===== PIED DE PAGE =====
        const footerY = pageHeight - 15;
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);

        doc.text(
            `${companyInfo.name} - ${companyInfo.address}`,
            pageWidth / 2,
            footerY,
            { align: "center" }
        );
        doc.text(
            `Email: ${companyInfo.email} | Tél: ${companyInfo.phone} | MF: ${companyInfo.matriculeFiscale}`,
            pageWidth / 2,
            footerY + 5,
            { align: "center" }
        );

        doc.save(`Facture_${invoice.number}.pdf`);

    } catch (error) {
        console.error("Erreur lors de la génération du PDF:", error);
        alert("Erreur lors de la génération du PDF. Vérifiez que l'image d'en-tête est accessible.");
    }
};
