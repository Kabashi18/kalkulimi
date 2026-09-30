import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePdfReport = (reportData, groupName = 'Banesa në Qendër') => {
  const doc = new jsPDF();

  // Ngjyrat kryesore
  const primaryColor = [79, 70, 229]; // Indigo-600
  const textColor = [30, 41, 59];    // Slate-800

  // 1. Titulli dhe Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('RAPORTI I BARAZIMIT TE BANESES', 14, 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(`Grupi: ${groupName}`, 14, 28);
  doc.text(`Periudha: ${reportData.month || 'Muaji Aktual'}`, 14, 34);
  doc.text(`Data e gjenerimit: ${new Date().toLocaleDateString('sq-AL')}`, 14, 40);

  // Vija ndarëse
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 44, 196, 44);

  // 2. Kutia Përmbledhëse
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 48, 182, 22, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTALI I FATURAVE:', 20, 56);
  doc.text('ANETARE:', 85, 56);
  doc.text('PJESA PER PERSON:', 140, 56);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text(`${Number(reportData.totalAmount || 0).toFixed(2)} EUR`, 20, 64);
  doc.text(`${reportData.memberCount || 0} vetë`, 85, 64);
  doc.text(`${Number(reportData.perPersonAverage || 0).toFixed(2)} EUR`, 140, 64);

  // 3. Tabela e Anëtarëve dhe Bilanceve
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Pasqyra Financiare per Cdo Anetar', 14, 78);

  const membersTableData = (reportData.members || []).map((m) => {
    let statusText = 'Barazuar';
    if (m.netBalance > 0.01) statusText = `Merr +${m.netBalance.toFixed(2)} EUR`;
    if (m.netBalance < -0.01) statusText = `Jep ${Math.abs(m.netBalance).toFixed(2)} EUR`;

    return [
      m.name,
      `${m.paid.toFixed(2)} EUR`,
      `${m.owed.toFixed(2)} EUR`,
      statusText
    ];
  });

  autoTable(doc, {
    startY: 82,
    head: [['Anetari', 'Ka Paguar', 'Pjesa e Tij (Split)', 'Statusi i Bilancit']],
    body: membersTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 52, halign: 'center', fontStyle: 'bold' },
    },
  });

  // 4. Seksioni: Kush duhet t'i japë kujt dhe sa?
  const afterMembersY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Udhezimet e Pagesave (Kush i detyrohet kujt):', 14, afterMembersY);

  const settlementRows = (reportData.settlements || []).map((s) => [
    s.from,
    '-->',
    s.to,
    `${Number(s.amount).toFixed(2)} EUR`
  ]);

  if (settlementRows.length === 0) {
    settlementRows.push(['Te gjitha llogarite jane te barazuara.', '', '', '0.00 EUR']);
  }

  autoTable(doc, {
    startY: afterMembersY + 4,
    head: [['Kush Paguan', '', 'Kujt i Paguan', 'Shuma per Transfer']],
    body: settlementRows,
    theme: 'striped',
    headStyles: {
      fillColor: [16, 185, 129], // Emerald
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 55, fontStyle: 'bold' },
      3: { cellWidth: 57, halign: 'right', fontStyle: 'bold' },
    },
  });

  // 5. Lista e Faturave të Muajit
  const afterSettlementY = doc.lastAutoTable.finalY + 10;

  if (afterSettlementY < 230) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Detajet e Faturave te Ketij Muaji', 14, afterSettlementY);

    const expensesRows = (reportData.expenses || []).map((exp) => [
      exp.title,
      exp.category || 'Banesë',
      exp.paid_by_name || 'Shoku',
      `${Number(exp.total_amount).toFixed(2)} EUR`
    ]);

    autoTable(doc, {
      startY: afterSettlementY + 4,
      head: [['Titulli i Shpenzimit', 'Kategoria', 'Pagoi', 'Shuma']],
      body: expensesRows,
      theme: 'plain',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      },
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Gjeneruar automatikisht nga Sistemi i Menaxhimit te Shpenzimeve - Banesa',
      14,
      288
    );
    doc.text(`Faqja ${i} nga ${pageCount}`, 175, 288);
  }

  // Shkarkohet skedari PDF
  doc.save(`Raporti_Barazimit_${reportData.month || 'Muaji'}.pdf`);
};
