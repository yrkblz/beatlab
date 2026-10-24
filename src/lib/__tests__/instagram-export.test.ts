import { leadsToExportRows, exportLeadsToExcel, exportLeadsToCsv } from '../instagram-export';
import { InstagramLeadItem } from '@/app/api/instagram-leads/route';
import * as XLSX from 'xlsx';

jest.mock('xlsx', () => {
  const actual = jest.requireActual('xlsx');
  return {
    ...actual,
    writeFile: jest.fn(),
  };
});

describe('instagram-export', () => {
  const sampleLeads: InstagramLeadItem[] = [
    {
      handle: 'gunna',
      profileUrl: 'https://instagram.com/gunna',
      category: 'Артист',
      fullName: 'Gunna',
      bio: 'One of Wun out now • YSL Records',
      followers: 4500000,
      email: 'contact@gunnamusic.com',
      phone: '+14045551234',
      publicLinks: ['https://gunnamusic.com', 'https://open.spotify.com/artist/gunna'],
      dataStatus: 'AVAILABLE',
      categoryCheck: 'CHECKED',
      sourceType: 'Подписчики',
      matchedKeywords: ['artist', 'spotify'],
    },
    {
      handle: 'turbothegreat',
      profileUrl: 'https://instagram.com/turbothegreat',
      category: 'Продюсер',
      fullName: 'Turbo',
      bio: 'Playmakers • prod by Turbo',
      followers: 320000,
      publicLinks: [],
      dataStatus: 'AVAILABLE',
      categoryCheck: 'CHECKED',
      sourceType: 'Подписки',
      matchedKeywords: ['prod by', 'producer'],
    },
  ];

  it('converts leads into rows matching the exact columns of the reference excel file', () => {
    const rows = leadsToExportRows(sampleLeads);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      'Ник': 'gunna',
      'Ссылка': 'https://instagram.com/gunna',
      'Тип': 'Артист',
      'Имя': 'Gunna',
      'Шапка профиля': 'One of Wun out now • YSL Records',
      'Подписчиков': 4500000,
      'Email': 'contact@gunnamusic.com',
      'Телефон': '+14045551234',
      'Публичные ссылки': 'https://gunnamusic.com · https://open.spotify.com/artist/gunna',
      'Статус данных': 'AVAILABLE',
      'Проверка категории': 'CHECKED',
      'Откуда взяли': 'Подписчики',
      'Совпадения': 'artist, spotify',
    });

    expect(rows[1]['Email']).toBe('');
    expect(rows[1]['Телефон']).toBe('');
    expect(rows[1]['Публичные ссылки']).toBe('');
    expect(rows[1]['Откуда взяли']).toBe('Подписки');
  });

  it('generates an excel workbook and calls XLSX.writeFile', () => {
    exportLeadsToExcel(sampleLeads, 'test_leads.xlsx');

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      'test_leads.xlsx'
    );
  });

  it('generates CSV without throwing', () => {
    const originalCreateObjectURL = window.URL.createObjectURL;
    window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');

    expect(() => {
      exportLeadsToCsv(sampleLeads, 'test_leads.csv');
    }).not.toThrow();

    window.URL.createObjectURL = originalCreateObjectURL;
  });
});
