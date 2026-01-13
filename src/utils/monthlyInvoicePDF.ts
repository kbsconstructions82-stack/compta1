import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyInvoiceData {
    selectedMonth: string;
    items: Array<{
        invoiceDate: string;
        trajet?: string;
        description?: string;
        pref_p?: string;
        piece_no?: string;
        devise?: string;
        ht: number;
        ttc: number;
    }>;
    totals: {
        ht: number;
        tva: number;
        timbre: number;
        ttc: number;
        rs: number;
        net: number;
    };
    applyRS: boolean;
}

const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(url);
        img.onerror = (err) => reject(err);
    });
};

/**
 * Genere une facture mensuelle en PDF - Version propre et professionnelle
 */
export const generateMonthlyInvoicePDF = async (data: MonthlyInvoiceData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    try {
        // === EN-TETE IMAGE ===
        const imgUrl = '/assets/InvoiceHeader.png';
        await loadImage(imgUrl);
        doc.addImage(imgUrl, 'PNG', 0, 0, 210, 40);

        let y = 50;

        // === TITRE ===
        const monthYear = new Date(data.selectedMonth + "-01").toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 78, 121);
        doc.text("FACTURE MENSUELLE", margin, y);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text("Periode: " + monthYear, margin, y + 6);
        doc.text("Date: " + new Date().toLocaleDateString('fr-FR'), margin + 60, y + 6);

        y += 18;

        // === INFOS CLIENT / EMETTEUR (simple, sans boites) ===
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 78, 121);
        doc.text("CLIENT:", margin, y);
        doc.text("EMETTEUR:", pageWidth - margin - 60, y);

        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);

        // Client
        doc.text("NEW BOX TUNISIA", margin, y);
        doc.text("Z.I.Sbikha II 3110 Kairouan", margin, y + 4);
        doc.text("MF: 1654672D/A/M/000", margin, y + 8);

        // Emetteur
        doc.text("Ent. Moulahi Mohamed Yahia", pageWidth - margin - 60, y);
        doc.text("Rue Habib Thamer - Sbeitla", pageWidth - margin - 60, y + 4);
        doc.text("Tel: +216 99.861.021", pageWidth - margin - 60, y + 8);
        doc.text("Email: societemoulahi@gmail.com", pageWidth - margin - 60, y + 12);
        doc.text("MF: 1629234/W/A/M/000", pageWidth - margin - 60, y + 16);

        y += 26;

        // === TABLEAU PRINCIPAL ===
        // Preparer les donnees proprement - sans caracteres speciaux
        const tableData = data.items.map(item => {
            const dateStr = item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString('fr-FR') : '-';
            const trajetStr = item.trajet || '';
            const prefP = 'ABLL';
            const devise = item.devise || 'TND';
            const htStr = item.ht.toFixed(3);
            const ttcStr = item.ttc.toFixed(3);

            return [dateStr, trajetStr, item.piece_no || '-', prefP, devise, htStr, ttcStr];
        });

        autoTable(doc, {
            startY: y,
            head: [['Date', 'Trajet', 'Piece', 'Préf.P', 'Devise', 'HT', 'TTC']],
            body: tableData,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 8,
                textColor: [30, 30, 30],
                cellPadding: 3,
                valign: 'middle',
                halign: 'left',
                lineColor: [180, 180, 180],
                lineWidth: 0.2
            },
            headStyles: {
                fillColor: [31, 78, 121],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 24, halign: 'center' },     // Date
                1: { cellWidth: 'auto' },                    // Trajet
                2: { cellWidth: 20, halign: 'center' },     // Piece
                3: { cellWidth: 18, halign: 'center' },     // Préf.P
                4: { cellWidth: 18, halign: 'center' },     // Devise
                5: { cellWidth: 26, halign: 'right' },      // HT
                6: { cellWidth: 26, halign: 'right' }       // TTC
            },
            margin: { left: margin, right: margin },
            tableWidth: 'auto'
        });

        // @ts-ignore
        let finalY = doc.lastAutoTable.finalY + 15;

        // Verifier si on a assez de place pour les totaux
        if (finalY > pageHeight - 70) {
            doc.addPage();
            finalY = 30;
        }

        y = finalY;

        // === TOTAUX ===
        const totalsBoxX = pageWidth - margin - 75;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);

        // Total HT
        doc.text("Total HT:", totalsBoxX, y);
        doc.text(data.totals.ht.toFixed(3) + " TND", pageWidth - margin, y, { align: "right" });
        y += 6;

        // TVA
        doc.text("TVA (7%):", totalsBoxX, y);
        doc.text(data.totals.tva.toFixed(3) + " TND", pageWidth - margin, y, { align: "right" });
        y += 6;

        // Timbre
        if (data.totals.timbre > 0) {
            doc.text("Timbre Fiscal:", totalsBoxX, y);
            doc.text(data.totals.timbre.toFixed(3) + " TND", pageWidth - margin, y, { align: "right" });
            y += 6;
        }

        // Ligne de separation
        y += 2;
        doc.setDrawColor(31, 78, 121);
        doc.setLineWidth(0.5);
        doc.line(totalsBoxX, y, pageWidth - margin, y);
        y += 6;

        // Total TTC
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(31, 78, 121);
        doc.text("Total TTC:", totalsBoxX, y);
        doc.text(data.totals.ttc.toFixed(3) + " TND", pageWidth - margin, y, { align: "right" });
        y += 8;

        // Retenue a la source si applicable
        if (data.applyRS && data.totals.rs > 0) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(180, 0, 0);
            doc.text("RS (1%):", totalsBoxX, y);
            doc.text("-" + data.totals.rs.toFixed(3) + " TND", pageWidth - margin, y, { align: "right" });
            y += 8;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(31, 78, 121);
            doc.text("NET A PAYER:", totalsBoxX, y);
            doc.text(data.totals.net.toFixed(3) + " TND", pageWidth - margin, y, { align: "right" });
        }

        // === PIED DE PAGE ===
        const footerY = pageHeight - 12;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text(
            "Entreprise Moulahi Mohamed Yahia - Tel: +216 99.861.021 - Email: societemoulahi@gmail.com",
            pageWidth / 2,
            footerY,
            { align: "center" }
        );

        // Sauvegarder
        const fileName = "Facture_Mensuelle_" + monthYear.replace(/ /g, '_') + ".pdf";
        doc.save(fileName);

    } catch (error) {
        console.error("Erreur PDF:", error);
        alert("Erreur lors de la generation du PDF.");
    }
};
