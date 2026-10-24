import * as XLSX from 'xlsx';
import { InstagramLeadItem } from '@/app/api/instagram-leads/route';

export function leadsToExportRows(leads: InstagramLeadItem[]) {
  return leads.map((lead) => ({
    'Ник': lead.handle,
    'Ссылка': lead.profileUrl,
    'Тип': lead.category,
    'Имя': lead.fullName,
    'Шапка профиля': lead.bio,
    'Подписчиков': lead.followers,
    'Email': lead.email || '',
    'Телефон': lead.phone || '',
    'Публичные ссылки': lead.publicLinks.join(' · '),
    'Статус данных': lead.dataStatus || 'AVAILABLE',
    'Проверка категории': lead.categoryCheck || 'CHECKED',
    'Откуда взяли': lead.sourceType || 'Подписчики',
    'Совпадения': lead.matchedKeywords.join(', '),
  }));
}

export function exportLeadsToExcel(leads: InstagramLeadItem[], filename = 'instagram_leads.xlsx') {
  const rows = leadsToExportRows(leads);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for comfortable viewing in Excel
  worksheet['!cols'] = [
    { wch: 22 }, // Ник
    { wch: 35 }, // Ссылка
    { wch: 15 }, // Тип
    { wch: 25 }, // Имя
    { wch: 60 }, // Шапка профиля
    { wch: 14 }, // Подписчиков
    { wch: 25 }, // Email
    { wch: 16 }, // Телефон
    { wch: 50 }, // Публичные ссылки
    { wch: 16 }, // Статус данных
    { wch: 20 }, // Проверка категории
    { wch: 16 }, // Откуда взяли
    { wch: 25 }, // Совпадения
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Instagram Leads');
  XLSX.writeFile(workbook, filename);
}

export function exportLeadsToCsv(leads: InstagramLeadItem[], filename = 'instagram_leads.csv') {
  const rows = leadsToExportRows(leads);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
